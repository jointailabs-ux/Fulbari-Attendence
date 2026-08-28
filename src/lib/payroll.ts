// src/lib/payroll.ts

import prisma from './prisma';

export interface AbsentDayDetail {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0=Sun, 6=Sat
  dayName: string; // "Saturday", "Sunday", "Monday", etc.
  weight: number; // 1.5 for Sat/Sun/Occasion, 1.0 for normal
  reason: 'SATURDAY' | 'SUNDAY' | 'OCCASION' | 'NORMAL';
  occasionName?: string;
}

export interface PayrollDetails {
  staffId: string;
  name: string;
  monthYear: string;
  monthlySalary: number; // S_base
  dailyWage: number; // R_day
  earnedTillNow: number; // R_day * paidDays
  totalDaysInMonth: number; // D_total
  daysElapsed: number; // Days passed in current cycle
  isMonthCompleted: boolean; // True if full calendar month cycle has concluded
  daysPresent: number; // D_present
  workedGross: number; // D_present * R_day
  freeLeaves: number; // Free paid leave allowance (e.g. 4)
  freeLeavesUsed: number;
  freeLeaveAmount: number;
  extraWeekendPenaltyDays: number;
  weekendPenaltyAmount: number;
  rawAbsences: number;
  fullLeaves: number; // Raw count of absent days
  halfLeaves: number; // L_half
  weightedLeavesTaken: number; // Weighted absent days (Normal: 1.0, Sat/Sun/Occasion: 1.5)
  unexcusedAbsences: number; // Deductible leave days exceeding 4 free leaves
  paidDays: number; // Effective paid days
  
  // Penalties
  penaltyLate: number; // Penalty_late
  penaltyEarly: number; // Penalty_early
  penaltyAbsence: number; // Penalty_absence
  
  // Totals
  pendingAdvances: number; // A_pending

