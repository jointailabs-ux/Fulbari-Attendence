// src/app/api/v1/fingerprint/identify/route.ts
//
// POST /api/v1/fingerprint/identify
// Body: { matchedStaffId: string }
//
// The client performs all biometric matching (1:N and 1:1) using the local Mantra service.
// Once matched, the client calls this endpoint to get the staff's slot and today's attendance state.

import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchedStaffId } = body;

    if (!matchedStaffId) {
      return NextResponse.json(
        { error: "Missing required field: matchedStaffId" },
        { status: 400 }
      );
    }

    const staff = await prisma.staffProfile.findUnique({
      where: { id: matchedStaffId },
      include: {
        slot: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { error: "Staff profile is currently inactive" },
        { status: 403 }
      );
    }

    // Fetch today's attendance
    const today = getTodayIST();
    const attendance = await prisma.attendanceRecord.findFirst({
      where: { staffId: staff.id, shiftDate: today },
      include: {
        breaks: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      staffId: staff.id,
      staffName: staff.name,
      slotName: staff.slot?.name || "Standard Slot",
      currentState: attendance?.state || "NOT_STARTED",
      attendanceId: attendance?.id || null,
      score: 100, // Dummy score since matching was done on client
      todayRecord: attendance
    });
  } catch (error: any) {
    console.error("[identify status] Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance status", details: error.message },
      { status: 500 }
    );
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getTodayIST(): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0, 0)
  );
}

