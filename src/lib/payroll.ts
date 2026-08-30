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

export interface AdvanceDetail {
  id: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  formattedDate: string; // e.g. "15 Aug 2026"
}

export interface TodayShiftStatus {
  isToday: boolean;
  isLastDay: boolean;
  shiftStarted: boolean;
  shiftEnded: boolean;
  shiftHours: string; // e.g. "12:00 PM – 12:00 AM"
  canTakeLeave: boolean;
}

export interface WeeklyFreeLeaveEntry {
  weekLabel: string;   // e.g. "Week 1 (Aug 1–7)"
  daysWorked: number;  // how many days the employee worked that week
  daysInMonth: number; // how many days of that week fall in the current month/elapsed period
  earned: boolean;     // true if daysWorked >= 6
}

export interface PayrollDetails {
  staffId: string;
  name: string;
  monthYear: string;
  monthlySalary: number;
  dailyWage: number;
  earnedTillNow: number; // workedGross - excessPenalty (can be negative)
  totalDaysInMonth: number;
  daysElapsed: number;
  isMonthCompleted: boolean;
  daysPresent: number;
  workedGross: number; // D_present * R_day
  freeLeaves: number;  // earned via weekly rule
  freeLeavesUsed: number;
  freeLeaveAmount: number;
  unusedFreeLeaves: number;
  unusedLeaveAmount: number;
  potentialUnusedLeaveAmount: number;
  showUnusedLeavePay: boolean;
  extraWeekendPenaltyDays: number;
  weekendPenaltyAmount: number;
  rawAbsences: number;
  fullLeaves: number;
  halfLeaves: number;
  weightedLeavesTaken: number;
  unexcusedAbsences: number;
  paidDays: number;
  penaltyLate: number;
  penaltyEarly: number;
  penaltyAbsence: number;
  pendingAdvances: number;
  advanceDetails: AdvanceDetail[];
  todayShiftStatus: TodayShiftStatus;
  normalAbsences: number;
  weekendAbsences: { saturdays: number; sundays: number; total: number };
  occasionAbsences: { count: number; dates: Array<{ date: string; name: string }> };
  absentBreakdown: AbsentDayDetail[];
  weeklyFreeLeaveBreakdown: WeeklyFreeLeaveEntry[];
  simple: { earnedSalary: number; advancesDeducted: number; netPayable: number };
  strict: { earnedSalary: number; advancesDeducted: number; netPayable: number };
  lateDetails: Array<{ date: string; checkIn: string; delayMins: number; penalty: number }>;
  earlyDetails: Array<{ date: string; checkOut: string; earlyMins: number; penalty: number }>;
}

export function getISTMinutesSinceMidnight(date: Date): number {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
}

