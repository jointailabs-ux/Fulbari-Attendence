import { NextResponse } from 'next/server';


import prisma from '../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const { staffId, pin, skipPin } = await req.json();

    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    if (!skipPin) {
      // BASE64 matching for mock hash
      const hashedPin = Buffer.from(pin).toString('base64');

      if (staff.hashedPin !== hashedPin) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
      }
    }

    // Get today's attendance state in normalized IST calendar date
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const today = new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));

    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        staffId,
        shiftDate: today
      },
      include: {
        breaks: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      staffName: staff.name,
      currentState: attendance?.state || 'NOT_STARTED',
      attendanceId: attendance?.id || null,
      todayRecord: attendance
    });
  } catch (error) {
    console.error('API /verify-pin Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
