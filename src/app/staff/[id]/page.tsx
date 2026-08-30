"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DocumentsTab from "../../admin/staff/[id]/DocumentsTab";

interface PayrollRecord {
  id: string;
  monthYear: string;
  strictSalary: number;
  simpleSalary: number;
  selectedMode: string;
  finalPayable: number;
  advancesDeducted: number;
  createdAt: string;
}

interface StaffData {
  id: string;
  name: string;
  phone: string;
  monthlySalary: number;
  joiningDate: string;
  isActive: boolean;
  address?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  slot?: { name: string; outlet?: { name: string; shiftStartTime: string; shiftEndTime: string } };
  payrolls: PayrollRecord[];
  payrollRecord?: any;
  currentMonth: {
    month: string;
    presentDays: number;
    paidDays: number;
    freeLeaves: number;
    freeLeavesUsed?: number;
    unusedFreeLeaves?: number;
    unusedLeaveAmount?: number;
    potentialUnusedLeaveAmount?: number;
    showUnusedLeavePay?: boolean;
    todayShiftStatus?: any;
    advanceDetails?: Array<{ id: string; amount: number; date: string; formattedDate: string }>;
    totalDays: number;
    dailyWage: number;
    workedGross?: number;
    earnedGross?: number;
    earnedTillNow?: number;
    attendancePercent: number;
    pendingAdvance: number;
    advanceToRecover: number;
    netPayable: number;
    activeAdvances: { date: string; amount: number; reason?: string }[];
    todayStatus: string;
    weekendAbsences?: { saturdays: number; sundays: number; total: number };
    occasionAbsences?: { count: number; dates: any[] };
    extraWeekendPenaltyDays?: number;
    weekendPenaltyAmount?: number;
    rawAbsences?: number;
    normalAbsences?: number;
    unexcusedAbsences?: number;
    penaltyAbsence?: number;
    weightedLeavesTaken?: number;
    freeLeaveAmount?: number;
    daysElapsed?: number;
    weeklyFreeLeaveBreakdown?: Array<{ weekLabel: string; daysWorked: number; daysInMonth: number; earned: boolean }>;
    metrics?: any;
    absentBreakdown?: any[];
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  NOT_STARTED: { label: "Not Clocked In", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "🔘" },
  SHIFT_STARTED: { label: "On Shift", color: "#06b6d4", bg: "rgba(6,182,212,0.1)", icon: "🟢" },
  ON_BREAK: { label: "On Break", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "🟡" },
  SHIFT_ENDED: { label: "Shift Done", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "✅" },
};

const EV_STYLE: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  SHIFT_START: { dot: "#10b981", bg: "rgba(16,185,129,0.13)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
  BREAK_START: { dot: "#f59e0b", bg: "rgba(245,158,11,0.13)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  BREAK_END:   { dot: "#06b6d4", bg: "rgba(6,182,212,0.13)",  text: "#67e8f9", border: "rgba(6,182,212,0.25)"  },
  SHIFT_END:   { dot: "#f43f5e", bg: "rgba(244,63,94,0.13)",  text: "#fb7185", border: "rgba(244,63,94,0.25)"  },
};

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;

  const [staff, setStaff] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"audit" | "activity" | "salary" | "leaves" | "overview" | "documents">("audit");

  // Activity Tab state
  const [activityDays, setActivityDays] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Leaves management states
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    type: "FULL",
    reason: "",
  });

  // Edit details states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    dateOfBirth: "",
    bloodGroup: "",
    pin: "",
  });

  useEffect(() => {
    // Auth guard — must have logged in via /staff
    const auth = sessionStorage.getItem(`staff_auth_${staffId}`);
    if (!auth) {
      router.replace("/staff");
      return;
    }
    fetchData();
    fetchLeaveRequests();
  }, [staffId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/v1/staff-portal/${staffId}`);
      if (!res.ok) { router.replace("/staff"); return; }
      const data = await res.json();
      setStaff(data);
      if (data.currentMonth?.month) {
        fetchActivity(data.currentMonth.month);
      }
    } catch {
      router.replace("/staff");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async (month: string) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/v1/staff/${staffId}/attendance?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        const parsed = Object.entries(data)
          .filter(([, v]: any) => v.startTime || v.state || v.status)
          .map(([date, v]: any) => ({ date, ...v }))
          .sort((a: any, b: any) => b.date.localeCompare(a.date)); // Latest first
        setActivityDays(parsed);
      }
    } catch (e) {
      console.error("Error fetching activity:", e);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(`/api/v1/leaves/request?staffId=${staffId}`);
      if (res.ok) {
        setLeaveRequests(await res.json());
      }
    } catch (e) {
      console.error("Error fetching leave requests:", e);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`staff_auth_${staffId}`);
    router.push("/staff");
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      alert("Please fill in all fields.");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await fetch("/api/v1/leaves/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          ...leaveForm,
        }),
      });

      if (res.ok) {
        alert("Leave request submitted successfully!");
        setIsLeaveModalOpen(false);
        setLeaveForm({ startDate: "", endDate: "", type: "FULL", reason: "" });
        fetchLeaveRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit request");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.pin.trim() && !/^\d{6}$/.test(editForm.pin.trim())) {
      alert("PIN must be exactly 6 digits.");
      return;
    }
    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/v1/staff-portal/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        alert("Personal details updated successfully!");
        setIsEditModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update details");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const fmtTime = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  };

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(day)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <p style={{ color: "var(--text-muted)" }}>Loading your profile & live payroll...</p>
        </div>
      </div>
    );
  }

  if (!staff) return null;

  const statusInfo = STATUS_MAP[staff.currentMonth.todayStatus] || STATUS_MAP.NOT_STARTED;
  const joinDate = new Date(staff.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const totalDisbursed = staff.payrolls.reduce((s, p) => s + p.finalPayable, 0);

  // Exact payroll calculations identical to owner view
  const totalDays = staff.currentMonth.totalDays || 31;
  const daysPresent = staff.currentMonth.presentDays || 0;
  const dailyWage = staff.currentMonth.dailyWage || parseFloat((staff.monthlySalary / totalDays).toFixed(2));
  const workedGross = staff.currentMonth.workedGross ?? parseFloat((daysPresent * dailyWage).toFixed(2));
  
  const satCount = staff.currentMonth.weekendAbsences?.saturdays || 0;
  const sunCount = staff.currentMonth.weekendAbsences?.sundays || 0;
  const occCount = staff.currentMonth.occasionAbsences?.count || 0;
  const specialAbsentCount = satCount + sunCount + occCount;

  const extraWeekendPenaltyDays = staff.currentMonth.extraWeekendPenaltyDays ?? parseFloat((specialAbsentCount * 1.5).toFixed(2));
  const weekendPenaltyAmount = staff.currentMonth.weekendPenaltyAmount ?? parseFloat((extraWeekendPenaltyDays * dailyWage).toFixed(2));

  const rawAbsentDays = staff.currentMonth.rawAbsences ?? Math.max(0, totalDays - daysPresent);
  const normalAbsences = staff.currentMonth.normalAbsences ?? Math.max(0, rawAbsentDays - (staff.currentMonth.weekendAbsences?.total || 0) - occCount);
  const freeLeaves = staff.currentMonth.freeLeaves ?? 0;
  const daysElapsed = staff.currentMonth.daysElapsed ?? totalDays;
  const weeklyBreakdown = staff.currentMonth.weeklyFreeLeaveBreakdown ?? [];
  const unpaidAbsences = parseFloat((staff.currentMonth.unexcusedAbsences ?? Math.max(0, rawAbsentDays - freeLeaves)).toFixed(2));
  const absencePenaltyAmount = parseFloat((staff.currentMonth.penaltyAbsence ?? staff.currentMonth.metrics?.penaltyAbsence ?? (unpaidAbsences * dailyWage)).toFixed(2));
  const weightedLeaves = parseFloat((staff.currentMonth.weightedLeavesTaken ?? (normalAbsences * 1.0 + (satCount + sunCount + occCount) * 1.5)).toFixed(2));
  const freeLeavesUsedCount = parseFloat(Math.min(freeLeaves, weightedLeaves).toFixed(2));
  const freeLeaveAmount = parseFloat((staff.currentMonth.freeLeaveAmount ?? staff.currentMonth.metrics?.freeLeaveAmount ?? (freeLeavesUsedCount * dailyWage)).toFixed(2));
  const unusedFreeLeaves = staff.currentMonth.unusedFreeLeaves ?? staff.currentMonth.metrics?.unusedFreeLeaves ?? Math.max(0, freeLeaves - freeLeavesUsedCount);
  const unusedLeaveAmount = staff.currentMonth.unusedLeaveAmount ?? staff.currentMonth.metrics?.unusedLeaveAmount ?? 0;
  const potentialUnusedLeaveAmount = staff.currentMonth.potentialUnusedLeaveAmount ?? staff.currentMonth.metrics?.potentialUnusedLeaveAmount ?? parseFloat((unusedFreeLeaves * dailyWage).toFixed(2));
  const showUnusedLeavePay = staff.currentMonth.showUnusedLeavePay ?? staff.currentMonth.metrics?.showUnusedLeavePay ?? false;
  
  // Gross = Shift Pay + Paid Leave Pay + Unused Leave Pay − Excess Cut (can be negative)
  const earnedGross = staff.currentMonth.earnedGross ?? staff.currentMonth.earnedTillNow ?? parseFloat((workedGross + freeLeaveAmount + unusedLeaveAmount - absencePenaltyAmount).toFixed(2));
  const advanceDebt = staff.currentMonth.pendingAdvance || 0;
  const advanceDeducted = staff.currentMonth.advanceToRecover ?? Math.min(advanceDebt, Math.max(0, earnedGross));
  const remainingAdvance = Math.max(0, advanceDebt - advanceDeducted);
  const netPayable = staff.currentMonth.netPayable ?? parseFloat((earnedGross - advanceDeducted).toFixed(2));

  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </label>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-dark)", position: "relative" }}>
      <div className="bg-mesh" />

      {/* Top Bar */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 1.5rem", borderBottom: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)", background: "rgba(3,0,10,0.6)",
        position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.25))",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.9rem", color: "var(--brand-primary-light)"
          }}>
            {initials(staff.name)}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: "0.95rem", margin: 0 }}>{staff.name}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>{staff.slot?.name} · {staff.slot?.outlet?.name}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)",
            color: "var(--brand-secondary)", padding: "0.4rem 1rem",
            borderRadius: "10px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700
          }}
        >
          Sign Out
        </button>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>

        {/* Hero Banner (Synced with Owner View) */}
        <div className="glass animate-slide-up" style={{
          padding: "2rem", borderRadius: "24px", marginBottom: "1.5rem",
          background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 10px 40px -10px rgba(139,92,246,0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div style={{
                width: "74px", height: "74px", borderRadius: "20px", flexShrink: 0,
                background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",
                border: "2px solid rgba(139,92,246,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: "1.8rem", color: "var(--brand-primary-light)",
                boxShadow: "0 0 30px rgba(139,92,246,0.2)"
              }}>
                {initials(staff.name)}
              </div>
              
              <div>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 900, margin: "0 0 0.2rem 0", color: "#fff" }}>{staff.name}</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 0.6rem 0" }}>
                  📍 {staff.slot?.outlet?.name} &nbsp;|&nbsp; 🏷️ {staff.slot?.name}
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.35rem 0.85rem", borderRadius: "50px",
                  background: statusInfo.bg, border: `1px solid ${statusInfo.color}33`,
                  fontSize: "0.8rem", fontWeight: 700, color: statusInfo.color
                }}>
                  {statusInfo.icon} Today: {statusInfo.label}
                </div>
              </div>
            </div>

            {/* Monthly Salary & Current Net Payout Box */}
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "190px" }}>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, margin: 0, textTransform: "uppercase" }}>MONTHLY BASE SALARY</p>
                <p style={{ fontSize: "1.45rem", fontWeight: 900, color: "#fff", margin: "0.1rem 0" }}>₹{staff.monthlySalary.toLocaleString("en-IN")}</p>
              </div>
              <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.12))", border: "1px solid rgba(16,185,129,0.4)", padding: "0.75rem 1rem", borderRadius: "14px", boxShadow: "0 0 20px rgba(16,185,129,0.15)" }}>
                <p style={{ fontSize: "0.65rem", color: "#34d399", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>CURRENT NET PAYABLE</p>
                <p style={{ fontSize: "1.65rem", fontWeight: 900, color: "#10b981", margin: "0.1rem 0", fontFamily: "monospace" }}>
                  ₹{netPayable.toLocaleString("en-IN")}
                </p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>
                  Gross Earned (₹{earnedGross.toLocaleString("en-IN")}) − Advance (₹{advanceDeducted.toLocaleString("en-IN")})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Work Earnings Formula & Breakdown Card (Exact Match with Owner Payroll Card) */}
        <div style={{ background: "rgba(12,12,22,0.85)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem" }}>
          
          {/* Salary Ledger: Shift Pay − Excess Penalty = Gross */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>

            {/* Absence Context */}
            {rawAbsentDays > 0 && (
              <div style={{ fontSize: "0.67rem", color: "var(--text-muted)", padding: "0.3rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", lineHeight: 1.5 }}>
                📋 <strong style={{ color: "#fff" }}>{rawAbsentDays} absent days</strong> this period:
                {normalAbsences > 0 && <span> {normalAbsences} normal (×1.0)</span>}
                {satCount > 0 && <span>, {satCount} Sat (×1.5)</span>}
                {sunCount > 0 && <span>, {sunCount} Sun (×1.5)</span>}
                {occCount > 0 && <span>, {occCount} occasion (×1.5)</span>}
                <strong style={{ color: "#a78bfa" }}> → {weightedLeaves}w total &nbsp;|&nbsp; {freeLeavesUsedCount}w free ({freeLeaves} earned), {unpaidAbsences}w excess</strong>
              </div>
            )}

            {/* Row 1: Shift Pay */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.7rem", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", fontSize: "0.72rem" }}>
              <span style={{ color: "var(--text-muted)" }}>⚡ <strong style={{ color: "#10b981" }}>Shift Pay</strong> — {daysPresent} days worked × ₹{dailyWage}</span>
              <span style={{ fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>+ ₹{workedGross.toLocaleString("en-IN")}</span>
            </div>

            {/* Row 2: Paid Leave Pay (if leaves covered) */}
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

            {/* Row 4: Excess Absence Cut */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.7rem", background: unpaidAbsences > 0 ? "rgba(244,63,94,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${unpaidAbsences > 0 ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)"}`, borderRadius: "8px", fontSize: "0.72rem" }}>
              <div>
                <span style={{ color: unpaidAbsences > 0 ? "#fb7185" : "var(--text-muted)", fontWeight: 800 }}>✂️ Excess Leave Cut</span>
                {unpaidAbsences > 0
                  ? <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({weightedLeaves}w − {freeLeavesUsedCount}w free = {unpaidAbsences}w × ₹{dailyWage})</span>
                  : <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({weightedLeaves}w covered by {freeLeaves} earned free leaves)</span>
                }
              </div>
              <span style={{ fontWeight: 900, color: unpaidAbsences > 0 ? "#fb7185" : "var(--text-muted)", fontFamily: "monospace" }}>
                {unpaidAbsences > 0 ? `− ₹${absencePenaltyAmount.toLocaleString("en-IN")}` : "₹0"}
              </span>
            </div>

            {/* Last Day Projection Info Box (when shift not started yet) */}
            {!showUnusedLeavePay && staff.currentMonth.todayShiftStatus?.isLastDay && (
              <div style={{ fontSize: "0.66rem", padding: "0.45rem 0.65rem", background: "rgba(168,85,247,0.06)", border: "1px dashed rgba(168,85,247,0.3)", borderRadius: "8px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                <div style={{ color: "#c084fc", fontWeight: 700, marginBottom: "0.15rem" }}>
                  ⏳ Today is the last day (Shift: {staff.currentMonth.todayShiftStatus.shiftHours}) · {unusedFreeLeaves} earned leaves available
                </div>
                <div>
                  • If you work today: <strong>₹{((daysPresent + 1) * dailyWage).toLocaleString("en-IN")}</strong> shift pay + <strong>₹{potentialUnusedLeaveAmount.toLocaleString("en-IN")}</strong> unused leave pay = <strong style={{ color: "#38bdf8" }}>₹{((daysPresent + 1) * dailyWage + potentialUnusedLeaveAmount).toLocaleString("en-IN")} Gross</strong>
                </div>
                <div>
                  • If you take leave today: <strong>₹{workedGross.toLocaleString("en-IN")}</strong> shift pay + <strong>₹{dailyWage.toLocaleString("en-IN")}</strong> paid leave + <strong>₹{((unusedFreeLeaves - 1) * dailyWage).toLocaleString("en-IN")}</strong> unused leave pay = <strong style={{ color: "#38bdf8" }}>₹{(workedGross + dailyWage + (unusedFreeLeaves - 1) * dailyWage).toLocaleString("en-IN")} Gross</strong>
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.62rem", marginTop: "0.2rem" }}>
                  ℹ️ Unused leave pay activates once today's shift starts.
                </div>
              </div>
            )}

            {/* Result Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.7rem", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "8px" }}>
              <div>
                <span style={{ fontSize: "0.62rem", color: "#38bdf8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>= Gross Salary Earned</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                  ₹{workedGross.toLocaleString("en-IN")} {freeLeaveAmount > 0 ? `+ ₹${freeLeaveAmount.toLocaleString("en-IN")}` : ""} {unusedLeaveAmount > 0 ? `+ ₹${unusedLeaveAmount.toLocaleString("en-IN")}` : ""} − ₹{absencePenaltyAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <span style={{ fontSize: "1.05rem", fontWeight: 900, color: earnedGross >= 0 ? "#38bdf8" : "#fb7185", fontFamily: "monospace" }}>
                {earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Secondary stats */}
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

          {/* Advance & Deductions Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", padding: "0.7rem 0.9rem", background: "rgba(0,0,0,0.25)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
            {advanceDebt > 0 ? (
              <div style={{ display: "flex", gap: "1.1rem", flex: 1, flexWrap: "wrap" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Advance Debt</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fb923c" }}>₹{advanceDebt.toLocaleString("en-IN")}</span>
                  {staff.currentMonth.advanceDetails && staff.currentMonth.advanceDetails.length > 0 && (
                    <div style={{ marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                      {staff.currentMonth.advanceDetails.map((adv: any, i: number) => (
                        <span key={adv.id || i} style={{ fontSize: "0.62rem", color: "#fdba74", fontWeight: 700 }}>
                          📅 Taken: {adv.formattedDate} {(staff.currentMonth.advanceDetails?.length || 0) > 1 ? `(₹${adv.amount.toLocaleString("en-IN")})` : ""}
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
              </div>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "rgba(16,185,129,0.7)", fontWeight: 700 }}>✓ Zero advance debt</span>
            )}

            <div style={{ textAlign: "right", padding: "0.35rem 0.75rem", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", marginLeft: "auto" }}>
              <span style={{ display: "block", fontSize: "0.58rem", color: "#10b981", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Net Amount to Receive</span>
              <span style={{ fontSize: "1.35rem", fontWeight: 900, color: netPayable > 0 ? "#10b981" : "#fb7185", fontFamily: "monospace" }}>₹{netPayable.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {[
            { id: "audit", label: "🧾 Salary Audit Trail" },
            { id: "activity", label: "📋 Monthly Activity" },
            { id: "salary", label: "💸 Past Salaries" },
            { id: "leaves", label: "📝 Leaves" },
            { id: "overview", label: "👤 Profile" },
            { id: "documents", label: "📂 Documents" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                padding: "0.7rem 1.3rem", borderRadius: "12px",
                fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                background: tab === t.id ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.25))" : "rgba(255,255,255,0.04)",
                color: tab === t.id ? "white" : "var(--text-muted)",
                border: tab === t.id ? "1px solid rgba(139,92,246,0.35)" : "1px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── TAB 1: 4-STAGE SALARY AUDIT TRAIL (Exact Parity with Owner Modal) ─── */}
        {tab === "audit" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            
            {/* Header / Summary */}
            <div className="glass" style={{ padding: "1.4rem", borderRadius: "20px", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.85rem" }}>
                <div>
                  <p style={{ fontWeight: 900, fontSize: "1.15rem", color: "#fff", margin: 0 }}>Salary Audit & Calculation Stages</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>
                    Exact step-by-step audit matching the employer payroll calculation for {formatMonth(staff.currentMonth.month)}
                  </p>
                </div>
              </div>

              {/* STAGE 1: Daily Wage Rate */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c084fc", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>Daily Wage Calculation</span>
                  </div>
                  <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#a78bfa", fontFamily: "monospace" }}>₹{dailyWage} / day</span>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                  Monthly Base Salary <strong style={{ color: "#fff" }}>₹{staff.monthlySalary.toLocaleString("en-IN")}</strong> ÷ <strong style={{ color: "#fff" }}>{totalDays} days</strong> in month = <strong style={{ color: "#a78bfa" }}>₹{dailyWage}</strong> per working day.
                </p>
              </div>

              {/* STAGE 2: Shift Pay (Days Worked) */}
              <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>Shift Pay (Days Worked)</span>
                  </div>
                  <span style={{ fontSize: "1rem", fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>+ ₹{workedGross.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ padding: "0.45rem 0.7rem", background: "rgba(0,0,0,0.25)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.15)", fontSize: "0.75rem", fontWeight: 700, color: "#34d399", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
                  <span>{daysPresent} Days Worked × ₹{dailyWage} Daily Wage</span>
                  <span>= ₹{workedGross.toLocaleString("en-IN")}</span>
                </div>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.4 }}>
                  You earn daily wage strictly for days worked ({daysPresent} completed shifts).
                </p>
              </div>

              {/* STAGE 3: Weekly Free Leave Balance Rule */}
              <div style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", color: "#c084fc", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>Weekly Free Leave Balance</span>
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#c084fc", fontFamily: "monospace" }}>🎁 {freeLeaves} / 4 Earned</span>
                </div>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0", lineHeight: 1.4 }}>
                  Rule: Work <strong style={{ color: "#fff" }}>at least 6 days in a week</strong> to earn 1 free paid leave for that week (max 4 per month).
                </p>
                
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.4)", color: "#06b6d4", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>Paid Leaves & Absence Adjustments</span>
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", margin: "0.4rem 0" }}>
                  {/* Absence breakdown info */}
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", padding: "0.3rem 0.55rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", marginBottom: "0.4rem", lineHeight: 1.5 }}>
                    📋 <strong style={{ color: "#fff" }}>{rawAbsentDays} absent days</strong> this period:
                    {normalAbsences > 0 && <span> {normalAbsences} normal (×1.0)</span>}
                    {satCount > 0 && <span>, {satCount} Sat (×1.5)</span>}
                    {sunCount > 0 && <span>, {sunCount} Sun (×1.5)</span>}
                    {occCount > 0 && <span>, {occCount} occasion (×1.5)</span>}
                    <strong style={{ color: "#a78bfa" }}> → {weightedLeaves}w total | {freeLeavesUsedCount}w covered by earned free leaves, {unpaidAbsences}w excess</strong>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {/* Row A: Paid Leave Pay (Added to pay for covered leaves) */}
                    {freeLeavesUsedCount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", padding: "0.35rem 0.55rem", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "6px" }}>
                        <div>
                          <span style={{ color: "#34d399", fontWeight: 800 }}>🎁 Paid Leave Pay</span>
                          <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({freeLeavesUsedCount}d covered under {freeLeaves} earned free leaves × ₹{dailyWage})</span>
                        </div>
                        <span style={{ fontWeight: 900, color: "#34d399", fontFamily: "monospace" }}>+ ₹{freeLeaveAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    {/* Row B: Unused Earned Leave Pay */}
                    {unusedLeaveAmount > 0 ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", padding: "0.35rem 0.55rem", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "6px" }}>
                        <div>
                          <span style={{ color: "#c084fc", fontWeight: 800 }}>🌟 Unused Earned Leave Pay</span>
                          <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({unusedFreeLeaves}d unused earned leave × ₹{dailyWage})</span>
                        </div>
                        <span style={{ fontWeight: 900, color: "#c084fc", fontFamily: "monospace" }}>+ ₹{unusedLeaveAmount.toLocaleString("en-IN")}</span>
                      </div>
                    ) : !showUnusedLeavePay && staff.currentMonth.todayShiftStatus?.isLastDay ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", padding: "0.35rem 0.55rem", background: "rgba(168,85,247,0.04)", border: "1px dashed rgba(168,85,247,0.2)", borderRadius: "6px", color: "#c084fc" }}>
                        <span>🌟 Unused Leave Pay ({unusedFreeLeaves}d available = ₹{potentialUnusedLeaveAmount.toLocaleString("en-IN")})</span>
                        <span style={{ fontWeight: 700 }}>Activates once today's shift starts</span>
                      </div>
                    ) : null}

                    {/* Row C: Excess Leave Cut row */}
                    {unpaidAbsences > 0 ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", padding: "0.35rem 0.55rem", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: "6px" }}>
                        <div>
                          <span style={{ color: "#fb7185", fontWeight: 800 }}>✂️ Excess Leave Cut</span>
                          <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>({weightedLeaves}w − {freeLeavesUsedCount}w free = {unpaidAbsences}w excess × ₹{dailyWage})</span>
                        </div>
                        <span style={{ fontWeight: 900, color: "#fb7185", fontFamily: "monospace" }}>− ₹{absencePenaltyAmount.toLocaleString("en-IN")}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", padding: "0.35rem 0.55rem", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: "6px", color: "#34d399" }}>
                        <span>✂️ Excess Leave Cut</span>
                        <span style={{ fontWeight: 700 }}>₹0 — all absences covered by {freeLeaves} earned free leaves</span>
                      </div>
                    )}
                  </div>

                  {/* Gross formula summary: Shift Pay + Paid Leave Pay + Unused Leave Pay - Excess Cut */}
                  <div style={{ marginTop: "0.4rem", padding: "0.45rem 0.65rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.67rem", color: "var(--text-muted)", fontFamily: "monospace", lineHeight: 1.6 }}>
                    <div>Gross = Shift Pay {freeLeaveAmount > 0 ? "+ Paid Leave Pay " : ""}{unusedLeaveAmount > 0 ? "+ Unused Leave Pay " : ""}− Excess Leave Cut</div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>
                      ₹{workedGross.toLocaleString("en-IN")} {freeLeaveAmount > 0 ? `+ ₹${freeLeaveAmount.toLocaleString("en-IN")}` : ""} {unusedLeaveAmount > 0 ? `+ ₹${unusedLeaveAmount.toLocaleString("en-IN")}` : ""} − ₹{absencePenaltyAmount.toLocaleString("en-IN")} = <span style={{ color: earnedGross >= 0 ? "#34d399" : "#fb7185" }}>{earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px dashed rgba(255,255,255,0.08)", fontSize: "0.78rem" }}>
                  <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>👉 Gross Salary Earned:</span>
                  <span style={{ fontWeight: 900, color: earnedGross >= 0 ? "#34d399" : "#fb7185", fontSize: "1rem", fontFamily: "monospace" }}>{earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* STAGE 5: Deductions & Net Payout */}
              <div style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: "14px", padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(251,146,60,0.2)", border: "1px solid rgba(251,146,60,0.4)", color: "#fb923c", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>5</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>Deductions & What You Receive</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", margin: "0.4rem 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    <span>Gross Earned Salary</span>
                    <span style={{ fontWeight: 800, color: earnedGross >= 0 ? "#fff" : "#fb7185", fontFamily: "monospace" }}>
                      {earnedGross < 0 ? "-" : ""}₹{Math.abs(earnedGross).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {advanceDebt > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.74rem", color: "#fb7185" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>💳 Advance Repayment (Total Debt: ₹{advanceDebt.toLocaleString("en-IN")})</span>
                        <span style={{ fontWeight: 800, fontFamily: "monospace" }}>− ₹{advanceDeducted.toLocaleString("en-IN")}</span>
                      </div>
                      {staff.currentMonth.advanceDetails && staff.currentMonth.advanceDetails.length > 0 && (
                        <div style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.1rem", fontSize: "0.65rem", color: "#fdba74" }}>
                          {staff.currentMonth.advanceDetails.map((adv: any, i: number) => (
                            <span key={adv.id || i}>• Taken on <strong>{adv.formattedDate}</strong>: ₹{adv.amount.toLocaleString("en-IN")}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {advanceDebt > 0 && remainingAdvance > 0 && (
                  <p style={{ fontSize: "0.68rem", color: "#fb923c", margin: "0.35rem 0 0", background: "rgba(251,146,60,0.08)", padding: "0.35rem 0.55rem", borderRadius: "6px" }}>
                    ⚠️ Remaining advance debt of ₹{remainingAdvance.toLocaleString("en-IN")} will carry forward to next month.
                  </p>
                )}

                <div style={{ marginTop: "0.6rem", padding: "0.75rem 0.9rem", background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))", border: "1px solid rgba(16,185,129,0.4)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.62rem", color: "#10b981", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Final Net Payout</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Gross earned minus advance repayment</span>
                  </div>
                  <span style={{ fontSize: "1.4rem", fontWeight: 900, color: netPayable >= 0 ? "#10b981" : "#fb7185", fontFamily: "monospace" }}>
                    {netPayable < 0 ? "-" : ""}₹{Math.abs(netPayable).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

            </div>

            {/* Active Advances Section */}
            {staff.currentMonth.activeAdvances && staff.currentMonth.activeAdvances.length > 0 && (
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem", color: "#fff" }}>Active Cash Advances</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {staff.currentMonth.activeAdvances.map((adv, i) => (
                    <div key={i} className="glass" style={{ padding: "0.9rem 1.1rem", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                          💸
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0, color: "#fff" }}>{adv.reason || "Cash Advance"}</p>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>Taken on {new Date(adv.date).toLocaleDateString("en-IN")}</p>
                        </div>
                      </div>
                      <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "#f59e0b", margin: 0 }}>₹{adv.amount.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ─── TAB 2: MONTHLY ACTIVITY TIMELINE (Exact Parity with Owner Modal) ─── */}
        {tab === "activity" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="glass" style={{ padding: "1.4rem", borderRadius: "20px", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 900, margin: 0, color: "#fff" }}>Day-by-Day Activity Logs</h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>
                    Your punch times, break logs, and shift status for {formatMonth(staff.currentMonth.month)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", padding: "0.3rem 0.7rem", borderRadius: "8px", fontWeight: 800 }}>
                    {daysPresent} Completed Shifts
                  </span>
                </div>
              </div>

              {activityLoading ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>Loading monthly punches...</p>
                </div>
              ) : activityDays.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "14px" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
                  <p style={{ color: "var(--text-muted)", fontWeight: 700, margin: 0 }}>No shift activity recorded yet for this month.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {activityDays.map((day: any, i: number) => {
                    const isCompleted = !!day.endTime || day.state === "SHIFT_ENDED";
                    const isPresent = !!day.startTime;
                    const breakList: any[] = day.breaks || [];
                    const hasBreaks = breakList.length > 0;

                    return (
                      <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "0.9rem 1.1rem" }}>
                        {/* Day Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isCompleted ? "#10b981" : isPresent ? "#06b6d4" : "#94a3b8" }} />
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>{fmtDate(day.date)}</span>
                            {day.isOccasion && (
                              <span style={{ fontSize: "0.65rem", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c", padding: "0.15rem 0.45rem", borderRadius: "6px", fontWeight: 800 }}>
                                🎉 {day.occasionName || "Occasion"}
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: "6px",
                            background: isCompleted ? "rgba(16,185,129,0.12)" : isPresent ? "rgba(6,182,212,0.12)" : "rgba(148,163,184,0.1)",
                            color: isCompleted ? "#10b981" : isPresent ? "#06b6d4" : "#94a3b8",
                            border: `1px solid ${isCompleted ? "rgba(16,185,129,0.25)" : isPresent ? "rgba(6,182,212,0.25)" : "rgba(148,163,184,0.2)"}`
                          }}>
                            {isCompleted ? "✓ Shift Done" : isPresent ? "🟢 On Shift" : "🔘 Marked"}
                          </span>
                        </div>

                        {/* Punch In & Punch Out details */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", fontSize: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "0.6rem 0.8rem", borderRadius: "10px" }}>
                          <div>
                            <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Clock In</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>
                              {fmtTime(day.startTime)}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Clock Out</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isCompleted ? "#f43f5e" : "var(--text-muted)", fontFamily: "monospace" }}>
                              {fmtTime(day.endTime)}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Work Duration</span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#38bdf8", fontFamily: "monospace" }}>
                              {day.workHours !== undefined ? `${day.workHours} hrs` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Break Logs if any */}
                        {hasBreaks && (
                          <div style={{ marginTop: "0.5rem", padding: "0.45rem 0.65rem", background: "rgba(245,158,11,0.05)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)" }}>
                            <span style={{ fontSize: "0.62rem", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>
                              ☕ Breaks ({breakList.length}):
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                              {breakList.map((brk: any, bIdx: number) => (
                                <span key={bIdx} style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                  #{bIdx + 1}: {fmtTime(brk.startTime)} → {fmtTime(brk.endTime)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: SALARY HISTORY (Disbursed Slips) ─── */}
        {tab === "salary" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {staff.payrolls.length === 0 ? (
              <div className="glass" style={{ padding: "4rem", textAlign: "center", borderRadius: "20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
                <p style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "1.1rem" }}>No released salary records yet.</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>When your monthly payout is released by the owner, your official payslip will appear here.</p>
              </div>
            ) : (
              staff.payrolls.map((rec) => {
                const gross = rec.selectedMode === "STRICT" ? rec.strictSalary : rec.simpleSalary;
                return (
                  <div key={rec.id} className="glass" style={{
                    padding: "1.4rem", borderRadius: "20px",
                    border: "1px solid var(--glass-border)",
                    display: "flex", flexDirection: "column", gap: "1rem"
                  }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{
                          width: "50px", height: "50px", borderRadius: "14px",
                          background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                        }}>
                          <span style={{ fontSize: "1.2rem" }}>🗓️</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: 900, fontSize: "1.15rem", color: "#fff", margin: 0 }}>{formatMonth(rec.monthYear)}</p>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>
                            Disbursed on {new Date(rec.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Amount Paid</p>
                        <p style={{ fontWeight: 900, fontSize: "1.65rem", color: "#10b981", margin: 0, fontFamily: "monospace" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {/* Breakdown Steps */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Gross Salary Earned</span>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#34d399", fontFamily: "monospace" }}>₹{gross.toLocaleString("en-IN")}</span>
                      </div>

                      {rec.advancesDeducted > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "rgba(244,63,94,0.05)", borderRadius: "10px", border: "1px solid rgba(244,63,94,0.15)" }}>
                          <span style={{ fontSize: "0.85rem", color: "#fb7185" }}>Advance Repaid</span>
                          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fb7185", fontFamily: "monospace" }}>− ₹{rec.advancesDeducted.toLocaleString("en-IN")}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0.9rem", background: "rgba(16,185,129,0.1)", borderRadius: "10px", border: "1px solid rgba(16,185,129,0.25)", marginTop: "0.3rem" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#10b981" }}>Take-Home Final</span>
                        <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── TAB 4: LEAVE REQUESTS ─── */}
        {tab === "leaves" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>My Leaves & Requests</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Submit leave applications and check approval status.</p>
              </div>
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn-modern btn-primary"
                style={{ padding: "0.65rem 1.3rem", fontSize: "0.85rem", fontWeight: 800 }}
              >
                + Ask for Leave
              </button>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="glass" style={{ padding: "4rem", textAlign: "center", borderRadius: "20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📝</div>
                <p style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "1.1rem" }}>You haven't asked for any leaves.</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.3rem" }}>When you ask for a leave, it will show up here.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {leaveRequests.map((req) => {
                  const statusColors = 
                    req.status === "APPROVED" ? { text: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", icon: "✅" } :
                    req.status === "REJECTED" ? { text: "#f43f5e", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.15)", icon: "❌" } :
                    { text: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.2)", icon: "⏳" };

                  const startStr = new Date(req.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const endStr = new Date(req.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                  return (
                    <div key={req.id} className="glass" style={{ padding: "1.3rem", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: "1.05rem", margin: 0 }}>
                            {startStr} {startStr !== endStr ? `to ${endStr}` : ""}
                          </p>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                            Type: <strong style={{ color: "var(--brand-primary-light)" }}>{req.type === "FULL" ? "Full Day" : "Half Day"}</strong>
                          </p>
                        </div>
                        <span style={{
                          padding: "0.35rem 0.75rem", borderRadius: "8px",
                          background: statusColors.bg, border: `1px solid ${statusColors.border}`,
                          fontSize: "0.8rem", fontWeight: 800, color: statusColors.text, display: "flex", alignItems: "center", gap: "0.3rem"
                        }}>
                          {statusColors.icon} {req.status}
                        </span>
                      </div>
                      
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem 0.9rem", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                        <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Reason</span>
                        <p style={{ fontSize: "0.9rem", color: "#fff", margin: 0 }}>{req.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: PROFILE OVERVIEW ─── */}
        {tab === "overview" && (
          <div className="animate-slide-up glass" style={{ padding: "2rem", borderRadius: "20px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>Personal Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
              {[
                { label: "Phone Number", value: staff.phone, icon: "📱" },
                { label: "Date of Birth", value: staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not provided", icon: "🎂" },
                { label: "Blood Group", value: staff.bloodGroup || "Not provided", icon: "🩸" },
                { label: "Emergency Contact", value: staff.emergencyContact || "Not provided", icon: "🚨" },
                { label: "Home Address", value: staff.address || "Not provided", icon: "🏠" },
                { label: "Joining Date", value: joinDate, icon: "📆" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: "1.5rem" }}>{item.icon}</div>
                  <div>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{item.label}</p>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", marginTop: "0.2rem", color: "#fff", margin: 0 }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.8rem" }}>
              <button 
                onClick={() => {
                  setEditForm({
                    dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().slice(0, 10) : "",
                    bloodGroup: staff.bloodGroup || "",
                    pin: "",
                  });
                  setIsEditModalOpen(true);
                }}
                className="btn-modern btn-primary"
                style={{ padding: "0.7rem 1.4rem", fontSize: "0.88rem", fontWeight: 800 }}
              >
                ✏️ Update Details & PIN
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 6: DOCUMENTS ─── */}
        {tab === "documents" && (
          <div className="animate-slide-up">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>My Documents & KYC</h2>
            <DocumentsTab staffId={staffId} />
          </div>
        )}

      </main>

      {/* ── Request Leave Modal ── */}
      {isLeaveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 className="text-gradient" style={{ fontSize: "1.4rem", margin: 0 }}>Ask for Leave</h2>
              <button onClick={() => setIsLeaveModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <FormLabel>First Day</FormLabel>
                  <input 
                    type="date" 
                    required 
                    className="input-modern" 
                    value={leaveForm.startDate} 
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} 
                  />
                </div>
                <div>
                  <FormLabel>Last Day</FormLabel>
                  <input 
                    type="date" 
                    required 
                    className="input-modern" 
                    value={leaveForm.endDate} 
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} 
                  />
                </div>
              </div>
              
              <div>
                <FormLabel>Leave Type</FormLabel>
                <select 
                  className="input-modern" 
                  value={leaveForm.type} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                >
                  <option value="FULL">Full Day (Whole day off)</option>
                  <option value="HALF">Half Day (Work for few hours)</option>
                </select>
              </div>

              <div>
                <FormLabel>Reason for Leave</FormLabel>
                <input 
                  type="text" 
                  required 
                  className="input-modern" 
                  placeholder="E.g. Medical, personal work..." 
                  value={leaveForm.reason} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} 
                />
              </div>

              <button 
                type="submit" 
                className="btn-modern btn-primary" 
                style={{ width: "100%", marginTop: "0.5rem", padding: "0.85rem", fontSize: "0.95rem" }}
                disabled={submittingLeave}
              >
                {submittingLeave ? "Sending..." : "Submit Leave Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Personal Details Modal ── */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 className="text-gradient" style={{ fontSize: "1.4rem", margin: 0 }}>Change Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <FormLabel>Date of Birth</FormLabel>
                <input 
                  type="date" 
                  required 
                  className="input-modern" 
                  value={editForm.dateOfBirth} 
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} 
                />
              </div>
              
              <div>
                <FormLabel>Blood Group</FormLabel>
                <select 
                  className="input-modern" 
                  value={editForm.bloodGroup} 
                  onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                  required
                >
                  <option value="">Select Blood Group...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <FormLabel>Change Login PIN (6 digits)</FormLabel>
                <input 
                  type="text" 
                  maxLength={6}
                  className="input-modern" 
                  placeholder="•••••• (Leave empty to keep same PIN)"
                  value={editForm.pin} 
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} 
                />
              </div>

              <button 
                type="submit" 
                className="btn-modern btn-primary" 
                style={{ width: "100%", marginTop: "0.5rem", padding: "0.85rem", fontSize: "0.95rem" }}
                disabled={submittingEdit}
              >
                {submittingEdit ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
