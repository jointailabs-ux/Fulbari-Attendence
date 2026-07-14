import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.leaveRequest.findMany({
      include: {
        staff: {
          select: {
            name: true,
            phone: true,
            slot: {
              select: {
                name: true,
                outlet: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("Error fetching all leave requests for admin:", error);
    return NextResponse.json({ error: "Failed to fetch leave requests", details: error.message }, { status: 500 });
  }
}
