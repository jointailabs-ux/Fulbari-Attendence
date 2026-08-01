import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    // 1. One-time cleanup: Delete any accidental August 2nd, 2026 attendance records created before 12:00 PM (noon)
    try {
      const aug2 = new Date(Date.UTC(2026, 7, 2, 0, 0, 0, 0));
      const recordsToDelete = await prisma.attendanceRecord.findMany({
        where: {
          shiftDate: aug2,
          startTime: { lt: new Date(Date.UTC(2026, 7, 2, 6, 30, 0, 0)) } // before 12:00 PM IST
        }
      });
      if (recordsToDelete.length > 0) {
        const ids = recordsToDelete.map(r => r.id);
        await prisma.breakLog.deleteMany({
          where: { attendanceId: { in: ids } }
        });
        await prisma.attendanceRecord.deleteMany({
          where: { id: { in: ids } }
        });
        console.log(`Successfully cleaned up ${ids.length} accidental August 2nd records.`);
      }
    } catch (e) {
      console.error("Cleanup August 2nd error:", e);
    }

    // 2. Auto-close any open shifts from previous days
    try {
      const nowTmp = new Date();
      const istTimeTmp = new Date(nowTmp.getTime() + 5.5 * 60 * 60 * 1000);
      const todayTmp = new Date(Date.UTC(istTimeTmp.getUTCFullYear(), istTimeTmp.getUTCMonth(), istTimeTmp.getUTCDate(), 0, 0, 0, 0));

      const openRecords = await prisma.attendanceRecord.findMany({
        where: {
          shiftDate: { lt: todayTmp },
          state: { in: ["SHIFT_STARTED", "ON_BREAK"] }
        }
      });

      for (const record of openRecords) {
        const autoEndTime = new Date(record.shiftDate.getTime() + 18.5 * 60 * 60 * 1000);
        
        await prisma.breakLog.updateMany({
          where: { attendanceId: record.id, endTime: null },
          data: { endTime: autoEndTime }
        });

        await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            state: "SHIFT_ENDED",
            endTime: autoEndTime
          }
        });
      }
    } catch (err) {
      console.error("Auto-close pending shifts error:", err);
    }

    let queryDate: Date;
    if (dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number);
      queryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      const now = new Date();
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      queryDate = new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));
    }

    // Fetch all active staff
    const activeStaff = await prisma.staffProfile.findMany({
      where: { isActive: true },
      include: {
        slot: {
          include: {
            outlet: true
          }
        }
      }
    });

    // Fetch attendance records for that day
    const records = await prisma.attendanceRecord.findMany({
      where: { shiftDate: queryDate },
      include: {
        breaks: true,
        staff: {
          include: {
            slot: {
              include: {
                outlet: true
              }
            }
          }
        }
      }
    });

    // Combine active staff and any inactive staff who have records on this date
    const staffMap = new Map<string, any>();
    activeStaff.forEach(s => {
      staffMap.set(s.id, s);
    });

    records.forEach(r => {
      if (r.staff && !staffMap.has(r.staffId)) {
        staffMap.set(r.staffId, r.staff);
      }
    });

    const combinedStaff = Array.from(staffMap.values());

    // Map to Roster Items
    const roster = combinedStaff.map(staff => {
      const record = records.find(r => r.staffId === staff.id);
      
      let totalBreakMs = 0;
      let netWorkMs = 0;

      if (record) {
        // Calculate break duration
        record.breaks.forEach(b => {
          const start = new Date(b.startTime).getTime();
          const end = b.endTime ? new Date(b.endTime).getTime() : Date.now();
          totalBreakMs += (end - start);
        });

        // Calculate work duration
        if (record.startTime) {
          const start = new Date(record.startTime).getTime();
          const end = record.endTime ? new Date(record.endTime).getTime() : Date.now();
          
          let totalDuration = end - start;
          // Subtract breaks
          netWorkMs = totalDuration - totalBreakMs;
          if (netWorkMs < 0) netWorkMs = 0;
        }
      }

      const breakTimeStr = totalBreakMs > 0 
        ? `${Math.round(totalBreakMs / 60000)} mins` 
        : "--";

      const workTimeStr = record?.startTime 
        ? `${(netWorkMs / 3600000).toFixed(2)} hrs` 
        : "--";

      return {
        id: staff.id,
        name: staff.name,
        slotName: staff.slot?.name || "Standard Slot",
        location: staff.slot?.outlet?.name || "Unknown",
        state: record?.state || "NOT_STARTED",
        startTime: record?.startTime ? new Date(record.startTime).toISOString() : null,
        endTime: record?.endTime ? new Date(record.endTime).toISOString() : null,
        breakTimeStr,
        workTimeStr
      };
    });

    return NextResponse.json({ roster });
  } catch (error: any) {
    console.error("Error fetching admin attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance data", details: error.message }, { status: 500 });
  }
}