  // Absence category tracking
  normalAbsences: number;
  weekendAbsences: {
    saturdays: number; // absent Saturdays
    sundays: number;   // absent Sundays
    total: number;
  };
  occasionAbsences: {
    count: number;
    dates: Array<{ date: string; name: string }>;
  };
  absentBreakdown: AbsentDayDetail[];
  
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Pure calculation logic for salary metrics with 1.5x penalty support
 */
export function calculateSalaryMetrics(
  baseSalary: number,
  totalDays: number,
  presentCount: number,
  weightedLeavesTaken: number,
  pendingAdvancesAmt: number,
  latePenaltiesTotal: number,
  earlyPenaltiesTotal: number,
  daysElapsed: number = totalDays,
  specialAbsentDays: number = 0
) {
  const R_day = totalDays > 0 ? baseSalary / totalDays : 0;
  const FREE_LEAVES = 4;
  const isMonthCompleted = daysElapsed >= totalDays;
  const effectivePeriodDays = isMonthCompleted ? totalDays : daysElapsed;

  // 1. Raw count of absent calendar days in elapsed cycle
  const rawAbsences = Math.max(0, effectivePeriodDays - presentCount);

  // 2. Excess unexcused leave days beyond 4 free leaves limit
  const unexcusedAbsences = Math.max(0, parseFloat((weightedLeavesTaken - FREE_LEAVES).toFixed(2)));
  const penaltyAbsence = parseFloat((unexcusedAbsences * R_day).toFixed(2));

  // 3. Paid days = days elapsed minus unexcused absences
  const paidDays = presentCount > 0 ? Math.max(0, parseFloat((effectivePeriodDays - unexcusedAbsences).toFixed(2))) : 0;

  // 4. Money earned from actual shifts worked
  const workedGross = parseFloat((presentCount * R_day).toFixed(2));

  // 5. Free leaves used (up to 4 free leaves) & monetary credit
  const freeLeavesUsed = Math.min(FREE_LEAVES, weightedLeavesTaken);
  const freeLeaveAmount = parseFloat((freeLeavesUsed * R_day).toFixed(2));

  // 6. Baseline earned amount for the elapsed period (e.g. 27 days * R_day or 31 days * R_day)
  const baselineEarned = parseFloat((effectivePeriodDays * R_day).toFixed(2));

  // 7. Gross earned salary = Baseline Earned - penaltyAbsence (equals paidDays * R_day)
  const earnedGross = presentCount > 0 ? Math.max(0, parseFloat((baselineEarned - penaltyAbsence).toFixed(2))) : 0;

  // Extra weekend/occasion weight days over 1.0x (e.g. 4.5 weighted leaves - 4 calendar absences = 0.5 extra days from 1.5x multiplier)
  const extraWeekendPenaltyDays = parseFloat(Math.max(0, weightedLeavesTaken - rawAbsences).toFixed(2));
  const weekendPenaltyAmount = parseFloat((extraWeekendPenaltyDays * R_day).toFixed(2));

  const S_earned_simple = earnedGross;
  const A_deducted_simple = Math.min(pendingAdvancesAmt, S_earned_simple);
  const S_net_simple = Math.max(0, parseFloat((S_earned_simple - A_deducted_simple).toFixed(2)));

  const totalPenalties = latePenaltiesTotal + earlyPenaltiesTotal;
  const S_earned_strict = Math.max(0, parseFloat((earnedGross - totalPenalties).toFixed(2)));
  const A_deducted_strict = Math.min(pendingAdvancesAmt, S_earned_strict);
  const S_net_strict = Math.max(0, parseFloat((S_earned_strict - A_deducted_strict).toFixed(2)));

  return {
    dailyWage: R_day,
    workedGross,
    freeLeavesUsed,
    freeLeaveAmount,
    extraWeekendPenaltyDays,
    weekendPenaltyAmount,
    rawAbsences,
    earnedTillNow: earnedGross,
    paidDays,
    freeLeaves: FREE_LEAVES,
    isMonthCompleted,
    unexcusedAbsences,
    penaltyAbsence,
    weightedLeavesTaken,
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
 * Calculates complete Simple vs Strict monthly payroll metrics for a staff member,
 * applying the 1.5x leave deduction rule on Saturdays, Sundays, and marked Occasion Days.
 */
export async function calculateStaffPayroll(
  staffId: string,
  monthYear: string
): Promise<PayrollDetails> {
  const [year, month] = monthYear.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const D_total = new Date(year, month, 0).getDate();

  // Fetch Occasion Days for this month safely
  let occasionDays: Array<{ date: Date; name: string; multiplier: number }> = [];
  try {
    occasionDays = await prisma.occasionDay.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      }
    });
  } catch {
    // If table doesn't exist yet or query fails, default to empty list
    occasionDays = [];
  }

  // Create a map of occasion date strings (YYYY-MM-DD -> { name, multiplier })
  const occasionMap = new Map<string, { name: string; multiplier: number }>();
  occasionDays.forEach(occ => {
    const dStr = occ.date.toISOString().split('T')[0];
    occasionMap.set(dStr, { name: occ.name, multiplier: occ.multiplier || 1.5 });
  });

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

  // Present count capped at D_total
  const D_present = Math.min(staff.attendances.length, D_total);

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
      penaltyEarly += 0.50 * R_day;
      earlyDetails.push({
        date: dateLabel,
        checkOut: "MISSED",
        earlyMins: 0,
        penalty: parseFloat((0.50 * R_day).toFixed(2))
      });
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

  // Calculate daysElapsed in the month (handling current vs past vs future months)
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const curYear = istTime.getUTCFullYear();
  const curMonth = istTime.getUTCMonth() + 1; // 1-indexed

  let daysElapsed = D_total;
  if (year === curYear && month === curMonth) {
    daysElapsed = Math.min(D_total, istTime.getUTCDate());
  } else if (year > curYear || (year === curYear && month > curMonth)) {
    daysElapsed = 0;
  }

  // Set of dates on which staff was present (clocked in)
  const attendedDates = new Set(
    staff.attendances.map(a => a.shiftDate.toISOString().split('T')[0])
  );

