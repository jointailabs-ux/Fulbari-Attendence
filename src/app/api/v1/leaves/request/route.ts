import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, startDate, endDate, type, reason } = body;

    if (!staffId || !startDate || !endDate || !type || !reason) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        staffId,
        startDate: start,
        endDate: end,
        type,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    return NextResponse.json({ error: "Failed to create leave request", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json({ error: "staffId query param is required" }, { status: 400 });
    }

    const requests = await prisma.leaveRequest.findMany({
      where: { staffId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json({ error: "Failed to fetch leave requests", details: error.message }, { status: 500 });
  }
}
