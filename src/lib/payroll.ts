// src/lib/payroll.ts

import prisma from './prisma';

export interface PayrollDetails {
  staffId: string;
  name: string;
  monthYear: string;
  monthlySalary: number; // S_base
  dailyWage: number; // R_day
  totalDaysInMonth: number; // D_total
  daysPresent: number; // D_present
  fullLeaves: number; // L_full
  halfLeaves: number; // L_half
  unexcusedAbsences: number; // L_unexcused
  paidDays: number; // D_paid
  
  // Penalties
  penaltyLate: number; // Penalty_late
  penaltyEarly: number; // Penalty_early
  penaltyAbsence: number; // Penalty_absence
  
  // Totals
  pendingAdvances: number; // A_pending
  
  simple: {
    earnedSalary: number; // S_earned
    advancesDeducted: number; // A_deducted
    netPayable: number; // S_net
  };
  
  strict: {
    earnedSalary: number; // S_earned
    advancesDeducted: number; // A_deducted
    netPayable: number; // S_net
  };

  lateDetails: Array<{
    date: string;
    checkIn: string;
    delayMins: number;
    penalty: number;
  }>;

  earlyDetails: Array<{
    date: string;
    checkOut: string;
    earlyMins: number;
    penalty: number;
  }>;
}

/**
 * Utility to convert Date to Minutes since midnight in IST (UTC+5:30)
 */
export function getISTMinutesSinceMidnight(date: Date): number {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  return hours * 60 + minutes;
}

/**
 * Utility to format Date to IST Time String (HH:MM AM/PM)
 */
