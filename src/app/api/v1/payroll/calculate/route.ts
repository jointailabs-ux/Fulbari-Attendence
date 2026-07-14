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
    const pfEnabled = searchParams.get('pf') === 'true';

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
          
          const simpleEarned = payroll.simple.earnedSalary;
          const strictEarned = payroll.strict.earnedSalary;
          
          const simplePf = pfEnabled ? parseFloat((simpleEarned * 0.12).toFixed(2)) : 0;
          const strictPf = pfEnabled ? parseFloat((strictEarned * 0.12).toFixed(2)) : 0;
          
          const simpleAdvanceDeducted = Math.min(payroll.pendingAdvances, Math.max(0, simpleEarned - simplePf));
          const strictAdvanceDeducted = Math.min(payroll.pendingAdvances, Math.max(0, strictEarned - strictPf));
          
          const simpleNet = Math.max(0, simpleEarned - simplePf - simpleAdvanceDeducted);
          const strictNet = Math.max(0, strictEarned - strictPf - strictAdvanceDeducted);

          return {
            staffId: payroll.staffId,
            name: payroll.name,
            month: payroll.monthYear,
            monthlySalary: payroll.monthlySalary,
            pfAmount: pfEnabled ? "12%" : "0.00",
            simplePf: simplePf.toFixed(2),
            strictPf: strictPf.toFixed(2),
            inHandBase: payroll.monthlySalary.toFixed(2),
            strictRaw: strictEarned.toFixed(2),
            simpleRaw: simpleEarned.toFixed(2),
            strictFinal: strictNet.toFixed(2),
            simpleFinal: simpleNet.toFixed(2),
            simpleAdvanceDeducted: simpleAdvanceDeducted.toFixed(2),
            strictAdvanceDeducted: strictAdvanceDeducted.toFixed(2),
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
