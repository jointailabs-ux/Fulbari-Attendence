// src/app/api/v1/fingerprint/identify/route.ts
//
// POST /api/v1/fingerprint/identify
// Body: { templateData: string, staffId?: string }
//
// If staffId is provided → 1:1 verification against that staff's templates.
// If staffId is omitted  → 1:N identification across all enrolled templates.
//
// IMPORTANT: All matching is done via morfinServerPost() (raw TCP socket).
// Using fetch() against 127.0.0.1:8030 does NOT work — MorFin's HTTP is non-standard.

import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { verifyTemplates } from "../../../../../lib/morfin-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateData, staffId } = body;

    if (!templateData) {
      return NextResponse.json(
        { error: "Missing required field: templateData" },
        { status: 400 }
      );
    }

    // ── 1:1 Verification (staffId provided) ───────────────────────────────────
    if (staffId) {
      const staff = await prisma.staffProfile.findUnique({
        where: { id: staffId },
        include: {
          slot: true,
          fingerprints: true,
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

      if (staff.fingerprints.length === 0) {
        return NextResponse.json(
          { error: "No fingerprints enrolled for this employee. Please enrol at least one fingerprint." },
          { status: 422 }
        );
      }

      // Verify against each enrolled template — stop on first match
      let matched = false;
      let bestScore = 0;
      let lastError: string | undefined;

      for (const fp of staff.fingerprints) {
        const result = await verifyTemplates(templateData, fp.templateData);

        if (result.error) {
          lastError = result.error;
          console.error(
            `[identify] Verify error for staff ${staff.name} (${fp.fingerIndex}):`,
            result.error
          );
          continue;
        }

        if (result.score > bestScore) bestScore = result.score;

        if (result.match) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (lastError && bestScore === 0) {
          // All verifications errored — service issue
          return NextResponse.json(
            {
              error: `Fingerprint verification failed — scanner service error: ${lastError}. Please ensure the MorFin service is running and the device is connected.`,
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            error:
              "Fingerprint does not match any registered template for this employee.",
            score: bestScore,
          },
          { status: 401 }
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
        score: bestScore,
        todayRecord: attendance
      });
    }

    // ── 1:N Identification (no staffId) ──────────────────────────────────────
    const allTemplates = await prisma.fingerprintTemplate.findMany({
      where: {
        staff: { isActive: true },
      },
      include: {
        staff: {
          include: { slot: true },
        },
      },
    });

    if (allTemplates.length === 0) {
      return NextResponse.json(
        {
          error:
            "No fingerprints enrolled in the system. Please ask admin to enrol your fingerprint first.",
        },
        { status: 404 }
      );
    }

    let matchedTemplate: (typeof allTemplates)[0] | null = null;
    let bestScore = 0;
    let serviceErrorCount = 0;

    for (const t of allTemplates) {
      const result = await verifyTemplates(templateData, t.templateData);

      if (result.error) {
        serviceErrorCount++;
        console.error(
          `[identify 1:N] Verify error for staff ${t.staff.name}:`,
          result.error
        );
        continue;
      }

      if (result.score > bestScore) bestScore = result.score;

      if (result.match) {
        matchedTemplate = t;
        break;
      }
    }

    // If ALL verifications errored — service is down
    if (!matchedTemplate && serviceErrorCount === allTemplates.length) {
      return NextResponse.json(
        {
          error:
            "Fingerprint scanner service is unavailable. Please ensure the MorFin service is running and the device is connected.",
        },
        { status: 503 }
      );
    }

    if (!matchedTemplate) {
      return NextResponse.json(
        {
          error: "Fingerprint not recognised. Please try again or contact admin.",
          score: bestScore,
        },
        { status: 404 }
      );
    }

    const staff = matchedTemplate.staff;

    if (!staff.isActive) {
      return NextResponse.json(
        {
          error:
            "Fingerprint recognised, but this staff profile is currently inactive.",
        },
        { status: 403 }
      );
    }

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
      score: bestScore,
      todayRecord: attendance
    });
  } catch (error: any) {
    console.error("[identify] Unhandled error:", error);
    return NextResponse.json(
      { error: "Fingerprint identification failed", details: error.message },
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
