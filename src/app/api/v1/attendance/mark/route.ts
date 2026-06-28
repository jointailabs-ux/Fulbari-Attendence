// src/app/api/v1/attendance/mark/route.ts

import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

/**
 * POST /api/v1/attendance/mark
 * Body: { staffId, outletId }
 * Auto-detects IN vs OUT based on the last attendance record for today.
 */
export async function POST(req: Request) {
  try {
    const { staffId, outletId } = await req.json();

    if (!staffId) {
      return NextResponse.json(
        { error: "Missing required field: staffId" },
        { status: 400 }
      );
    }

    // Verify staff exists and is active
    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId },
      include: { slot: true },
    });

    if (!staff || !staff.isActive) {
      return NextResponse.json(
        { error: "Staff not found or inactive" },
        { status: 404 }
      );
    }

    // Calculate today's date in IST
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const today = new Date(
      Date.UTC(
        istTime.getUTCFullYear(),
        istTime.getUTCMonth(),
        istTime.getUTCDate(),
        0, 0, 0, 0
      )
    );

    // Find today's attendance record
    const existing = await prisma.attendanceRecord.findFirst({
      where: { staffId, shiftDate: today },
      orderBy: { createdAt: "desc" },
    });

    const currentState = existing?.state || "NOT_STARTED";

    // Format current time for display (IST)
    const displayTime = istTime.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC", // already shifted to IST
    });

    // Auto-detect action
    if (currentState === "NOT_STARTED") {
      // Clock IN — create new attendance record
      await prisma.attendanceRecord.create({
        data: {
          staffId,
          shiftDate: today,
          state: "SHIFT_STARTED",
          startTime: new Date(),
        },
      });

      return NextResponse.json({
        type: "IN",
        time: displayTime,
        staffName: staff.name,
        currentState: "SHIFT_STARTED",
      });
    } else if (currentState === "SHIFT_STARTED" || currentState === "ON_BREAK") {
      // 5-Minute Cooldown Check
      if (existing) {
        const lastUpdated = new Date(existing.updatedAt).getTime();
        if (now.getTime() - lastUpdated < 5 * 60 * 1000) {
           return NextResponse.json({
            type: "ALREADY_OUT",
            time: displayTime,
            staffName: staff.name,
            currentState,
            message: "Action ignored: You just scanned within the last 5 minutes.",
          });
        }
      }

      // Clock OUT — close any open breaks and end the shift
      if (currentState === "ON_BREAK") {
        const activeBreak = await prisma.breakLog.findFirst({
          where: { attendanceId: existing!.id, endTime: null },
          orderBy: { startTime: "desc" },
        });
        if (activeBreak) {
          await prisma.breakLog.update({
            where: { id: activeBreak.id },
            data: { endTime: new Date() },
          });
        }
      }

      await prisma.attendanceRecord.update({
        where: { id: existing!.id },
        data: { state: "SHIFT_ENDED", endTime: new Date() },
      });

      return NextResponse.json({
        type: "OUT",
        time: displayTime,
        staffName: staff.name,
        currentState: "SHIFT_ENDED",
      });
    } else if (currentState === "SHIFT_ENDED") {
      // Already clocked out for today
      return NextResponse.json({
        type: "ALREADY_OUT",
        time: displayTime,
        staffName: staff.name,
        currentState: "SHIFT_ENDED",
        message: "Shift already ended for today.",
      });
    }

    return NextResponse.json(
      { error: "Unexpected attendance state" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST /attendance/mark Error:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance", details: error.message },
      { status: 500 }
    );
  }
}