export function formatISTTime(date: Date): string {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${minutes} ${ampm}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculate weekly free leaves earned.
 * Rule: 1 free paid leave per week ONLY if employee worked >= 6 days that week.
 * Week grouping: days 1-7 = week 1, days 8-14 = week 2, etc.
 * Maximum 4 weeks considered per month (4 free leaves maximum possible).
 */
export function calculateWeeklyFreeLeaves(
  year: number,
  month: number,
  daysElapsed: number,
  attendedDates: Set<string>
): { freeLeaves: number; weeklyBreakdown: WeeklyFreeLeaveEntry[] } {
  const D_total = new Date(year, month, 0).getDate();
  const effectiveDays = Math.min(daysElapsed, D_total);
  const breakdown: WeeklyFreeLeaveEntry[] = [];
  let totalFreeLeaves = 0;

  const weekMap = new Map<number, { dates: string[]; start: number; end: number }>();
  for (let day = 1; day <= effectiveDays; day++) {
    const weekIndex = Math.ceil(day / 7);
    if (!weekMap.has(weekIndex)) {
      weekMap.set(weekIndex, { dates: [], start: day, end: Math.min(weekIndex * 7, effectiveDays) });
    }
    const dateStr = new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
    weekMap.get(weekIndex)!.dates.push(dateStr);
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = monthNames[month - 1];

  Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([idx, week]) => {
      const daysWorked = week.dates.filter(d => attendedDates.has(d)).length;
      const earned = daysWorked >= 6;
      if (earned) totalFreeLeaves++;
      breakdown.push({
        weekLabel: `Week ${idx} (${mon} ${week.start}â€“${week.end})`,
        daysWorked,
        daysInMonth: week.dates.length,
        earned,
      });
    });

  return { freeLeaves: totalFreeLeaves, weeklyBreakdown: breakdown };
}

/**
 * Pure salary metric calculation.
 *
 * NEW FORMULA:
 *   Gross Earned = Days Worked Ã— Daily Wage               (shift pay only)
 *   Excess Penalty = max(0, weightedLeaves - freeLeaves) Ã— Daily Wage
 *   Earned Gross = Gross Earned - Excess Penalty          (CAN BE NEGATIVE)
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
  specialAbsentDays: number = 0,
  freeLeaves: number = 4,
  showUnusedLeavePay: boolean = false
) {
  const R_day = totalDays > 0 ? baseSalary / totalDays : 0;
  const isMonthCompleted = daysElapsed >= totalDays;
  const effectivePeriodDays = isMonthCompleted ? totalDays : daysElapsed;

  const rawAbsences = Math.max(0, effectivePeriodDays - presentCount);

  // Excess absences beyond earned free leaves (in weighted days)
  const freeLeavesUsed = parseFloat(Math.min(freeLeaves, weightedLeavesTaken).toFixed(2));
  const unexcusedAbsences = Math.max(0, parseFloat((weightedLeavesTaken - freeLeaves).toFixed(2)));
  const penaltyAbsence = parseFloat((unexcusedAbsences * R_day).toFixed(2));

  // Paid days = present + weighted free leaves used
  const paidDays = parseFloat((presentCount + freeLeavesUsed).toFixed(2));

  // Shift pay: only for days actually worked
  const workedGross = parseFloat((presentCount * R_day).toFixed(2));

  // Free leave monetary credit (paid leave pay for covered absences)
  const freeLeaveAmount = parseFloat((freeLeavesUsed * R_day).toFixed(2));

  // Unused earned leaves calculation (encashment / paid leave pay)
  const unusedFreeLeaves = parseFloat(Math.max(0, freeLeaves - freeLeavesUsed).toFixed(2));
  const potentialUnusedLeaveAmount = parseFloat((unusedFreeLeaves * R_day).toFixed(2));
  const unusedLeaveAmount = showUnusedLeavePay ? potentialUnusedLeaveAmount : 0;

  // Earned gross = Shift Pay + Paid Leave Credit + Unused Leave Pay − Excess Penalty (CAN BE NEGATIVE)
  const earnedGross = parseFloat((workedGross + freeLeaveAmount + unusedLeaveAmount - penaltyAbsence).toFixed(2));

  // Extra weekend weight info (informational)
  const extraWeekendPenaltyDays = parseFloat(Math.max(0, weightedLeavesTaken - rawAbsences).toFixed(2));
  const weekendPenaltyAmount = parseFloat((extraWeekendPenaltyDays * R_day).toFixed(2));

  // Simple mode (no late/early penalties)
  const A_deducted_simple = Math.min(pendingAdvancesAmt, Math.max(0, earnedGross));
  const S_net_simple = parseFloat((earnedGross - A_deducted_simple).toFixed(2));

  // Strict mode (with late/early penalties)
  const totalPenalties = latePenaltiesTotal + earlyPenaltiesTotal;
  const S_earned_strict = parseFloat((earnedGross - totalPenalties).toFixed(2));
  const A_deducted_strict = Math.min(pendingAdvancesAmt, Math.max(0, S_earned_strict));
  const S_net_strict = parseFloat((S_earned_strict - A_deducted_strict).toFixed(2));

  return {
    dailyWage: R_day,
    workedGross,
    freeLeavesUsed,
    freeLeaveAmount,
    unusedFreeLeaves,
    unusedLeaveAmount,
    potentialUnusedLeaveAmount,
    showUnusedLeavePay,
    extraWeekendPenaltyDays,
    weekendPenaltyAmount,
    rawAbsences,
    earnedTillNow: earnedGross,
    paidDays,
    freeLeaves,
    isMonthCompleted,
    unexcusedAbsences,
    penaltyAbsence,
    weightedLeavesTaken,
    simple: {
      earnedSalary: parseFloat(earnedGross.toFixed(2)),
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
 * Calculates complete monthly payroll metrics for a staff member.
 * Free leaves are now earned weekly: 1 per week when employee works >= 6 days that week.
 */
export async function calculateStaffPayroll(
  staffId: string,
  monthYear: string
): Promise<PayrollDetails> {
  const [year, month] = monthYear.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const D_total = new Date(year, month, 0).getDate();

  let occasionDays: Array<{ date: Date; name: string; multiplier: number }> = [];
  try {
    occasionDays = await prisma.occasionDay.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });
  } catch {
    occasionDays = [];
  }

  const occasionMap = new Map<string, { name: string; multiplier: number }>();
  occasionDays.forEach(occ => {
    const dStr = occ.date.toISOString().split('T')[0];
    occasionMap.set(dStr, { name: occ.name, multiplier: occ.multiplier || 1.5 });
  });

  const staff = await prisma.staffProfile.findUnique({
    where: { id: staffId },
    include: {
      slot: { include: { outlet: true } },
      attendances: { where: { shiftDate: { gte: startDate, lte: endDate } } },
      leaves: { where: { date: { gte: startDate, lte: endDate } } },
      advances: { where: { status: 'PENDING', isActive: true } }
    }
  });

  if (!staff) throw new Error(`Staff profile with ID ${staffId} not found`);

  const S_base = staff.monthlySalary;
  const R_day = S_base / D_total;
  const A_pending = staff.advances.reduce((acc, curr) => acc + curr.amount, 0);
  const D_present = Math.min(staff.attendances.length, D_total);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const advanceDetails: AdvanceDetail[] = staff.advances.map(adv => {
    const advDate = adv.date || adv.createdAt;
    const d = new Date(advDate);
    const day = d.getUTCDate();
    const mon = monthNames[d.getUTCMonth()];
    const yr = d.getUTCFullYear();
    return {
      id: adv.id,
      amount: adv.amount,
      date: d.toISOString().split('T')[0],
      formattedDate: `${day} ${mon} ${yr}`
    };
  });

  const shiftStartTime = staff.slot?.outlet?.shiftStartTime || '12:00';
  const shiftEndTime = staff.slot?.outlet?.shiftEndTime || '00:00';
  const [expStartH, expStartM] = shiftStartTime.split(':').map(Number);
  const expectedStartMin = (expStartH || 0) * 60 + (expStartM || 0);
  const [expEndH, expEndM] = shiftEndTime.split(':').map(Number);
  const expectedEndMin = (expEndH || 0) * 60 + (expEndM || 0);

  const startH12 = (expStartH || 0) % 12 || 12;
  const startMStr = ((expStartM || 0) > 0 ? `:${(expStartM || 0).toString().padStart(2, '0')}` : '');
  const startAmPm = (expStartH || 0) >= 12 ? 'PM' : 'AM';
  const endH12 = (expEndH || 0) % 12 || 12;
  const endMStr = ((expEndM || 0) > 0 ? `:${(expEndM || 0).toString().padStart(2, '0')}` : '');
  const endAmPm = (expEndH || 0) >= 12 ? 'PM' : 'AM';
  const shiftHours = `${startH12}${startMStr} ${startAmPm} – ${endH12}${endMStr} ${endAmPm}`;

  let penaltyLate = 0;
  let penaltyEarly = 0;
  const lateDetails: PayrollDetails['lateDetails'] = [];
  const earlyDetails: PayrollDetails['earlyDetails'] = [];

  staff.attendances.forEach(att => {
    if (!att.startTime) return;
    const dateLabel = att.shiftDate.toISOString().split('T')[0];

    if (!att.endTime) {
      penaltyEarly += 0.50 * R_day;
      earlyDetails.push({ date: dateLabel, checkOut: "MISSED", earlyMins: 0, penalty: parseFloat((0.50 * R_day).toFixed(2)) });
    }

    const actualStartMin = getISTMinutesSinceMidnight(att.startTime);
    if (actualStartMin > expectedStartMin) {
      const delayMins = actualStartMin - expectedStartMin;
      let penalty = 0;
      if (delayMins > 15 && delayMins <= 60) penalty = 0.15 * R_day;
      else if (delayMins > 60) penalty = 0.50 * R_day;
      if (penalty > 0) {
        penaltyLate += penalty;
        lateDetails.push({ date: dateLabel, checkIn: formatISTTime(att.startTime), delayMins, penalty: parseFloat(penalty.toFixed(2)) });
      }
    }

    if (att.endTime) {
      const actualEndMin = getISTMinutesSinceMidnight(att.endTime);
      if (actualEndMin < expectedEndMin) {
        const earlyMins = expectedEndMin - actualEndMin;
        let penalty = 0;
        if (earlyMins > 10 && earlyMins <= 45) penalty = 0.15 * R_day;
        else if (earlyMins > 45) penalty = 0.50 * R_day;
        if (penalty > 0) {
          penaltyEarly += penalty;
          earlyDetails.push({ date: dateLabel, checkOut: formatISTTime(att.endTime), earlyMins, penalty: parseFloat(penalty.toFixed(2)) });
        }
      }
    }
  });

  // daysElapsed calculation (IST-aware)
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const curYear = istTime.getUTCFullYear();
  const curMonth = istTime.getUTCMonth() + 1;
  const curDate = istTime.getUTCDate();
  const currentIstMin = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();

  const isCurrentMonth = (year === curYear && month === curMonth);
  const isPastMonth = (year < curYear || (year === curYear && month < curMonth));
  const isLastDay = isCurrentMonth && (curDate === D_total);

  const attendedDates = new Set(
    staff.attendances.map(a => a.shiftDate.toISOString().split('T')[0])
  );
  const todayStr = istTime.toISOString().split('T')[0];
  const hasAttendedToday = attendedDates.has(todayStr);

  let isTodayShiftStarted = false;
  let isTodayShiftEnded = false;

  if (isCurrentMonth) {
    isTodayShiftStarted = currentIstMin >= expectedStartMin || hasAttendedToday;
    if (expectedEndMin <= expectedStartMin) {
      // Midnight or overnight shift (e.g. 12:00 PM to 12:00 AM midnight)
      // Remains active throughout the calendar day
      isTodayShiftEnded = false;
    } else {
      isTodayShiftEnded = currentIstMin >= expectedEndMin;
    }
  }

  // Today shift status
  const todayShiftStatus: TodayShiftStatus = {
    isToday: isCurrentMonth,
    isLastDay,
    shiftStarted: isTodayShiftStarted,
    shiftEnded: isTodayShiftEnded,
    shiftHours,
    canTakeLeave: isLastDay && !hasAttendedToday
  };

  // Rule: show unused leave pay amount when last day of shift starts, only show on last day (or past month)
  let showUnusedLeavePay = false;
  if (isPastMonth) {
    showUnusedLeavePay = true;
  } else if (isLastDay) {
    showUnusedLeavePay = isTodayShiftStarted;
  }

  // Determine completed days for absence calculation:
  // If today's shift has ended or staff clocked in, include today in daysElapsed.
  // If today's shift has NOT ended yet and staff hasn't clocked in, elapsed completed days is curDate - 1.
  let daysElapsed = D_total;
  if (isCurrentMonth) {
    if (isTodayShiftEnded || hasAttendedToday) {
      daysElapsed = Math.min(D_total, curDate);
    } else {
      daysElapsed = Math.min(D_total, Math.max(0, curDate - 1));
    }
  } else if (year > curYear || (year === curYear && month > curMonth)) {
    daysElapsed = 0;
  }

  // ─── Weekly Free Leave Rule ───────────────────────────────────────────────
  const { freeLeaves: earnedFreeLeaves, weeklyBreakdown: weeklyFreeLeaveBreakdown } =
    calculateWeeklyFreeLeaves(year, month, daysElapsed, attendedDates);

  // ─── Day-by-Day Absence & 1.5x Weight Analysis ───────────────────────────
  let rawAbsentDays = 0;
  let weightedLeavesTaken = 0;
  let absentSaturdays = 0;
  let absentSundays = 0;
  let normalAbsences = 0;
  const occasionAbsencesList: Array<{ date: string; name: string }> = [];
  const absentBreakdown: AbsentDayDetail[] = [];

  for (let day = 1; day <= daysElapsed; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dow = d.getUTCDay();
    const dateStr = d.toISOString().split('T')[0];

    if (!attendedDates.has(dateStr)) {
      rawAbsentDays++;
      const isOccasion = occasionMap.has(dateStr);
      const occasionInfo = occasionMap.get(dateStr);

      let weight = 1.0;
      let reason: AbsentDayDetail['reason'] = 'NORMAL';

      if (dow === 6) { weight = 1.5; reason = 'SATURDAY'; absentSaturdays++; }
      else if (dow === 0) { weight = 1.5; reason = 'SUNDAY'; absentSundays++; }
      else if (isOccasion) {
        weight = occasionInfo?.multiplier || 1.5;
        reason = 'OCCASION';
        occasionAbsencesList.push({ date: dateStr, name: occasionInfo?.name || 'Occasion Day' });
      } else {
        normalAbsences++;
      }

      if ((dow === 6 || dow === 0) && isOccasion) {
        occasionAbsencesList.push({ date: dateStr, name: `${DAY_NAMES[dow]} + ${occasionInfo?.name}` });
      }

      weightedLeavesTaken += weight;
      absentBreakdown.push({ date: dateStr, dayOfWeek: dow, dayName: DAY_NAMES[dow], weight, reason, occasionName: occasionInfo?.name });
    }
  }

  const metrics = calculateSalaryMetrics(
    S_base, D_total, D_present,
    weightedLeavesTaken, A_pending,
    penaltyLate, penaltyEarly,
    daysElapsed,
    absentSaturdays + absentSundays + occasionAbsencesList.length,
    earnedFreeLeaves,
    showUnusedLeavePay
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
    unusedFreeLeaves: metrics.unusedFreeLeaves,
    unusedLeaveAmount: metrics.unusedLeaveAmount,
    potentialUnusedLeaveAmount: metrics.potentialUnusedLeaveAmount,
    showUnusedLeavePay: metrics.showUnusedLeavePay,
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
    advanceDetails,
    todayShiftStatus,
    normalAbsences,
    weekendAbsences: { saturdays: absentSaturdays, sundays: absentSundays, total: absentSaturdays + absentSundays },
    occasionAbsences: { count: occasionAbsencesList.length, dates: occasionAbsencesList },
    absentBreakdown,
    weeklyFreeLeaveBreakdown,
    simple: metrics.simple,
    strict: metrics.strict,
    lateDetails,
    earlyDetails
  };
}