export function formatISTTime(date: Date): string {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Pure calculation logic for salary metrics
 */
export function calculateSalaryMetrics(
  baseSalary: number,
  totalDays: number,
  presentCount: number,
  fullLeavesCount: number,
  halfLeavesCount: number,
  pendingAdvancesAmt: number,
  latePenaltiesTotal: number,
  earlyPenaltiesTotal: number
) {
  const R_day = baseSalary / totalDays;
  const D_paid = presentCount + fullLeavesCount + (0.5 * halfLeavesCount);
  
  // Mode 1: Simple Payout
  const S_earned_simple = R_day * D_paid;
  const A_deducted_simple = Math.min(pendingAdvancesAmt, S_earned_simple);
  const S_net_simple = S_earned_simple - A_deducted_simple;

  // Mode 2: Strict Payout
  const L_unexcused = Math.max(0, totalDays - (presentCount + fullLeavesCount + (0.5 * halfLeavesCount)));
  const Penalty_absence = L_unexcused * R_day;
  
  const S_earned_strict = Math.max(0, (R_day * D_paid) - (latePenaltiesTotal + earlyPenaltiesTotal + Penalty_absence));
  const A_deducted_strict = Math.min(pendingAdvancesAmt, S_earned_strict);
  const S_net_strict = S_earned_strict - A_deducted_strict;

  return {
    dailyWage: R_day,
    paidDays: D_paid,
    unexcusedAbsences: L_unexcused,
    penaltyAbsence: Penalty_absence,
    simple: {
      earnedSalary: parseFloat(S_earned_simple.toFixed(2)),
      advancesDeducted: parseFloat(A_deducted_simple.toFixed(2)),
      netPayable: parseFloat(S_net_simple.toFixed(2))
    },
    strict: {
      earnedSalary: parseFloat(S_earned_strict.toFixed(2)),
      advancesDeducted: parseFloat(A_deducted_strict.toFixed(2)),
      netPayable: parseFloat(S_net_strict.toFixed(2))
    }
  };
}

/**
 * Calculates complete Simple vs Strict monthly payroll metrics for a staff member.
 */
export async function calculateStaffPayroll(
  staffId: string,
  monthYear: string
): Promise<PayrollDetails> {
  const [year, month] = monthYear.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const D_total = endDate.getDate();

  const staff = await prisma.staffProfile.findUnique({
    where: { id: staffId },
    include: {
      slot: {
        include: {
          outlet: true
        }
      },
      attendances: {
        where: {
          shiftDate: { gte: startDate, lte: endDate }
        }
      },
      leaves: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      },
      advances: {
        where: {
          status: 'PENDING',
          isActive: true
        }
      }
    }
  });

  if (!staff) {
    throw new Error(`Staff profile with ID ${staffId} not found`);
  }

  const S_base = staff.monthlySalary;
  const R_day = S_base / D_total;
  
  // Pending advances sum
  const A_pending = staff.advances.reduce((acc, curr) => acc + curr.amount, 0);

  // Leave tallies
  const L_full = staff.leaves.filter(l => l.type === 'FULL').length;
  const L_half = staff.leaves.filter(l => l.type === 'HALF').length;
  
  // Present count
  const D_present = staff.attendances.length;

  // Expected shift times (e.g. "09:00", "17:00")
  const shiftStartTime = staff.slot?.outlet?.shiftStartTime || '09:00';
  const shiftEndTime = staff.slot?.outlet?.shiftEndTime || '17:00';

  const [expStartH, expStartM] = shiftStartTime.split(':').map(Number);
  const expectedStartMin = expStartH * 60 + expStartM;

  const [expEndH, expEndM] = shiftEndTime.split(':').map(Number);
  const expectedEndMin = expEndH * 60 + expEndM;

  // Late Arrival & Early Departure Penalty Tallies
  let penaltyLate = 0;
  let penaltyEarly = 0;

  const lateDetails: PayrollDetails['lateDetails'] = [];
  const earlyDetails: PayrollDetails['earlyDetails'] = [];

  staff.attendances.forEach(att => {
    if (!att.startTime) return;

    const dateLabel = att.shiftDate.toISOString().split('T')[0];

    // Handle Missed Clock-out
    if (!att.endTime) {
      // Apply a flat 0.5 R_day penalty for missing clock-out
      penaltyEarly += 0.50 * R_day;
      earlyDetails.push({
        date: dateLabel,
        checkOut: "MISSED",
        earlyMins: 0,
        penalty: parseFloat((0.50 * R_day).toFixed(2))
      });
      // We still count them as present for the day (base pay applies, but strict mode deducts 0.5 days worth of pay)
    }

    // 1. Late Arrival Calculation
    const actualStartMin = getISTMinutesSinceMidnight(att.startTime);
    if (actualStartMin > expectedStartMin) {
      const delayMins = actualStartMin - expectedStartMin;
      let penalty = 0;
      
      if (delayMins > 15 && delayMins <= 60) {
        penalty = 0.15 * R_day; // Minor late penalty
      } else if (delayMins > 60) {
        penalty = 0.50 * R_day; // Major late penalty
      }

      if (penalty > 0) {
        penaltyLate += penalty;
        lateDetails.push({
          date: dateLabel,
          checkIn: formatISTTime(att.startTime),
          delayMins,
          penalty: parseFloat(penalty.toFixed(2))
        });
      }
    }

    // 2. Early Departure Calculation
    if (att.endTime) {
      const actualEndMin = getISTMinutesSinceMidnight(att.endTime);
      if (actualEndMin < expectedEndMin) {
        const earlyMins = expectedEndMin - actualEndMin;
        let penalty = 0;

        if (earlyMins > 10 && earlyMins <= 45) {
          penalty = 0.15 * R_day; // Minor early penalty
        } else if (earlyMins > 45) {
          penalty = 0.50 * R_day; // Major early penalty
        }

        if (penalty > 0) {
          penaltyEarly += penalty;
          earlyDetails.push({
            date: dateLabel,
            checkOut: formatISTTime(att.endTime),
            earlyMins,
            penalty: parseFloat(penalty.toFixed(2))
          });
        }
      }
    }
  });

  const metrics = calculateSalaryMetrics(
    S_base,
    D_total,
    D_present,
    L_full,
    L_half,
    A_pending,
    penaltyLate,
    penaltyEarly
  );

  return {
    staffId: staff.id,
    name: staff.name,
    monthYear,
    monthlySalary: S_base,
    dailyWage: parseFloat(metrics.dailyWage.toFixed(2)),
    totalDaysInMonth: D_total,
    daysPresent: D_present,
    fullLeaves: L_full,
    halfLeaves: L_half,
    unexcusedAbsences: metrics.unexcusedAbsences,
    paidDays: metrics.paidDays,
    penaltyLate: parseFloat(penaltyLate.toFixed(2)),
    penaltyEarly: parseFloat(penaltyEarly.toFixed(2)),
    penaltyAbsence: parseFloat(metrics.penaltyAbsence.toFixed(2)),
    pendingAdvances: A_pending,
    simple: metrics.simple,
    strict: metrics.strict,
    lateDetails,
    earlyDetails
  };
}
