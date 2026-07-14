import { NextResponse } from "next/server";
import prisma from "../../../../../../lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, reviewedBy } = body; // status: "APPROVED" | "REJECTED"

    if (!status || (status !== "APPROVED" && status !== "REJECTED")) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request has already been processed" }, { status: 400 });
    }

    // Update leave request status
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // If approved, create LeaveRecord entries for each day in range
    if (status === "APPROVED") {
      const recordsToCreate = [];
      const current = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);

      // Loop through each day in range
      while (current <= end) {
        const leaveDate = new Date(current);
        leaveDate.setHours(0, 0, 0, 0);

        // Check if there is already a LeaveRecord for this staff + date
        const existingRecord = await prisma.leaveRecord.findFirst({
          where: {
            staffId: leaveRequest.staffId,
            date: {
              gte: leaveDate,
              lte: new Date(leaveDate.getTime() + 24 * 60 * 60 * 1000 - 1)
            }
          }
        });

        if (!existingRecord) {
          recordsToCreate.push({
            staffId: leaveRequest.staffId,
            date: leaveDate,
            type: leaveRequest.type,
            markedBy: reviewedBy || "ADMIN_PORTAL",
          });
        }

        current.setDate(current.getDate() + 1);
      }

      if (recordsToCreate.length > 0) {
        await prisma.leaveRecord.createMany({
          data: recordsToCreate,
        });
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Error processing leave request:", error);
    return NextResponse.json({ error: "Failed to process leave request", details: error.message }, { status: 500 });
  }
}
