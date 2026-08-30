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
  const dailyWage = parseFloat(r.metrics.dailyWage.toFixed(2));
  const daysPresent = r.metrics.daysPresent;
  const workedGross = parseFloat((r.metrics.workedGross ?? (daysPresent * dailyWage)).toFixed(2));
  const freeLeaves = r.metrics.freeLeaves ?? 0;
  const weeklyBreakdown: Array<{ weekLabel: string; daysWorked: number; daysInMonth: number; earned: boolean }> =
    r.weeklyFreeLeaveBreakdown ?? [];
  
  const rawAbsentDays = r.metrics.rawAbsences ?? (r.metrics.fullLeaves ?? Math.max(0, daysElapsed - daysPresent));
  const satCount = r.weekendAbsences?.saturdays || 0;
  const sunCount = r.weekendAbsences?.sundays || 0;
  const occCount = r.occasionAbsences?.count || 0;

  const weightedLeaves = parseFloat((r.metrics.weightedLeavesTaken ?? rawAbsentDays).toFixed(2));
  const normalAbsences = r.metrics.normalAbsences ?? Math.max(0, rawAbsentDays - (r.weekendAbsences?.total || 0) - (r.occasionAbsences?.count || 0));
  const unpaidAbsences = parseFloat((r.metrics.unexcusedAbsences !== undefined
    ? r.metrics.unexcusedAbsences
    : Math.max(0, weightedLeaves - freeLeaves)).toFixed(2));
  const absencePenaltyAmount = parseFloat((r.metrics.penaltyAbsence ?? (unpaidAbsences * dailyWage)).toFixed(2));
  
  const freeLeavesUsedCount = parseFloat(Math.min(freeLeaves, weightedLeaves).toFixed(2));
  const freeLeaveAmount = parseFloat((r.metrics.freeLeaveAmount ?? (freeLeavesUsedCount * dailyWage)).toFixed(2));
  const unusedFreeLeaves = r.unusedFreeLeaves ?? r.metrics?.unusedFreeLeaves ?? Math.max(0, freeLeaves - freeLeavesUsedCount);
  const unusedLeaveAmount = r.unusedLeaveAmount ?? r.metrics?.unusedLeaveAmount ?? 0;
  const potentialUnusedLeaveAmount = r.potentialUnusedLeaveAmount ?? r.metrics?.potentialUnusedLeaveAmount ?? parseFloat((unusedFreeLeaves * dailyWage).toFixed(2));
  const showUnusedLeavePay = r.showUnusedLeavePay ?? r.metrics?.showUnusedLeavePay ?? false;

  const earnedGross = parseFloat(r.simpleRaw ?? (r.metrics.earnedTillNow ?? (workedGross + freeLeaveAmount + unusedLeaveAmount - absencePenaltyAmount)).toFixed(2));
  const advanceDebt = parseFloat(r.totalAdvance);
  const advanceDeducted = parseFloat(r.simpleAdvanceDeducted);
  const remainingAdvance = parseFloat(Math.max(0, advanceDebt - advanceDeducted).toFixed(2));
  const pf = pfEnabled ? parseFloat(r.simplePf) : 0;
  const netPayable = parseFloat(r.simpleFinal);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "rgba(10,10,20,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", width: "100%", maxWidth: "540px", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.85)", animation: "popIn 0.28s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "1.25rem 1.4rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>🧾</div>
              <div>
                <p style={{ fontSize: "0.62rem", color: "#34d399", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Salary Audit & Calculation</p>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: 0, color: "#fff" }}>{r.name}</h3>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "var(--text-muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "8px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Quick Summary Pill Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem", marginTop: "0.9rem", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Days Worked</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#10b981" }}>{daysPresent} d</span>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Leave Bal</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#a78bfa" }}>{freeLeaves} / 4</span>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Gross</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: earnedGross >= 0 ? "#38bdf8" : "#fb7185" }}>
                {earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}
              </span>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "0.55rem", color: "#fb923c", fontWeight: 800, textTransform: "uppercase", display: "block" }}>To Pay</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: netPayable >= 0 ? "#34d399" : "#fb7185" }}>
                {netPayable < 0 ? "-" : ""}₹{Math.abs(netPayable).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Steps Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          
          {/* STAGE 1: Daily Wage Rate */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c084fc", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}>Daily Wage Calculation</span>
              </div>
              <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#a78bfa", fontFamily: "monospace" }}>₹{dailyWage} / day</span>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
              Monthly Base Salary <strong style={{ color: "#fff" }}>₹{r.monthlySalary.toLocaleString("en-IN")}</strong> ÷ <strong style={{ color: "#fff" }}>{totalDays} days</strong> in month = <strong style={{ color: "#a78bfa" }}>₹{dailyWage}</strong> per working day.
              {daysElapsed < totalDays && <span style={{ color: "#38bdf8", marginLeft: "0.3rem" }}>({daysElapsed} of {totalDays} days elapsed so far)</span>}
            </p>
          </div>

          {/* STAGE 2: Shift Pay (Days Worked) */}
          <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}>Shift Pay (Days Worked)</span>
              </div>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>+ ₹{workedGross.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ padding: "0.45rem 0.7rem", background: "rgba(0,0,0,0.25)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.15)", fontSize: "0.75rem", fontWeight: 700, color: "#34d399", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
              <span>{daysPresent} days worked × ₹{dailyWage}</span>
              <span>= ₹{workedGross.toLocaleString("en-IN")}</span>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.4 }}>
              Employee earns daily wage strictly for the days they actually clocked in ({daysPresent} shifts).
            </p>
          </div>

          {/* STAGE 3: Weekly Free Leave Balance Rule */}
          <div style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", color: "#c084fc", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}>Weekly Free Leave Balance</span>
              </div>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#c084fc", fontFamily: "monospace" }}>🎁 {freeLeaves} / 4 Earned</span>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0", lineHeight: 1.4 }}>
              Rule: Staff must work <strong style={{ color: "#fff" }}>at least 6 days in a week</strong> to earn 1 free paid leave for that week (max 4 per month).
            </p>
            
            {/* Week-by-Week Breakdown */}
            {weeklyBreakdown.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {weeklyBreakdown.map((w, wIdx) => (
                  <div key={wIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.6rem", background: w.earned ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${w.earned ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)"}`, borderRadius: "6px", fontSize: "0.7rem" }}>
                    <span style={{ color: w.earned ? "#34d399" : "var(--text-muted)" }}>
                      {w.weekLabel}: worked <strong>{w.daysWorked} / {w.daysInMonth} days</strong>
                    </span>
                    <span style={{ fontWeight: 800, color: w.earned ? "#10b981" : "#94a3b8" }}>
                      {w.earned ? "✅ +1 Leave Earned" : "❌ 0 Leave (worked < 6d)"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Total free leaves earned this cycle: <strong style={{ color: "#c084fc" }}>{freeLeaves} days</strong>
              </div>
            )}
          </div>

          {/* STAGE 4: Paid Leaves & Excess Absence Cut */}
          <div style={{ background: "rgba(6,182,212,0.03)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.4)", color: "#06b6d4", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}>Paid Leaves & Absence Adjustments</span>
              </div>
            </div>

            {/* Absence breakdown */}
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", padding: "0.3rem 0.55rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", marginBottom: "0.4rem", lineHeight: 1.5 }}>
              📋 <strong style={{ color: "#fff" }}>{rawAbsentDays} absent days</strong>:
              {normalAbsences > 0 && <span> {normalAbsences} normal (×1.0)</span>}
              {satCount > 0 && <span>, {satCount} Sat (×1.5)</span>}
              {sunCount > 0 && <span>, {sunCount} Sun (×1.5)</span>}
              {occCount > 0 && <span>, {occCount} occasion (×1.5)</span>}
              <strong style={{ color: "#a78bfa" }}> → {weightedLeaves}w total | {freeLeavesUsedCount}w covered by earned free leaves, {unpaidAbsences}w excess</strong>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {/* Row A: Paid Leave Pay (Added to pay for covered leaves) */}
              {freeLeavesUsedCount > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.35rem 0.55rem", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "6px" }}>
                  <div>
                    <span style={{ color: "#34d399", fontWeight: 800 }}>🎁 Paid Leave Pay</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({freeLeavesUsedCount}d covered under {freeLeaves} earned free leaves × ₹{dailyWage})</span>
                  </div>
                  <span style={{ fontWeight: 900, color: "#34d399", fontFamily: "monospace" }}>+ ₹{freeLeaveAmount.toLocaleString("en-IN")}</span>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "6px", color: "var(--text-muted)" }}>
                  <span>🎁 Paid Leave Pay (Covered Absences)</span>
                  <span style={{ fontWeight: 700 }}>₹0 (0 leaves taken)</span>
                </div>
              )}

              {/* Row B: Unused Earned Leave Pay */}
              {unusedLeaveAmount > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.35rem 0.55rem", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "6px" }}>
                  <div>
                    <span style={{ color: "#c084fc", fontWeight: 800 }}>🌟 Unused Earned Leave Pay</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({unusedFreeLeaves}d unused earned leave × ₹{dailyWage})</span>
                  </div>
                  <span style={{ fontWeight: 900, color: "#c084fc", fontFamily: "monospace" }}>+ ₹{unusedLeaveAmount.toLocaleString("en-IN")}</span>
                </div>
              ) : !showUnusedLeavePay && r.todayShiftStatus?.isLastDay ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", padding: "0.35rem 0.55rem", background: "rgba(168,85,247,0.04)", border: "1px dashed rgba(168,85,247,0.2)", borderRadius: "6px", color: "#c084fc" }}>
                  <span>🌟 Unused Leave Pay ({unusedFreeLeaves}d available = ₹{potentialUnusedLeaveAmount.toLocaleString("en-IN")})</span>
                  <span style={{ fontWeight: 700 }}>Activates once last day shift starts</span>
                </div>
              ) : null}

              {/* Row C: Excess Absence Cut */}
              {unpaidAbsences > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.35rem 0.55rem", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: "6px" }}>
                  <div>
                    <span style={{ color: "#fb7185", fontWeight: 800 }}>✂️ Excess Leave Cut</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({weightedLeaves}w − {freeLeavesUsedCount}w free = {unpaidAbsences}w excess × ₹{dailyWage})</span>
                  </div>
                  <span style={{ fontWeight: 900, color: "#fb7185", fontFamily: "monospace" }}>− ₹{absencePenaltyAmount.toLocaleString("en-IN")}</span>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.35rem 0.55rem", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: "6px", color: "#34d399" }}>
                  <span>✂️ Excess Leave Cut</span>
                  <span style={{ fontWeight: 700 }}>₹0 — all absences within {freeLeaves} earned free leaves</span>
                </div>
              )}
            </div>

            {/* Gross formula summary: Shift Pay + Paid Leave Pay + Unused Leave Pay - Excess Cut */}
            <div style={{ marginTop: "0.55rem", padding: "0.5rem 0.7rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "monospace", lineHeight: 1.6 }}>
              <div>Gross = Shift Pay {freeLeaveAmount > 0 ? "+ Paid Leave Pay " : ""}{unusedLeaveAmount > 0 ? "+ Unused Leave Pay " : ""}− Excess Leave Cut</div>
              <div style={{ color: "#fff", fontWeight: 700 }}>
                ₹{workedGross.toLocaleString("en-IN")} {freeLeaveAmount > 0 ? `+ ₹${freeLeaveAmount.toLocaleString("en-IN")}` : ""} {unusedLeaveAmount > 0 ? `+ ₹${unusedLeaveAmount.toLocaleString("en-IN")}` : ""} − ₹{absencePenaltyAmount.toLocaleString("en-IN")} = <span style={{ color: earnedGross >= 0 ? "#34d399" : "#fb7185", fontSize: "0.78rem" }}>{earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px dashed rgba(255,255,255,0.08)", marginTop: "0.4rem", fontSize: "0.78rem" }}>
              <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>👉 Gross Salary Earned:</span>
              <span style={{ fontWeight: 900, color: earnedGross >= 0 ? "#34d399" : "#fb7185", fontSize: "1rem", fontFamily: "monospace" }}>{earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* STAGE 5: Deductions & Net Payout */}
          <div style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(251,146,60,0.2)", border: "1px solid rgba(251,146,60,0.4)", color: "#fb923c", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>5</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}>Deductions & What Owner Pays</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", margin: "0.4rem 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <span>Gross Earned Salary</span>
                <span style={{ fontWeight: 800, color: earnedGross >= 0 ? "#fff" : "#fb7185", fontFamily: "monospace" }}>
                  {earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}
                </span>
              </div>

              {advanceDebt > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.72rem", color: "#fb7185" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>💳 Advance Repayment (Total Debt: ₹{advanceDebt.toLocaleString("en-IN")})</span>
                    <span style={{ fontWeight: 800, fontFamily: "monospace" }}>− ₹{advanceDeducted.toLocaleString("en-IN")}</span>
                  </div>
                  {r.advanceDetails && r.advanceDetails.length > 0 && (
                    <div style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.1rem", fontSize: "0.63rem", color: "#fdba74" }}>
                      {r.advanceDetails.map((adv: any, i: number) => (
                        <span key={adv.id || i}>• Taken on <strong>{adv.formattedDate}</strong>: ₹{adv.amount.toLocaleString("en-IN")}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pf > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#fb7185" }}>
                  <span>🏛️ PF Deduction (12%)</span>
                  <span style={{ fontWeight: 800, fontFamily: "monospace" }}>− ₹{pf.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Owner to pay row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <span style={{ fontSize: "0.68rem", color: "#fb923c", fontWeight: 800, textTransform: "uppercase" }}>Owner Has to Pay:</span>
                <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", display: "block" }}>Gross (₹{earnedGross.toLocaleString("en-IN")}) − Deductions</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: 900, color: netPayable >= 0 ? "#34d399" : "#fb7185", fontFamily: "monospace" }}>
                {netPayable < 0 ? "-" : ""}₹{Math.abs(netPayable).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "0.85rem 1.4rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <Link href={`/admin/staff/${r.staffId}`} style={{ flex: 1, textAlign: "center", padding: "0.65rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", transition: "all 0.2s" }}>
            👤 Full Profile →
          </Link>
          <button onClick={onClose} style={{ flex: 1, padding: "0.65rem", background: "linear-gradient(135deg, #10b981, #06b6d4)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem" }}>
            Done
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
                const workedGross = parseFloat((r.metrics.workedGross ?? (daysPresent * dailyWage)).toFixed(2));
                const freeLeaves = r.metrics.freeLeaves ?? 0;
                
                const rawAbsentDays = r.metrics.rawAbsences ?? (r.metrics.fullLeaves ?? Math.max(0, daysElapsed - daysPresent));
                const satCount = r.weekendAbsences?.saturdays || 0;
                const sunCount = r.weekendAbsences?.sundays || 0;
                const occCount = r.occasionAbsences?.count || 0;

                const weightedLeaves = parseFloat((r.metrics.weightedLeavesTaken ?? rawAbsentDays).toFixed(2));
                const normalAbsences = r.metrics.normalAbsences ?? Math.max(0, rawAbsentDays - (r.weekendAbsences?.total || 0) - (r.occasionAbsences?.count || 0));
                const unpaidAbsences = parseFloat((r.metrics.unexcusedAbsences !== undefined
                  ? r.metrics.unexcusedAbsences
                  : Math.max(0, weightedLeaves - freeLeaves)).toFixed(2));
                const absencePenaltyAmount = parseFloat((r.metrics.penaltyAbsence ?? (unpaidAbsences * dailyWage)).toFixed(2));
                const freeLeavesUsedCount = parseFloat(Math.min(freeLeaves, weightedLeaves).toFixed(2));
                const freeLeaveAmount = parseFloat((r.metrics.freeLeaveAmount ?? (freeLeavesUsedCount * dailyWage)).toFixed(2));
                const unusedFreeLeaves = r.unusedFreeLeaves ?? r.metrics?.unusedFreeLeaves ?? Math.max(0, freeLeaves - freeLeavesUsedCount);
                const unusedLeaveAmount = r.unusedLeaveAmount ?? r.metrics?.unusedLeaveAmount ?? 0;
                const potentialUnusedLeaveAmount = r.potentialUnusedLeaveAmount ?? r.metrics?.potentialUnusedLeaveAmount ?? parseFloat((unusedFreeLeaves * dailyWage).toFixed(2));
                const showUnusedLeavePay = r.showUnusedLeavePay ?? r.metrics?.showUnusedLeavePay ?? false;
                
                const earnedGross = parseFloat(r.simpleRaw ?? (r.metrics.earnedTillNow ?? (workedGross + freeLeaveAmount + unusedLeaveAmount - absencePenaltyAmount)).toFixed(2));
                const advanceDebt = parseFloat(r.totalAdvance);
                const advanceDeducted = parseFloat(r.simpleAdvanceDeducted);
                const remainingAdvance = parseFloat(Math.max(0, advanceDebt - advanceDeducted).toFixed(2));
                const netToPay = parseFloat(r.simpleFinal);

                return (
                  <div key={r.staffId}
                    style={{ borderRadius: "20px", overflow: "hidden", background: "rgba(12,12,22,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", padding: "1.35rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", position: "relative", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 30px ${c1}15, 0 4px 18px rgba(0,0,0,0.5)`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                    {/* Header Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Avatar name={r.name} index={idx} />
                        <div>
                          <p style={{ fontWeight: 900, fontSize: "1.05rem", margin: 0, color: "#fff" }}>{r.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>
                            {r.slotName || "Standard Slot"} &nbsp;•&nbsp; Monthly Base: <strong style={{ color: "#fff" }}>₹{r.monthlySalary.toLocaleString("en-IN")}</strong>
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                        {/* Weekly Leave Balance Badge */}
                        <span style={{ fontSize: "0.68rem", color: "#c084fc", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.28)", padding: "0.25rem 0.6rem", borderRadius: "8px", fontWeight: 800 }}>
                          🎁 Leave Bal: {freeLeaves}/4
                        </span>
                        {r.todayShiftStatus?.isLastDay && (
                          !r.todayShiftStatus.shiftStarted ? (
                            <span style={{ fontSize: "0.68rem", color: "#38bdf8", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)", padding: "0.25rem 0.6rem", borderRadius: "8px", fontWeight: 800 }}>
                              ⏳ Last Day: Shift starts {r.todayShiftStatus.shiftHours.split('–')[0]?.trim()}
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.68rem", color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", padding: "0.25rem 0.6rem", borderRadius: "8px", fontWeight: 800 }}>
                              ⚡ Last Day Shift Active
                            </span>
                          )
                        )}
                        {r.warnings.highAdvance && <span style={{ fontSize: "0.65rem", color: "#fb7185", background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", padding: "0.2rem 0.55rem", borderRadius: "6px", fontWeight: 800 }}>⚠️ HIGH ADVANCE</span>}
                        {r.warnings.lowWork && <span style={{ fontSize: "0.65rem", color: "#fb923c", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)", padding: "0.2rem 0.55rem", borderRadius: "6px", fontWeight: 800 }}>⚠️ NO SHIFTS</span>}
                      </div>
                    </div>

                    {/* Step-by-Step Salary Calculation Formula Box */}
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)", padding: "0.9rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      
                      {/* Salary Ledger: Shift Pay + Paid Leave Pay + Unused Leave Pay − Excess Penalty = Gross */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>

                        {/* Absence context */}
                        {rawAbsentDays > 0 ? (
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", padding: "0.25rem 0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", lineHeight: 1.4 }}>
                            📋 <strong style={{ color: "#fff" }}>{rawAbsentDays} absent</strong>:
                            {normalAbsences > 0 && <span> {normalAbsences}×1.0</span>}
                            {satCount > 0 && <span>, {satCount} Sat×1.5</span>}
                            {sunCount > 0 && <span>, {sunCount} Sun×1.5</span>}
                            {occCount > 0 && <span>, {occCount} Occ×1.5</span>}
                            <strong style={{ color: "#a78bfa" }}> = {weightedLeaves}w | {freeLeavesUsedCount}w covered free ({freeLeaves} earned), {unpaidAbsences}w excess</strong>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.65rem", color: "#10b981", padding: "0.25rem 0.5rem", background: "rgba(16,185,129,0.04)", borderRadius: "6px" }}>
                            ✨ <strong>0 absences</strong> — Perfect attendance across completed days!
                          </div>
                        )}

                        {/* Row 1: Shift Pay */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.7rem", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", fontSize: "0.72rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>⚡ <strong style={{ color: "#10b981" }}>Shift Pay</strong> — {daysPresent} days worked × ₹{dailyWage}</span>
                          <span style={{ fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>+ ₹{workedGross.toLocaleString("en-IN")}</span>
                        </div>

                        {/* Row 2: Paid Leave Pay (if any leaves covered) */}
                        {freeLeavesUsedCount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.7rem", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "8px", fontSize: "0.72rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>🎁 <strong style={{ color: "#34d399" }}>Paid Leave Pay</strong> — {freeLeavesUsedCount}d covered under leave bal × ₹{dailyWage}</span>
                            <span style={{ fontWeight: 900, color: "#34d399", fontFamily: "monospace" }}>+ ₹{freeLeaveAmount.toLocaleString("en-IN")}</span>
                          </div>
                        )}

                        {/* Row 3: Unused Earned Leave Pay */}
                        {unusedLeaveAmount > 0 ? (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.7rem", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "8px", fontSize: "0.72rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>🌟 <strong style={{ color: "#c084fc" }}>Unused Earned Leave Pay</strong> — {unusedFreeLeaves}d unused earned leave × ₹{dailyWage}</span>
                            <span style={{ fontWeight: 900, color: "#c084fc", fontFamily: "monospace" }}>+ ₹{unusedLeaveAmount.toLocaleString("en-IN")}</span>
                          </div>
                        ) : null}

                        {/* Row 4: Excess Penalty */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.7rem", background: unpaidAbsences > 0 ? "rgba(244,63,94,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${unpaidAbsences > 0 ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)"}`, borderRadius: "8px", fontSize: "0.72rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>✂️ <strong style={{ color: unpaidAbsences > 0 ? "#fb7185" : "var(--text-muted)" }}>Excess Leave Cut</strong> — {unpaidAbsences}w × ₹{dailyWage}</span>
                          <span style={{ fontWeight: 900, color: unpaidAbsences > 0 ? "#fb7185" : "var(--text-muted)", fontFamily: "monospace" }}>
                            {unpaidAbsences > 0 ? `− ₹${absencePenaltyAmount.toLocaleString("en-IN")}` : "₹0"}
                          </span>
                        </div>

                        {/* Last Day Projection Info Box (when shift not started yet) */}
                        {!showUnusedLeavePay && r.todayShiftStatus?.isLastDay && (() => {
                          const workShiftPay = parseFloat(((daysPresent + 1) * dailyWage).toFixed(2));
                          const workUnusedPay = potentialUnusedLeaveAmount;
                          const workGross = parseFloat((workShiftPay + freeLeaveAmount + workUnusedPay - absencePenaltyAmount).toFixed(2));

                          const leaveShiftPay = workedGross;
                          const totalPaidLeavesCount = freeLeavesUsedCount + (unusedFreeLeaves > 0 ? 1 : 0);
                          const leavePaidLeaveAmt = parseFloat((freeLeaveAmount + (unusedFreeLeaves > 0 ? dailyWage : 0)).toFixed(2));
                          const remUnusedLeaves = Math.max(0, unusedFreeLeaves - 1);
                          const leaveUnusedPay = parseFloat((remUnusedLeaves * dailyWage).toFixed(2));
                          const leaveExcessCut = unusedFreeLeaves > 0 ? absencePenaltyAmount : parseFloat((absencePenaltyAmount + dailyWage).toFixed(2));
                          const leaveGross = parseFloat((leaveShiftPay + leavePaidLeaveAmt + leaveUnusedPay - leaveExcessCut).toFixed(2));

                          return (
                            <div style={{ fontSize: "0.66rem", padding: "0.5rem 0.7rem", background: "rgba(168,85,247,0.07)", border: "1px dashed rgba(168,85,247,0.35)", borderRadius: "10px", color: "var(--text-muted)", lineHeight: 1.55 }}>
                              <div style={{ color: "#c084fc", fontWeight: 800, marginBottom: "0.2rem", fontSize: "0.7rem" }}>
                                ⏳ Today is the last day (Shift: {r.todayShiftStatus.shiftHours}) · {unusedFreeLeaves} earned leaves available
                              </div>
                              <div style={{ marginBottom: "0.15rem" }}>
                                • If staff works today: <strong>₹{workShiftPay.toLocaleString("en-IN")}</strong> shift pay ({daysPresent + 1}d) {freeLeaveAmount > 0 ? `+ <strong>₹${freeLeaveAmount.toLocaleString("en-IN")}</strong> paid leave (${freeLeavesUsedCount}d) ` : ""}+ <strong>₹{workUnusedPay.toLocaleString("en-IN")}</strong> unused leave pay ({unusedFreeLeaves}d) = <strong style={{ color: "#38bdf8" }}>₹{workGross.toLocaleString("en-IN")} Gross</strong>
                              </div>
                              <div>
                                • If staff takes leave on 31st: <strong>₹{leaveShiftPay.toLocaleString("en-IN")}</strong> shift pay ({daysPresent}d) + <strong>₹{leavePaidLeaveAmt.toLocaleString("en-IN")}</strong> paid leave ({totalPaidLeavesCount}d) {remUnusedLeaves > 0 ? `+ <strong>₹${leaveUnusedPay.toLocaleString("en-IN")}</strong> unused leave pay (${remUnusedLeaves}d) ` : ""}= <strong style={{ color: "#38bdf8" }}>₹{leaveGross.toLocaleString("en-IN")} Gross</strong>
                              </div>
                              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.62rem", marginTop: "0.25rem" }}>
                                ℹ️ Unused leave pay activates once the last day shift starts.
                              </div>
                            </div>
                          );
                        })()}

                        {/* Result */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.7rem", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "8px" }}>
                          <div>
                            <span style={{ fontSize: "0.62rem", color: "#38bdf8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>= Gross Salary Earned</span>
                            <span style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                              ₹{workedGross.toLocaleString("en-IN")} {freeLeaveAmount > 0 ? `+ ₹${freeLeaveAmount.toLocaleString("en-IN")}` : ""} {unusedLeaveAmount > 0 ? `+ ₹${unusedLeaveAmount.toLocaleString("en-IN")}` : ""} − ₹{absencePenaltyAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <span style={{ fontSize: "1.05rem", fontWeight: 900, color: earnedGross >= 0 ? "#38bdf8" : "#fb7185", fontFamily: "monospace" }}>
                            {earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Secondary stats row */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", fontSize: "0.72rem" }}>
                        <div style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.02)", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.03)" }}>
                          <span style={{ display: "block", fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Daily Wage</span>
                          <span style={{ fontWeight: 800, color: "#fff" }}>₹{dailyWage}</span>
                        </div>
                        <div style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.02)", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.03)" }}>
                          <span style={{ display: "block", fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Days Worked</span>
                          <span style={{ fontWeight: 800, color: "#10b981" }}>{daysPresent} / {totalDays}</span>
                        </div>
                        <div style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.02)", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.03)" }}>
                          <span style={{ display: "block", fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Leave Bal</span>
                          <span style={{ fontWeight: 800, color: "#c084fc" }}>{freeLeaves} / 4 earned</span>
                        </div>
                      </div>
                    </div>

                    {/* Advance / Deductions & What Owner Pays Bar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", padding: "0.75rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      {/* Advance info */}
                      {advanceDebt > 0 ? (
                        <div style={{ display: "flex", gap: "1.1rem", flex: 1, flexWrap: "wrap" }}>
                          <div>
                            <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Advance Debt</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fb923c" }}>₹{advanceDebt.toLocaleString("en-IN")}</span>
                            {r.advanceDetails && r.advanceDetails.length > 0 && (
                              <div style={{ marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                                {r.advanceDetails.map((adv: any, i: number) => (
                                  <span key={adv.id || i} style={{ fontSize: "0.62rem", color: "#fdba74", fontWeight: 700 }}>
                                    📅 Taken: {adv.formattedDate} {r.advanceDetails.length > 1 ? `(₹${adv.amount.toLocaleString("en-IN")})` : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Deducted Now</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fb7185" }}>−₹{advanceDeducted.toLocaleString("en-IN")}</span>
                          </div>
                          {remainingAdvance > 0 && (
                            <div>
                              <span style={{ display: "block", fontSize: "0.58rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Carry Forward</span>
                              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#f59e0b" }}>₹{remainingAdvance.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {pfEnabled && (
                            <div>
                              <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PF (12%)</span>
                              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fb7185" }}>−₹{r.simplePf}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ flex: 1 }}>
                          {pfEnabled && (
                            <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PF (12%)</span>
                              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fb7185" }}>−₹{r.simplePf}</span>
                            </div>
                          )}
                          {!pfEnabled && <span style={{ fontSize: "0.75rem", color: "rgba(16,185,129,0.7)", fontWeight: 700 }}>✓ Zero advance debt</span>}
                        </div>
                      )}

                      {/* Net Payable by Owner + Release Action */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginLeft: "auto" }}>
                        <div style={{ textAlign: "right", padding: "0.35rem 0.75rem", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px" }}>
                          <span style={{ display: "block", fontSize: "0.58rem", color: "#10b981", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner Has to Pay</span>
                          <span style={{ fontSize: "1.45rem", fontWeight: 900, color: netToPay > 0 ? "#10b981" : "#fb7185", fontFamily: "monospace" }}>₹{netToPay.toLocaleString("en-IN")}</span>
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
                        style={{ flex: 1, padding: "0.55rem 0.6rem", background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.12))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.25))"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.12))"; }}
                      >🧾 Salary Audit Trail</button>

                      {/* Activity */}
                      <button
                        type="button"
                        onClick={() => setActivityModal({ id: r.staffId, name: r.name })}
                        style={{ flex: 1, padding: "0.55rem 0.6rem", background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.12))", border: "1px solid rgba(6,182,212,0.25)", borderRadius: "10px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 800, color: "#67e8f9", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(59,130,246,0.25))"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.12))"; }}
                      >📋 Monthly Activity</button>

                      {/* Profile */}
                      <Link href={`/admin/staff/${r.staffId}`}
                        style={{ flex: 1, padding: "0.55rem 0.6rem", background: `linear-gradient(135deg, ${c1}15, ${c2}15)`, border: `1px solid ${c1}25`, borderRadius: "10px", fontSize: "0.74rem", fontWeight: 800, color: c1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }}
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
