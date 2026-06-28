// src/app/api/v1/fingerprint/templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/fingerprint/templates?outletId=X
 * Returns all fingerprint templates for active staff in the given outlet.
 */
export async function GET(req: NextRequest) {
  try {
    const outletId = req.nextUrl.searchParams.get("outletId");

    const whereClause: any = {
      staff: {
        isActive: true,
      },
    };

    if (outletId) {
      whereClause.staff.slot = { outletId };
    }

    // Fetch all fingerprint templates for active staff
    const templates = await prisma.fingerprintTemplate.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const result = templates.map((t) => ({
      staffId: t.staff.id,
      staffName: t.staff.name,
      templateData: t.templateData,
      fingerIndex: t.fingerIndex,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /fingerprint/templates Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates", details: error.message },
      { status: 500 }
    );
  }
}
