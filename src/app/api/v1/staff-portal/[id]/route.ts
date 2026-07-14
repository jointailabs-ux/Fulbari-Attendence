import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// GET /api/v1/staff-portal/[id] — returns full self-service data for the employee
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const staff = await prisma.staffProfile.findUnique({
      where: { id },
      include: {
        slot: { include: { outlet: true } },
        payrolls: {
          orderBy: { monthYear: 'desc' }
        },
        attendances: {
          orderBy: { shiftDate: 'desc' },
          take: 60, // last ~2 months
        },
        advances: {
          where: { isActive: true },
          orderBy: { date: 'desc' }
        },
        leaves: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    // Calculate current month summary
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const currentMonth = istTime.toISOString().slice(0, 7);
    const startDate = new Date(`${currentMonth}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    const thisMonthAttendances = staff.attendances.filter(a => {
      const d = new Date(a.shiftDate);
      return d >= startDate && d <= endDate;
    });

    const presentDays = thisMonthAttendances.filter(a => a.state === 'SHIFT_ENDED').length;
    const totalDays = endDate.getDate();
    const pendingAdvance = staff.advances
      .filter(a => a.status === 'PENDING')
      .reduce((sum, a) => sum + a.amount, 0);

    // Today's attendance
    const todayStr = istTime.toISOString().slice(0, 10);
    const todayRecord = staff.attendances.find(a =>
      new Date(a.shiftDate).toISOString().slice(0, 10) === todayStr
    );

    // Return safe data without hashedPin
    const { hashedPin, ...safeStaff } = staff;

    return NextResponse.json({
      ...safeStaff,
      currentMonth: {
        month: currentMonth,
        presentDays,
        totalDays,
        attendancePercent: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
        pendingAdvance,
        todayStatus: todayRecord?.state || 'NOT_STARTED'
      }
    });
  } catch (error) {
    console.error('Staff portal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
