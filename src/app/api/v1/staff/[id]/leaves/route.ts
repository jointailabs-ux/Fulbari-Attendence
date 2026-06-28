import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { date, type, markedBy } = body;

    if (!date || !type) {
      return NextResponse.json({ error: 'Date and type are required' }, { status: 400 });
    }

    const leaveDate = new Date(date);
    leaveDate.setHours(0, 0, 0, 0);

    // Check if leave already exists for this date
    const existingLeave = await prisma.leaveRecord.findFirst({
      where: {
        staffId: id,
        date: {
          gte: leaveDate,
          lte: new Date(leaveDate.getTime() + 24 * 60 * 60 * 1000 - 1)
        }
      }
    });

    if (existingLeave) {
      // Update existing leave
      const updatedLeave = await prisma.leaveRecord.update({
        where: { id: existingLeave.id },
        data: { type, markedBy }
      });
      return NextResponse.json(updatedLeave);
    }

    const newLeave = await prisma.leaveRecord.create({
      data: {
        staffId: id,
        date: leaveDate,
        type,
        markedBy
      }
    });

    return NextResponse.json(newLeave, { status: 201 });
  } catch (error) {
    console.error('Error marking leave:', error);
    return NextResponse.json({ error: 'Failed to mark leave' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const leaveDate = new Date(date);
    leaveDate.setHours(0, 0, 0, 0);

    await prisma.leaveRecord.deleteMany({
      where: {
        staffId: id,
        date: {
          gte: leaveDate,
          lte: new Date(leaveDate.getTime() + 24 * 60 * 60 * 1000 - 1)
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting leave:', error);
    return NextResponse.json({ error: 'Failed to delete leave' }, { status: 500 });
  }
}
