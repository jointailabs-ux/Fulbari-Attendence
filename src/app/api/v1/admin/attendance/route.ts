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

      // Format break time as "Xh Ym" instead of raw minutes
      const formatBreakTime = (ms: number) => {
        if (ms <= 0) return "--";
        const totalMins = Math.round(ms / 60000);
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if (hrs === 0) return `${mins}m`;
        if (mins === 0) return `${hrs}h`;
        return `${hrs}h ${mins}m`;
      };

      return {
        id: staff.id,
        name: staff.name,
        slotName: staff.slot?.name || "Standard Slot",
        location: staff.slot?.outlet?.name || "Unknown",
        state: record?.state || "NOT_STARTED",
        startTime: record?.startTime ? new Date(record.startTime).toISOString() : null,
        endTime: record?.endTime ? new Date(record.endTime).toISOString() : null,
        breakTimeStr: formatBreakTime(totalBreakMs),
        workTimeStr,
        breaks: record?.breaks.map(b => ({
          id: b.id,
          startTime: new Date(b.startTime).toISOString(),
          endTime: b.endTime ? new Date(b.endTime).toISOString() : null,
        })) || [],
      };
    });

    return NextResponse.json({ roster });
  } catch (error: any) {
    console.error("Error fetching admin attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance data", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, date, startTime, endTime } = body;

    if (!staffId || !date || !startTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [year, month, day] = date.split("-").map(Number);
    const queryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // Parse startTime to UTC (assuming local IST input)
    const [startH, startM] = startTime.split(":").map(Number);
    const startUTC = new Date(Date.UTC(year, month - 1, day, startH, startM, 0, 0));
    // Subtract 5.5 hours to convert from IST to UTC
    startUTC.setTime(startUTC.getTime() - 5.5 * 60 * 60 * 1000);

    let endUTC: Date | null = null;
    if (endTime) {
      const [endH, endM] = endTime.split(":").map(Number);
      let endDay = day;
      
      // If end time is early morning next day (e.g. clock-out after midnight 12 AM / 1 AM / 2 AM),
      // we check if endHours is less than startHours. If so, it belongs to the next day!
      if (endH < startH) {
        endDay = day + 1;
      }
      
      endUTC = new Date(Date.UTC(year, month - 1, endDay, endH, endM, 0, 0));
      endUTC.setTime(endUTC.getTime() - 5.5 * 60 * 60 * 1000);
    }

    // Upsert the attendance record
    const existing = await prisma.attendanceRecord.findFirst({
      where: { staffId, shiftDate: queryDate }
    });

    let record;
    if (existing) {
      record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          state: endTime ? "SHIFT_ENDED" : "SHIFT_STARTED",
          startTime: startUTC,
          endTime: endUTC
        }
      });
    } else {
      record = await prisma.attendanceRecord.create({
        data: {
          staffId,
          shiftDate: queryDate,
          state: endTime ? "SHIFT_ENDED" : "SHIFT_STARTED",
          startTime: startUTC,
          endTime: endUTC
        }
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: existing ? "MANUAL_ATTENDANCE_UPDATED" : "MANUAL_ATTENDANCE_CREATED",
        entityType: "AttendanceRecord",
        entityId: record.id,
        newValue: JSON.stringify(record),
        performedBy: "Admin"
      }
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Manual attendance error:", error);
    return NextResponse.json({ error: "Failed to log attendance", details: error.message }, { status: 500 });
  }
}
