import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { calculateStaffPayroll } from '../../../../../lib/payroll';

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

    // Determine current month in IST
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const currentMonth = istTime.toISOString().slice(0, 7);

    // Calculate exact payroll using the shared engine
    const payroll = await calculateStaffPayroll(staff.id, currentMonth);

    const simpleEarned = payroll.simple.earnedSalary;
    const simpleAdvanceDeducted = Math.min(payroll.pendingAdvances, simpleEarned);
    const simpleNet = Math.max(0, parseFloat((simpleEarned - simpleAdvanceDeducted).toFixed(2)));

    // Today's attendance
    const todayStr = istTime.toISOString().slice(0, 10);
    const todayRecord = staff.attendances.find(a =>
      new Date(a.shiftDate).toISOString().slice(0, 10) === todayStr
    );

    const activeAdvances = staff.advances.filter(a => a.status === 'PENDING').map(a => ({
      date: a.date.toISOString(),
      amount: a.amount,
      reason: "Cash Advance"
    }));

    // Return safe data without hashedPin
    const { hashedPin, ...safeStaff } = staff;

    const metrics = {
      totalDaysInMonth: payroll.totalDaysInMonth,
      daysElapsed: payroll.daysElapsed,
      isMonthCompleted: payroll.isMonthCompleted,
      dailyWage: payroll.dailyWage,
      earnedTillNow: payroll.earnedTillNow,
      daysPresent: payroll.daysPresent,
      workedGross: payroll.workedGross,
      paidDays: payroll.paidDays,
      freeLeaves: payroll.freeLeaves,
      freeLeavesUsed: payroll.freeLeavesUsed,
      freeLeaveAmount: payroll.freeLeaveAmount,
      extraWeekendPenaltyDays: payroll.extraWeekendPenaltyDays,
      weekendPenaltyAmount: payroll.weekendPenaltyAmount,
      rawAbsences: payroll.rawAbsences,
      fullLeaves: payroll.fullLeaves,
      halfLeaves: payroll.halfLeaves,
      weightedLeavesTaken: payroll.weightedLeavesTaken,
      normalAbsences: payroll.normalAbsences,
      unexcusedAbsences: payroll.unexcusedAbsences,
      penaltyLate: payroll.penaltyLate,
      penaltyEarly: payroll.penaltyEarly,
      penaltyAbsence: payroll.penaltyAbsence
    };

    return NextResponse.json({
      ...safeStaff,
      payrollRecord: {
        name: payroll.name,
        month: payroll.monthYear,
        monthlySalary: payroll.monthlySalary,
        dailyWage: payroll.dailyWage,
        simpleRaw: simpleEarned.toFixed(2),
        simpleFinal: simpleNet.toFixed(2),
        simpleAdvanceDeducted: simpleAdvanceDeducted.toFixed(2),
        totalAdvance: payroll.pendingAdvances.toFixed(2),
        metrics,
        weekendAbsences: payroll.weekendAbsences,
        occasionAbsences: payroll.occasionAbsences,
        absentBreakdown: payroll.absentBreakdown
      },
      currentMonth: {
        month: currentMonth,
        presentDays: payroll.daysPresent,
        paidDays: payroll.paidDays,
        freeLeaves: payroll.freeLeaves,
        totalDays: payroll.totalDaysInMonth,
        dailyWage: payroll.dailyWage,
        workedGross: payroll.workedGross,
        earnedGross: simpleEarned,
        earnedTillNow: simpleEarned,
        attendancePercent: payroll.totalDaysInMonth > 0 ? Math.round((payroll.daysPresent / payroll.totalDaysInMonth) * 100) : 0,
        pendingAdvance: payroll.pendingAdvances,
        advanceToRecover: simpleAdvanceDeducted,
        netPayable: simpleNet,
        activeAdvances,
        todayStatus: todayRecord?.state || 'NOT_STARTED',
        weekendAbsences: payroll.weekendAbsences,
        occasionAbsences: payroll.occasionAbsences,
        extraWeekendPenaltyDays: payroll.extraWeekendPenaltyDays,
        weekendPenaltyAmount: payroll.weekendPenaltyAmount,
        rawAbsences: payroll.rawAbsences,
        normalAbsences: payroll.normalAbsences,
        unexcusedAbsences: payroll.unexcusedAbsences,
        metrics,
        absentBreakdown: payroll.absentBreakdown
      }
    });
  } catch (error) {
    console.error('Staff portal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { dateOfBirth, bloodGroup, pin } = body;

    const updateData: any = {
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      bloodGroup: bloodGroup || null,
    };

    if (pin && pin.trim()) {
      if (!/^\d{6}$/.test(pin.trim())) {
        return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }
      updateData.hashedPin = Buffer.from(pin.trim()).toString('base64');
    }

    const updatedStaff = await prisma.staffProfile.update({
      where: { id },
      data: updateData
    });

    const { hashedPin, ...safeStaff } = updatedStaff;
    return NextResponse.json(safeStaff);
  } catch (error) {
    console.error('Staff portal update error:', error);
    return NextResponse.json({ error: 'Failed to update details' }, { status: 500 });
  }
}

