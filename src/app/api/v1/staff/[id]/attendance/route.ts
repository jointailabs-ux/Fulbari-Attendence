import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    const [attendances, leaves] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          staffId: id,
          shiftDate: { gte: startDate, lte: endDate }
        },
        include: { breaks: true }
      }),
      prisma.leaveRecord.findMany({
        where: {
          staffId: id,
          date: { gte: startDate, lte: endDate }
        }
      })
    ]);

    // Aggregate data by date
    const calendarData: Record<string, any> = {};

    // Fill with attendance
    attendances.forEach(att => {
      const dateStr = att.shiftDate.toISOString().split('T')[0];
      
      let totalWorkMs = 0;
      if (att.startTime && att.endTime) {
        totalWorkMs = att.endTime.getTime() - att.startTime.getTime();
        // Subtract breaks
        att.breaks.forEach(b => {
          if (b.startTime && b.endTime) {
            totalWorkMs -= (b.endTime.getTime() - b.startTime.getTime());
          }
        });
      }

      calendarData[dateStr] = {
        status: att.state === 'SHIFT_ENDED' ? 'PRESENT' : 'IN_PROGRESS',
        startTime: att.startTime,
        endTime: att.endTime,
        workHours: (totalWorkMs / (1000 * 60 * 60)).toFixed(2),
        breaks: att.breaks,
        breakDurationMs: att.breaks.reduce((acc, b) => {
          if (b.startTime && b.endTime) return acc + (b.endTime.getTime() - b.startTime.getTime());
          return acc;
        }, 0)
      };
    });

    // Override/Fill with leaves
    leaves.forEach(l => {
      const dateStr = l.date.toISOString().split('T')[0];
      calendarData[dateStr] = {
        ...calendarData[dateStr],
        status: l.type === 'FULL' ? 'FULL_LEAVE' : 'HALF_LEAVE',
        leaveType: l.type
      };
    });

    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('Error fetching attendance calendar:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
  }
}
