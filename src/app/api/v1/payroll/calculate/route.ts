// src/app/api/v1/payroll/calculate/route.ts

import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { calculateStaffPayroll } from '../../../../../lib/payroll';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // e.g. "2026-05"

  if (!month) {
    return NextResponse.json({ error: 'Month query parameter is required (Format: YYYY-MM)' }, { status: 400 });
  }

  try {
    // 1. Fetch all active or relevant staff profiles
    const staffProfiles = await prisma.staffProfile.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true
      }
    });

    // 2. Map profiles to their calculated payroll figures using the payroll engine
    const results = await Promise.all(
      staffProfiles.map(async (profile) => {
        try {
          const payroll = await calculateStaffPayroll(profile.id, month);
          
          return {
            staffId: payroll.staffId,
            name: payroll.name,
            month: payroll.monthYear,
            monthlySalary: payroll.monthlySalary,
            pfAmount: "0.00", // PRD v3.0 works with raw base salary (no PF deductions)
            inHandBase: payroll.monthlySalary.toFixed(2),
            strictRaw: payroll.strict.earnedSalary.toFixed(2),
            simpleRaw: payroll.simple.earnedSalary.toFixed(2),
            strictFinal: payroll.strict.netPayable.toFixed(2),
            simpleFinal: payroll.simple.netPayable.toFixed(2),
            totalAdvance: payroll.pendingAdvances.toFixed(2),
            warnings: {
              highAdvance: payroll.pendingAdvances > (payroll.monthlySalary * 0.5),
              lowWork: payroll.daysPresent === 0
            },
            lateDetails: payroll.lateDetails,
            earlyDetails: payroll.earlyDetails,
            metrics: {
              daysPresent: payroll.daysPresent,
              fullLeaves: payroll.fullLeaves,
              halfLeaves: payroll.halfLeaves,
              unexcusedAbsences: payroll.unexcusedAbsences,
              penaltyLate: payroll.penaltyLate,
              penaltyEarly: payroll.penaltyEarly,
              penaltyAbsence: payroll.penaltyAbsence
            }
          };
        } catch (e: any) {
          console.error(`Error calculating payroll for staff ${profile.id}:`, e);
          return null;
        }
      })
    );

    // Filter out any calculations that errored
    const filteredResults = results.filter(r => r !== null);

    return NextResponse.json(filteredResults);
  } catch (error: any) {
    console.error('Payroll Matrix Calculation Error:', error);
    return NextResponse.json({ error: 'Failed to calculate monthly payroll matrix', details: error.message }, { status: 500 });
  }
}
