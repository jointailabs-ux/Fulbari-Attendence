"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const GRAD_PALETTES = [
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#fb923c", "#fcd34d"],
  ["#10b981", "#06b6d4"],
  ["#f43f5e", "#fb7185"],
  ["#a855f7", "#6366f1"],
];

function Avatar({ name, index }: { name: string; index: number }) {
  const [c1, c2] = GRAD_PALETTES[index % GRAD_PALETTES.length];
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.95rem", color: "white", boxShadow: `0 4px 10px ${c1}40` }}>
      {initials}
    </div>
  );
}

// ─── Audit Trail Modal ────────────────────────────────────────────────────────
function AuditModal({ r, pfEnabled, onClose }: { r: any; pfEnabled: boolean; onClose: () => void }) {
  const totalDays = r.metrics.totalDaysInMonth;
  const daysElapsed = r.metrics.daysElapsed ?? totalDays;
  const isMonthCompleted = r.metrics.isMonthCompleted ?? (daysElapsed >= totalDays);
  const dailyWage = parseFloat(r.metrics.dailyWage.toFixed(2));
  const daysPresent = r.metrics.daysPresent;
  const freeLeaves = r.metrics.freeLeaves ?? 4;
  const paidDays = r.metrics.paidDays ?? (isMonthCompleted ? (daysPresent > 0 ? daysPresent + freeLeaves : 0) : daysPresent);
  const absentDays = Math.max(0, daysElapsed - daysPresent);
  const unpaidAbsences = r.metrics.unexcusedAbsences !== undefined
    ? r.metrics.unexcusedAbsences
    : Math.max(0, absentDays - freeLeaves);
  const earnedGross = parseFloat(r.simpleRaw ?? (dailyWage * paidDays).toFixed(2));
  const advanceDebt = parseFloat(r.totalAdvance);
  const advanceDeducted = parseFloat(r.simpleAdvanceDeducted);
  const remainingAdvance = parseFloat((advanceDebt - advanceDeducted).toFixed(2));
  const pf = pfEnabled ? parseFloat(r.simplePf) : 0;
  const netPayable = parseFloat(r.simpleFinal);

  const auditSteps = [
    {
      icon: "💼", label: "Monthly Base Salary", value: `₹${r.monthlySalary.toLocaleString("en-IN")}`,
      note: `Fixed package (${totalDays} calendar days)`, color: "#10b981", sign: null,
    },
    {
      icon: "📅", label: daysElapsed < totalDays ? "Days Elapsed (Cycle)" : "Total Days in Month",
      value: daysElapsed < totalDays ? `${daysElapsed} / ${totalDays} days` : `${totalDays} days`,
      note: daysElapsed < totalDays ? `Current progress as of day ${daysElapsed} of ${totalDays}` : "Calendar days for this cycle",
      color: "#06b6d4", sign: null,
    },
    {
      icon: "⚡", label: "Daily Wage Rate", value: `₹${dailyWage}`,
      note: `₹${r.monthlySalary} ÷ ${totalDays} days`, color: "#a78bfa", sign: null,
    },
    {
      icon: "✅", label: "Days Worked (Present)", value: `${daysPresent} days`,
      note: "Number of shifts clocked in so far", color: "#10b981", sign: "+",
    },
    {
      icon: "🏖️", label: "Absent Days", value: `${absentDays} days`,
      note: daysElapsed < totalDays ? `${daysElapsed} elapsed − ${daysPresent} worked` : `${totalDays} total − ${daysPresent} worked`,
      color: "#94a3b8", sign: null,
    },
    {
      icon: "📅", label: "Weekend Absences", value: `${r.weekendAbsences?.saturdays || 0} Sat, ${r.weekendAbsences?.sundays || 0} Sun`,
      note: "Included in total absent days so far", color: "#fb923c", sign: null,
    },
    {
      icon: "🎁", label: "Free Leave Allowance", value: `${freeLeaves} days`,
      note: `${freeLeaves} paid leaves allowed per month (${absentDays} leaves used so far)`, color: "#34d399", sign: null,
    },
    {
      icon: "🚨", label: "Unpaid Absences", value: `${unpaidAbsences} day${unpaidAbsences !== 1 ? "s" : ""}`,
      note: unpaidAbsences > 0 ? `${absentDays} absent − ${freeLeaves} free = ${unpaidAbsences} unpaid` : "Within free leave limit — no deduction penalty",
      color: unpaidAbsences > 0 ? "#fb7185" : "#94a3b8", sign: unpaidAbsences > 0 ? "−" : null,
    },
    ...(isMonthCompleted ? [{
      icon: "📊", label: "Total Paid Days (Month-End)", value: `${paidDays} days`,
      note: `${daysPresent} worked + ${freeLeaves} paid leave bonus = ${paidDays} paid days`,
      color: "#38bdf8", sign: "=",
    }] : []),
    {
      icon: "💰", label: "Gross Earned Salary", value: `₹${earnedGross.toLocaleString("en-IN")}`,
      note: isMonthCompleted
        ? `₹${dailyWage} × ${paidDays} paid days (including leave bonus)`
        : `₹${dailyWage} × ${daysPresent} days worked to date`,
      color: "#34d399", sign: "=",
    },
    ...(pf > 0 ? [{
      icon: "🏛️", label: "PF Deduction (12%)", value: `-₹${pf.toFixed(2)}`,
      note: "Employee Provident Fund contribution", color: "#fb923c", sign: "−",
    }] : []),
    ...(advanceDebt > 0 ? [
      {
        icon: "📋", label: "Outstanding Advance Debt", value: `₹${advanceDebt.toLocaleString("en-IN")}`,
        note: "Total salary advances taken (pending repayment)", color: "#fb923c", sign: null,
      },
      {
        icon: "💳", label: "Advance Recovered This Month", value: `-₹${advanceDeducted.toLocaleString("en-IN")}`,
        note: advanceDeducted >= advanceDebt
          ? "Full advance recovered ✓"
          : `₹${remainingAdvance.toLocaleString("en-IN")} will carry forward to next month`,
        color: "#fb7185", sign: "−",
      },
    ] : []),
    {
      icon: "🎯", label: "Net Salary Payable", value: `₹${netPayable.toLocaleString("en-IN")}`,
      note: "Final amount to be disbursed to staff", color: "#10b981", sign: "=",
    },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "rgba(9,9,18,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", width: "100%", maxWidth: "480px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", animation: "popIn 0.28s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "1.4rem 1.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>🧾</div>
              <div>
                <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Salary Audit Trail</p>
                <h3 style={{ fontSize: "1rem", fontWeight: 900, margin: 0 }}>{r.name}</h3>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "var(--text-muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "7px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.6rem 0 0 0" }}>
            📅 Step-by-step calculation for {r.month}
          </p>
        </div>

        {/* Steps */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem 0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {auditSteps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 0.9rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${step.color}18`, borderRadius: "12px", position: "relative" }}>
                {/* Sign badge */}
                {step.sign && (
                  <div style={{ position: "absolute", left: "-10px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", borderRadius: "50%", background: step.sign === "+" ? "rgba(16,185,129,0.9)" : step.sign === "−" ? "rgba(244,63,94,0.9)" : "rgba(6,182,212,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 900, color: "#fff", flexShrink: 0, zIndex: 1 }}>
                    {step.sign}
                  </div>
                )}
                <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "0.05rem" }}>{step.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{step.label}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 900, color: step.color, fontFamily: "monospace", whiteSpace: "nowrap" }}>{step.value}</span>
                  </div>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>{step.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Advance warning callout */}
          {advanceDebt > 0 && remainingAdvance > 0 && (
            <div style={{ margin: "0.75rem 0", padding: "0.85rem 1rem", background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: "12px" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fb923c", margin: "0 0 0.25rem 0" }}>⚠️ Advance Carry-Forward Notice</p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                This month's earned salary (<strong style={{ color: "#fff" }}>₹{earnedGross.toLocaleString("en-IN")}</strong>) fully covers the advance repayment of <strong style={{ color: "#fb923c" }}>₹{advanceDeducted.toLocaleString("en-IN")}</strong>. The remaining debt of <strong style={{ color: "#fb7185" }}>₹{remainingAdvance.toLocaleString("en-IN")}</strong> will be recovered from next month's salary.
              </p>
            </div>
          )}

          {advanceDebt > 0 && remainingAdvance <= 0 && (
            <div style={{ margin: "0.75rem 0", padding: "0.85rem 1rem", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", margin: 0 }}>✅ Advance fully recovered this month — no carry-forward.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.85rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <Link href={`/admin/staff/${r.staffId}`} style={{ flex: 1, textAlign: "center", padding: "0.65rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", transition: "all 0.2s" }}>
            👤 Full Profile →
          </Link>
          <button onClick={onClose} style={{ flex: 1, padding: "0.65rem", background: "linear-gradient(135deg, #10b981, #06b6d4)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Timeline Modal (matches dashboard design) ───────────────────────
interface BreakLog { id: string; startTime: string; endTime: string | null; }
interface ActivityStaff {
  id: string; name: string; state: string;
  startTime: string | null; endTime: string | null;
  breaks: BreakLog[]; breakTimeStr?: string;
}

const EV_STYLE: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  SHIFT_START: { dot: "#10b981", bg: "rgba(16,185,129,0.13)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
  BREAK_START: { dot: "#f59e0b", bg: "rgba(245,158,11,0.13)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  BREAK_END:   { dot: "#06b6d4", bg: "rgba(6,182,212,0.13)",  text: "#67e8f9", border: "rgba(6,182,212,0.25)"  },
  SHIFT_END:   { dot: "#f43f5e", bg: "rgba(244,63,94,0.13)",  text: "#fb7185", border: "rgba(244,63,94,0.25)"  },
};

function ActivityModal({ staffId, staffName, month, onClose }: { staffId: string; staffName: string; month: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<any[]>([]); // [{date, activity}]

  useEffect(() => {
    const fetchMonth = async () => {
      try {
        const res = await fetch(`/api/v1/staff/${staffId}/attendance?month=${month}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json(); // { "YYYY-MM-DD": { startTime, endTime, breaks, status, workHours, breakDurationMs } }
        const parsed = Object.entries(data)
          .filter(([, v]: any) => v.startTime)
          .map(([date, v]: any) => ({ date, ...v }))
          .sort((a: any, b: any) => a.date.localeCompare(b.date));
        setDays(parsed);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchMonth();
  }, [staffId, month]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(day)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "rgba(9,9,18,0.98)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px", width: "100%", maxWidth: "440px", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", animation: "popIn 0.28s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "1.3rem 1.4rem 0.9rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #06b6d4, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>📋</div>
              <div>
                <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Monthly Activity</p>
                <h3 style={{ fontSize: "1rem", fontWeight: 900, margin: 0 }}>{staffName}</h3>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "var(--text-muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "7px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.6rem 0 0 0" }}>📅 {month} — Shift logs with break details</p>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.25rem 1.4rem 0.75rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
              <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.85rem" }}>Loading activity...</p>
            </div>
          ) : days.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍃</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No shifts recorded for this month.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {days.map((day: any) => {
                // Build mini timeline for this day
                type TLEv = { type: string; time: string; label: string };
                const evs: TLEv[] = [];
                if (day.startTime) evs.push({ type: "SHIFT_START", time: day.startTime, label: "Shift In" });
                (day.breaks || []).forEach((b: any, i: number) => {
                  evs.push({ type: "BREAK_START", time: b.startTime, label: `Break ${i + 1}` });
                  if (b.endTime) evs.push({ type: "BREAK_END", time: b.endTime, label: `Resumed` });
                });
                if (day.endTime) evs.push({ type: "SHIFT_END", time: day.endTime, label: "Shift Out" });
                evs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

                const workHrs = parseFloat(day.workHours || "0");
                const breakMins = day.breakDurationMs ? Math.round(day.breakDurationMs / 60000) : 0;

                return (
                  <div key={day.date} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "0.85rem 1rem", overflow: "hidden" }}>
                    {/* Date row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fff" }}>{fmtDate(day.date)}</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "0.15rem 0.5rem", borderRadius: "6px" }}>
                          {workHrs.toFixed(2)} hrs
                        </span>
                        {breakMins > 0 && (
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", padding: "0.15rem 0.5rem", borderRadius: "6px" }}>
                            {breakMins < 60 ? `${breakMins}m brk` : `${Math.floor(breakMins/60)}h ${breakMins%60}m brk`}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Mini timeline */}
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      {evs.map((ev, i) => {
                        const s = EV_STYLE[ev.type] || EV_STYLE.SHIFT_START;
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "8px", padding: "0.25rem 0.5rem" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: s.text }}>{ev.label}</span>
                            <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{fmtTime(ev.time)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.85rem 1.4rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <Link href={`/admin/staff/${staffId}`} style={{ flex: 1, textAlign: "center", padding: "0.65rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", transition: "all 0.2s" }}>
            👤 Full Profile →
          </Link>
          <button onClick={onClose} style={{ flex: 1, padding: "0.65rem", background: "linear-gradient(135deg, #06b6d4, #3b82f6)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollCalculationPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [results, setResults] = useState<any[]>([]);
  const [releasedRecords, setReleasedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, "strict" | "simple">>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [pfEnabled, setPfEnabled] = useState(false);
  const [auditModal, setAuditModal] = useState<any | null>(null);
  const [activityModal, setActivityModal] = useState<{ id: string; name: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [calcRes, releaseRes] = await Promise.all([
        fetch(`/api/v1/payroll/calculate?month=${month}&pf=${pfEnabled}`),
        fetch(`/api/v1/payroll/release?month=${month}`),
      ]);
      const calcData = await calcRes.json();
      const releaseData = await releaseRes.json();
      setResults(calcData);
      setReleasedRecords(releaseData);
      const init: Record<string, "strict" | "simple"> = {};
      calcData.forEach((r: any) => { init[r.staffId] = "simple"; });
      setSelections(init);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month, pfEnabled]);

  const handleRelease = async (r: any) => {
    const mode = selections[r.staffId];
    const finalPayable = mode === "strict" ? r.strictFinal : r.simpleFinal;
    const finalAdv = mode === "strict" ? r.strictAdvanceDeducted : r.simpleAdvanceDeducted;
    if (!confirm(`Release ₹${finalPayable} to ${r.name} for ${month}?`)) return;
    try {
      const res = await fetch("/api/v1/payroll/release", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: r.staffId, monthYear: month, strictSalary: r.strictRaw, simpleSalary: r.simpleRaw, selectedMode: mode.toUpperCase(), finalPayable: parseFloat(finalPayable), advancesDeducted: parseFloat(finalAdv) }),
      });
      if (res.ok) { alert("Salary released successfully!"); fetchData(); }
      else { const err = await res.json(); alert(err.error || "Failed to release salary"); }
    } catch { alert("Network error"); }
  };

  const totalReleased = releasedRecords.reduce((acc, c) => acc + c.finalPayable, 0);
  const pendingDrafts = results
    .filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId))
    .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const pendingCount = results.filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId)).length;

  return (
    <>
      <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>Financial Hub</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Monthly payroll generation and disbursement.</p>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid-auto">
          {/* Total Released */}
          <div className="glass" style={{ position: "relative", overflow: "hidden", borderRadius: "18px", background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Salary Expense</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <h3 style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "var(--font-heading)", background: "linear-gradient(to right, #10b981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₹{totalReleased.toLocaleString("en-IN")}</h3>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>From {releasedRecords.length} completed payouts ({month})</div>
          </div>

          {/* Pending */}
          <div className="glass" style={{ position: "relative", overflow: "hidden", borderRadius: "18px", background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #fb923c, #fcd34d)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pending Payouts</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
              </div>
            </div>
            <h3 style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "var(--font-heading)", background: "linear-gradient(to right, #fb923c, #fcd34d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{pendingCount}</h3>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Awaiting authorization ({month})</div>
          </div>

          {/* Month picker */}
          <div className="glass" style={{ position: "relative", overflow: "hidden", borderRadius: "18px", background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem", justifyContent: "space-between" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.25rem" }}>Select Cycle</span>
            <input type="month" className="input-modern" style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", marginTop: "0.2rem" }} value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          {/* PF toggle */}
          <div className="glass" style={{ position: "relative", overflow: "hidden", borderRadius: "18px", background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem", justifyContent: "space-between" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #f43f5e, #fb7185)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.25rem" }}>PF Deduction (12%)</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
              <button onClick={() => setPfEnabled(!pfEnabled)} style={{ width: "48px", height: "26px", borderRadius: "13px", background: pfEnabled ? "#ff6b00" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: pfEnabled ? "25px" : "3px", transition: "all 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
              </button>
              <span style={{ fontSize: "0.85rem", fontWeight: 750, color: pfEnabled ? "#ff6b00" : "var(--text-muted)" }}>{pfEnabled ? "ENABLED" : "DISABLED"}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: "100%", maxWidth: "450px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="input-modern" placeholder="Search personnel by name…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "2.3rem", paddingTop: "0.55rem", paddingBottom: "0.55rem", fontSize: "0.85rem" }} />
        </div>

        {/* Draft Payroll Matrix */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>Draft Payroll Matrix</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Review calculations and release payouts.</p>
            </div>
            <button className="btn-modern btn-secondary" onClick={fetchData} disabled={loading} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              {loading ? "Processing..." : "Recalculate"}
            </button>
          </div>

          {pendingDrafts.length === 0 ? (
            <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎯</div>
              <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                {searchQuery ? `No drafts matching "${searchQuery}"` : `All payouts released for ${month}!`}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {pendingDrafts.map((r: any, idx: number) => {
                const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
                const totalDays = r.metrics.totalDaysInMonth;
                const daysElapsed = r.metrics.daysElapsed ?? totalDays;
                const isMonthCompleted = r.metrics.isMonthCompleted ?? (daysElapsed >= totalDays);
                const dailyWage = parseFloat(r.metrics.dailyWage.toFixed(2));
                const daysPresent = r.metrics.daysPresent;
                const freeLeaves = r.metrics.freeLeaves ?? 4;
                const paidDays = r.metrics.paidDays ?? (isMonthCompleted ? (daysPresent > 0 ? daysPresent + freeLeaves : 0) : daysPresent);
                const absentDays = Math.max(0, daysElapsed - daysPresent);
                const unpaidAbsences = r.metrics.unexcusedAbsences !== undefined
                  ? r.metrics.unexcusedAbsences
                  : Math.max(0, absentDays - freeLeaves);
                const earnedGross = parseFloat(r.simpleRaw ?? (dailyWage * paidDays).toFixed(2));
                const advanceDebt = parseFloat(r.totalAdvance);
                const advanceDeducted = parseFloat(r.simpleAdvanceDeducted);
                const netToPay = parseFloat(r.simpleFinal);

                return (
                  <div key={r.staffId}
                    style={{ borderRadius: "18px", overflow: "hidden", background: "rgba(12,12,18,0.75)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "1rem", position: "relative", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 25px ${c1}12, 0 4px 15px rgba(0,0,0,0.4)`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                    {/* Header Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Avatar name={r.name} index={idx} />
                        <div>
                          <p style={{ fontWeight: 800, fontSize: "1rem" }}>{r.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {r.slotName || "Standard Slot"} &nbsp;•&nbsp; ₹{r.monthlySalary.toLocaleString("en-IN")}/mo
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {r.warnings.highAdvance && <span style={{ fontSize: "0.65rem", color: "#fb7185", background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", padding: "0.2rem 0.55rem", borderRadius: "6px", fontWeight: 800 }}>⚠️ HIGH ADVANCE</span>}
                        {r.warnings.lowWork && <span style={{ fontSize: "0.65rem", color: "#fb923c", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)", padding: "0.2rem 0.55rem", borderRadius: "6px", fontWeight: 800 }}>⚠️ NO SHIFTS</span>}
                      </div>
                    </div>

                    {/* Salary Breakdown Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.6rem", background: "rgba(0,0,0,0.15)", padding: "1rem", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <div>
                        <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Base Salary</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>₹{r.monthlySalary.toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Daily Wage</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>₹{dailyWage}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Days Worked</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#10b981" }}>{daysPresent} / {totalDays}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Absent Days</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: absentDays > freeLeaves ? "#fb923c" : "var(--text-muted)" }}>{absentDays} days</span>
                        <div style={{ fontSize: "0.55rem", color: "#fb923c", marginTop: "0.15rem", fontWeight: 700 }}>
                           ({r.weekendAbsences?.saturdays || 0} Sat, {r.weekendAbsences?.sundays || 0} Sun)
                        </div>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.58rem", color: "#34d399", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Gross Earned</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#34d399" }}>₹{earnedGross.toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Unpaid Absences
                          <span style={{ color: "#10b981", marginLeft: "0.3rem" }}>({freeLeaves} free)</span>
                        </span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: unpaidAbsences > 0 ? "#fb7185" : "var(--text-muted)" }}>
                          {unpaidAbsences} day{unpaidAbsences !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Advance / Net Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", padding: "0.65rem 0.85rem", background: "rgba(0,0,0,0.12)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      {/* Advance info */}
                      {advanceDebt > 0 ? (
                        <div style={{ display: "flex", gap: "1.25rem", flex: 1, flexWrap: "wrap" }}>
                          <div>
                            <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Advance Debt</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fb923c" }}>₹{advanceDebt.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Recovered Now</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fb7185" }}>−₹{advanceDeducted.toLocaleString("en-IN")}</span>
                          </div>
                          {advanceDebt > advanceDeducted && (
                            <div>
                              <span style={{ display: "block", fontSize: "0.6rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Carry-Forward</span>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f59e0b" }}>₹{(advanceDebt - advanceDeducted).toFixed(2)}</span>
                            </div>
                          )}
                          {pfEnabled && (
                            <div>
                              <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PF (12%)</span>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fb7185" }}>−₹{r.simplePf}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ flex: 1 }}>
                          {pfEnabled && (
                            <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PF (12%)</span>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fb7185" }}>−₹{r.simplePf}</span>
                            </div>
                          )}
                          {!pfEnabled && <span style={{ fontSize: "0.75rem", color: "rgba(16,185,129,0.6)", fontWeight: 600 }}>✓ No advance debt</span>}
                        </div>
                      )}

                      {/* Net + actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto" }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Net Payable</span>
                          <span style={{ fontSize: "1.5rem", fontWeight: 900, color: netToPay > 0 ? "#10b981" : "#fb7185", fontFamily: "monospace" }}>₹{netToPay.toLocaleString("en-IN")}</span>
                        </div>
                        <button className="btn-modern btn-primary" onClick={() => handleRelease(r)} style={{ padding: "0.65rem 1.4rem", fontSize: "0.82rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                          Release →
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {/* Audit Trail */}
                      <button
                        type="button"
                        onClick={() => setAuditModal(r)}
                        style={{ flex: 1, padding: "0.5rem 0.6rem", background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.28), rgba(6,182,212,0.28))"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))"; }}
                      >🧾 Salary Audit Trail</button>

                      {/* Activity */}
                      <button
                        type="button"
                        onClick={() => setActivityModal({ id: r.staffId, name: r.name })}
                        style={{ flex: 1, padding: "0.5rem 0.6rem", background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(6,182,212,0.25)", borderRadius: "10px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#67e8f9", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.28), rgba(59,130,246,0.28))"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))"; }}
                      >📋 Monthly Activity</button>

                      {/* Profile */}
                      <Link href={`/admin/staff/${r.staffId}`}
                        style={{ flex: 1, padding: "0.5rem 0.6rem", background: `linear-gradient(135deg, ${c1}15, ${c2}15)`, border: `1px solid ${c1}22`, borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700, color: c1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}28, ${c2}28)`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}15, ${c2}15)`; }}
                      >👤 Profile</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Disbursement History */}
        {releasedRecords.filter(rec => rec.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
          <section>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>Disbursement History ({month})</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Finalized payouts and advance settlements.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {releasedRecords
                .filter(rec => rec.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((rec: any, idx: number) => {
                  const [c1] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
                  return (
                    <div key={rec.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", padding: "0.85rem 1.1rem", borderRadius: "14px", background: "rgba(16,185,129,0.02)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <Avatar name={rec.staff?.name || "Unknown"} index={idx} />
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <p style={{ fontWeight: 800, fontSize: "0.95rem" }}>{rec.staff?.name}</p>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Released: {new Date(rec.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.25rem" }}>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.15rem" }}>Mode</p>
                          <span style={{ padding: "0.15rem 0.5rem", background: "rgba(99,102,241,0.1)", color: "var(--brand-primary-light)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700 }}>{rec.selectedMode}</span>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.15rem" }}>Advance Settled</p>
                          <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--brand-secondary)" }}>−₹{rec.advancesDeducted.toLocaleString("en-IN")}</p>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.15rem" }}>Net Paid</p>
                          <p style={{ fontWeight: 900, fontSize: "1.2rem", color: "#10b981" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <Link href={`/admin/staff/${rec.staffId}`} style={{ padding: "0.4rem 0.75rem", background: `rgba(${c1},0.08)`, border: `1px solid ${c1}25`, borderRadius: "8px", color: c1, fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            👤 Profile
                          </Link>
                        </div>
                        <div style={{ textAlign: "right", minWidth: "70px" }}>
                          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.15rem" }}>Receipt</p>
                          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{rec.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        <style jsx global>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes popIn { from { opacity: 0; transform: scale(0.88) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        `}</style>
      </div>

      {/* Modals */}
      {auditModal && <AuditModal r={auditModal} pfEnabled={pfEnabled} onClose={() => setAuditModal(null)} />}
      {activityModal && <ActivityModal staffId={activityModal.id} staffName={activityModal.name} month={month} onClose={() => setActivityModal(null)} />}
    </>
  );
}
