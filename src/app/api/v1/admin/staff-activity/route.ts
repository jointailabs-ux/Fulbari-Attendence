import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const dateStr = searchParams.get("date");

    if (!staffId || !dateStr) {
      return NextResponse.json({ error: "staffId and date are required" }, { status: 400 });
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const queryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const record = await prisma.attendanceRecord.findFirst({
      where: { staffId, shiftDate: queryDate },
      include: {
        breaks: { orderBy: { startTime: "asc" } },
        staff: { select: { name: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ activity: null });
    }

    // Build a timeline of events
    const events: { type: string; time: string; label: string }[] = [];

    if (record.startTime) {
      events.push({
        type: "SHIFT_START",
        time: record.startTime.toISOString(),
        label: "Shift Started",
      });
    }

    record.breaks.forEach((b, i) => {
      events.push({
        type: "BREAK_START",
        time: b.startTime.toISOString(),
        label: `Break ${i + 1} Started`,
      });
      if (b.endTime) {
        events.push({
          type: "BREAK_END",
          time: b.endTime.toISOString(),
          label: `Break ${i + 1} Ended`,
        });
      }
    });

    if (record.endTime) {
      events.push({
        type: "SHIFT_END",
        time: record.endTime.toISOString(),
        label: "Shift Ended",
      });
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Calculate totals
    let totalBreakMs = 0;
    record.breaks.forEach((b) => {
      const start = new Date(b.startTime).getTime();
      const end = b.endTime ? new Date(b.endTime).getTime() : Date.now();
      totalBreakMs += end - start;
    });

    let netWorkMs = 0;
    if (record.startTime) {
      const start = new Date(record.startTime).getTime();
      const end = record.endTime ? new Date(record.endTime).getTime() : Date.now();
      netWorkMs = Math.max(0, end - start - totalBreakMs);
    }

    return NextResponse.json({
      activity: {
        staffName: record.staff?.name || "Unknown",
        state: record.state,
        startTime: record.startTime?.toISOString() || null,
        endTime: record.endTime?.toISOString() || null,
        events,
        totalBreakMins: Math.round(totalBreakMs / 60000),
        netWorkHrs: (netWorkMs / 3600000).toFixed(2),
        breakCount: record.breaks.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching staff activity:", error);
    return NextResponse.json({ error: "Failed to fetch activity", details: error.message }, { status: 500 });
  }
}