  // ─── Day-by-Day Absence & 1.5x Weight Analysis ─────────────────────────────
  let rawAbsentDays = 0;
  let weightedLeavesTaken = 0;
  let absentSaturdays = 0;
  let absentSundays = 0;
  let normalAbsences = 0;
  const occasionAbsencesList: Array<{ date: string; name: string }> = [];
  const absentBreakdown: AbsentDayDetail[] = [];

  for (let day = 1; day <= daysElapsed; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dow = d.getUTCDay(); // 0=Sun, 6=Sat
    const dateStr = d.toISOString().split('T')[0];

    if (!attendedDates.has(dateStr)) {
      rawAbsentDays++;
      const isOccasion = occasionMap.has(dateStr);
      const occasionInfo = occasionMap.get(dateStr);

      let weight = 1.0;
      let reason: AbsentDayDetail['reason'] = 'NORMAL';

      if (dow === 6) {
        // Saturday -> 1.5x
        weight = 1.5;
        reason = 'SATURDAY';
        absentSaturdays++;
      } else if (dow === 0) {
        // Sunday -> 1.5x
        weight = 1.5;
        reason = 'SUNDAY';
        absentSundays++;
      } else if (isOccasion) {
        // Occasion Day -> 1.5x
        weight = occasionInfo?.multiplier || 1.5;
        reason = 'OCCASION';
        occasionAbsencesList.push({ date: dateStr, name: occasionInfo?.name || 'Occasion Day' });
      } else {
        // Normal Weekday -> 1.0x
        weight = 1.0;
        reason = 'NORMAL';
        normalAbsences++;
      }

      // If weekend ALSO happened to be marked as occasion, list it under occasion absences as well for clarity
      if ((dow === 6 || dow === 0) && isOccasion) {
        occasionAbsencesList.push({ date: dateStr, name: `${DAY_NAMES[dow]} + ${occasionInfo?.name}` });
      }

      weightedLeavesTaken += weight;

      absentBreakdown.push({
        date: dateStr,
        dayOfWeek: dow,
        dayName: DAY_NAMES[dow],
        weight,
        reason,
        occasionName: occasionInfo?.name
      });
    }
  }

  const metrics = calculateSalaryMetrics(
    S_base,
    D_total,
    D_present,
    weightedLeavesTaken,
    A_pending,
    penaltyLate,
    penaltyEarly,
    daysElapsed,
    absentSaturdays + absentSundays + occasionAbsencesList.length
  );

  return {
    staffId: staff.id,
    name: staff.name,
    monthYear,
    monthlySalary: S_base,
    dailyWage: parseFloat(metrics.dailyWage.toFixed(2)),
    earnedTillNow: metrics.earnedTillNow,
    totalDaysInMonth: D_total,
    daysElapsed,
    isMonthCompleted: metrics.isMonthCompleted,
    daysPresent: D_present,
    workedGross: metrics.workedGross,
    freeLeaves: metrics.freeLeaves,
    freeLeavesUsed: metrics.freeLeavesUsed,
    freeLeaveAmount: metrics.freeLeaveAmount,
    extraWeekendPenaltyDays: metrics.extraWeekendPenaltyDays,
    weekendPenaltyAmount: metrics.weekendPenaltyAmount,
    rawAbsences: metrics.rawAbsences,
    fullLeaves: rawAbsentDays,
    halfLeaves: 0,
    weightedLeavesTaken: parseFloat(weightedLeavesTaken.toFixed(2)),
    unexcusedAbsences: metrics.unexcusedAbsences,
    paidDays: metrics.paidDays,
    penaltyLate: parseFloat(penaltyLate.toFixed(2)),
    penaltyEarly: parseFloat(penaltyEarly.toFixed(2)),
    penaltyAbsence: metrics.penaltyAbsence,
    pendingAdvances: A_pending,
    normalAbsences,
    weekendAbsences: {
      saturdays: absentSaturdays,
      sundays: absentSundays,
      total: absentSaturdays + absentSundays
    },
    occasionAbsences: {
      count: occasionAbsencesList.length,
      dates: occasionAbsencesList
    },
    absentBreakdown,
    simple: metrics.simple,
    strict: metrics.strict,
    lateDetails,
    earlyDetails
  };
}
