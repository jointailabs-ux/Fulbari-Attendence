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
  currentMonth: {
    month: string;
    presentDays: number;
    totalDays: number;
    dailyWage?: number;
    earnedTillNow?: number;
    attendancePercent: number;
    pendingAdvance: number;
    advanceToRecover: number;
    netPayable: number;
    activeAdvances: { date: string; amount: number; reason: string }[];
    todayStatus: string;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  NOT_STARTED: { label: "Not Clocked In", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "🔘" },
  SHIFT_STARTED: { label: "On Shift", color: "#06b6d4", bg: "rgba(6,182,212,0.1)", icon: "🟢" },
  ON_BREAK: { label: "On Break", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "🟡" },
  SHIFT_ENDED: { label: "Shift Done", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "✅" },
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
  const [tab, setTab] = useState<"audit" | "salary" | "leaves" | "overview" | "documents">("audit");

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
    } catch {
      router.replace("/staff");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <p style={{ color: "var(--text-muted)" }}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!staff) return null;

  const statusInfo = STATUS_MAP[staff.currentMonth.todayStatus] || STATUS_MAP.NOT_STARTED;
  const joinDate = new Date(staff.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const totalEarned = staff.payrolls.reduce((s, p) => s + p.finalPayable, 0);

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
            <p style={{ fontWeight: 800, fontSize: "0.95rem" }}>{staff.name}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{staff.slot?.name} · {staff.slot?.outlet?.name}</p>
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

        {/* Hero Banner (SIMPLIFIED) */}
        <div className="glass animate-slide-up" style={{
          padding: "2rem", borderRadius: "20px", marginBottom: "1.5rem",
          background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))",
          border: "1px solid rgba(139,92,246,0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "24px", flexShrink: 0,
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",
              border: "2px solid rgba(139,92,246,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: "2rem", color: "var(--brand-primary-light)",
              boxShadow: "0 0 30px rgba(139,92,246,0.2)"
            }}>
              {initials(staff.name)}
            </div>
            
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.2rem" }}>{staff.name}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                📍 {staff.slot?.outlet?.name} &nbsp;|&nbsp; 🏷️ {staff.slot?.name}
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.4rem 1rem", borderRadius: "50px",
                background: statusInfo.bg, border: `1px solid ${statusInfo.color}33`,
                fontSize: "0.85rem", fontWeight: 700, color: statusInfo.color
              }}>
                {statusInfo.icon} Today: {statusInfo.label}
              </div>
            </div>

            {/* Simple Earned Box */}
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: "200px" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>MONTHLY SALARY</p>
                <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>₹{staff.monthlySalary.toLocaleString("en-IN")}</p>
              </div>
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", padding: "0.75rem 1rem", borderRadius: "12px" }}>
                <p style={{ fontSize: "0.7rem", color: "var(--brand-primary-light)", fontWeight: 800, textTransform: "uppercase" }}>EARNED TILL NOW</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 900, color: "#10b981" }}>
                  ₹{(staff.currentMonth.netPayable ?? 0).toLocaleString("en-IN")}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Earned (₹{(staff.currentMonth.earnedTillNow ?? 0).toLocaleString("en-IN")}) - Advance (₹{(staff.currentMonth.advanceToRecover ?? 0).toLocaleString("en-IN")})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* This Month Stats (SIMPLIFIED) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { icon: "📅", label: "Days Present", value: `${staff.currentMonth.presentDays} / ${staff.currentMonth.totalDays}`, color: "#06b6d4" },
            { icon: "💵", label: "Daily Wage", value: `₹${(staff.currentMonth.dailyWage ?? 0).toLocaleString("en-IN")}`, color: "#38bdf8" },
            { icon: "💰", label: "Earned Till Now", value: `₹${(staff.currentMonth.earnedTillNow ?? 0).toLocaleString("en-IN")}`, color: "#10b981" },
            { icon: "💳", label: "Pending Advance", value: `₹${staff.currentMonth.pendingAdvance.toLocaleString("en-IN")}`, color: "#f59e0b" },
            { icon: "🏆", label: "Past Disbursed", value: `₹${totalEarned.toLocaleString("en-IN")}`, color: "#a855f7" },
          ].map((stat, i) => (
            <div key={i} className="glass" style={{ padding: "1.5rem", borderRadius: "16px" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>{stat.label}</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 900, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Nav */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {[
            { id: "audit", label: "📊 Current Month" },
            { id: "salary", label: "💸 Past Salaries" },
            { id: "leaves", label: "📝 Leaves" },
            { id: "overview", label: "👤 Profile" },
            { id: "documents", label: "📂 Documents" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                padding: "0.75rem 1.5rem", borderRadius: "12px",
                fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
                background: tab === t.id ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))" : "rgba(255,255,255,0.05)",
                color: tab === t.id ? "white" : "var(--text-muted)",
                border: tab === t.id ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Current Month Audit Tab */}
        {tab === "audit" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="glass" style={{ padding: "1.5rem", borderRadius: "20px", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1rem" }}>
                <div>
                  <p style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff" }}>Live Finance Audit Trail</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Your earnings and deductions for {new Date().toLocaleString('default', { month: 'long' })} so far</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>💰</span>
                    <div>
                      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>Gross Earned Till Now</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>₹{staff.currentMonth.dailyWage} × {staff.currentMonth.presentDays} days worked</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399", alignSelf: "center" }}>₹{(staff.currentMonth.earnedTillNow ?? 0).toLocaleString("en-IN")}</p>
                </div>

                {staff.currentMonth.advanceToRecover > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "rgba(244,63,94,0.05)", borderRadius: "12px", border: "1px solid rgba(244,63,94,0.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>💳</span>
                      <div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>Advance to Recover</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Money you took early</p>
                      </div>
                    </div>
                    <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fb7185", alignSelf: "center" }}>- ₹{(staff.currentMonth.advanceToRecover ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "rgba(16,185,129,0.1)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.25)", marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>✅</span>
                    <div>
                      <p style={{ fontSize: "1rem", fontWeight: 800, color: "#10b981" }}>Current Net Payable</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>What you would get if paid today</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "1.4rem", fontWeight: 900, color: "#10b981", alignSelf: "center" }}>₹{(staff.currentMonth.netPayable ?? 0).toLocaleString("en-IN")}</p>
                </div>

              </div>
            </div>

            {/* Active Advances List */}
            {staff.currentMonth.activeAdvances && staff.currentMonth.activeAdvances.length > 0 && (
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem" }}>Your Active Advances</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {staff.currentMonth.activeAdvances.map((adv, i) => (
                    <div key={i} className="glass" style={{ padding: "1rem", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                          💸
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{adv.reason || "Cash Advance"}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Taken on {new Date(adv.date).toLocaleDateString("en-IN")}</p>
                        </div>
                      </div>
                      <p style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f59e0b" }}>₹{adv.amount.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Salary History Tab (DETAILED BREAKDOWN) */}
        {tab === "salary" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {staff.payrolls.length === 0 ? (
              <div className="glass" style={{ padding: "4rem", textAlign: "center", borderRadius: "20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
                <p style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "1.1rem" }}>No salary records yet.</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>Your salary history will appear here when the owner pays you.</p>
              </div>
            ) : (
              staff.payrolls.map((rec) => {
                const gross = rec.selectedMode === "STRICT" ? rec.strictSalary : rec.simpleSalary;
                return (
                  <div key={rec.id} className="glass" style={{
                    padding: "1.5rem", borderRadius: "20px",
                    border: "1px solid var(--glass-border)",
                    display: "flex", flexDirection: "column", gap: "1rem"
                  }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{
                          width: "56px", height: "56px", borderRadius: "14px",
                          background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                        }}>
                          <span style={{ fontSize: "1.2rem" }}>🗓️</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff" }}>{formatMonth(rec.monthYear)}</p>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Paid on {new Date(rec.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Amount Received</p>
                        <p style={{ fontWeight: 900, fontSize: "1.8rem", color: "#10b981" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {/* Breakdown Steps */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem" }}>
                      
                      {/* Gross */}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "1.2rem" }}>💰</span>
                          <div>
                            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>Money for days worked</p>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total you earned by working this month</p>
                          </div>
                        </div>
                        <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399", alignSelf: "center" }}>₹{gross.toLocaleString("en-IN")}</p>
                      </div>

                      {/* Advance Deduction */}
                      {rec.advancesDeducted > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "rgba(244,63,94,0.05)", borderRadius: "12px", border: "1px solid rgba(244,63,94,0.15)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>💳</span>
                            <div>
                              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>Advance Repaid</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Money you took early and are paying back</p>
                            </div>
                          </div>
                          <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fb7185", alignSelf: "center" }}>- ₹{rec.advancesDeducted.toLocaleString("en-IN")}</p>
                        </div>
                      )}

                      {/* Final Net */}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "rgba(16,185,129,0.1)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.25)", marginTop: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "1.2rem" }}>✅</span>
                          <div>
                            <p style={{ fontSize: "1rem", fontWeight: 800, color: "#10b981" }}>Final Amount</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>This is what you take home</p>
                          </div>
                        </div>
                        <p style={{ fontSize: "1.4rem", fontWeight: 900, color: "#10b981", alignSelf: "center" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</p>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Leave Requests Tab */}
        {tab === "leaves" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>My Leaves</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Check days you didn't work and your leave requests.</p>
              </div>
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn-modern btn-primary"
                style={{ padding: "0.75rem 1.5rem", fontSize: "0.9rem", fontWeight: 800 }}
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
                    <div key={req.id} className="glass" style={{ padding: "1.5rem", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                            {startStr} {startStr !== endStr ? `to ${endStr}` : ""}
                          </p>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                            For <strong style={{ color: "var(--brand-primary-light)" }}>{req.type === "FULL" ? "Full Day" : "Half Day"}</strong>
                          </p>
                        </div>
                        <span style={{
                          padding: "0.4rem 0.8rem", borderRadius: "8px",
                          background: statusColors.bg, border: `1px solid ${statusColors.border}`,
                          fontSize: "0.85rem", fontWeight: 800, color: statusColors.text, display: "flex", alignItems: "center", gap: "0.3rem"
                        }}>
                          {statusColors.icon} {req.status}
                        </span>
                      </div>
                      
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.85rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                        <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>Why</span>
                        <p style={{ fontSize: "0.95rem", color: "#fff", margin: 0 }}>{req.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Overview Tab (SIMPLIFIED) */}
        {tab === "overview" && (
          <div className="animate-slide-up glass" style={{ padding: "2rem", borderRadius: "20px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>Personal Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
              {[
                { label: "Phone Number", value: staff.phone, icon: "📱" },
                { label: "Date of Birth", value: staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not given", icon: "🎂" },
                { label: "Blood Group", value: staff.bloodGroup || "Not given", icon: "🩸" },
                { label: "Emergency Contact", value: staff.emergencyContact || "Not given", icon: "🚨" },
                { label: "Home Address", value: staff.address || "Not given", icon: "🏠" },
                { label: "Joining Date", value: joinDate, icon: "📆" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: "1.5rem" }}>{item.icon}</div>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.2rem", color: "#fff" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
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
                style={{ padding: "0.75rem 1.5rem", fontSize: "0.9rem", fontWeight: 800 }}
              >
                ✏️ Change Details
              </button>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {tab === "documents" && (
          <div className="animate-slide-up">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>My Documents</h2>
            <DocumentsTab staffId={staffId} />
          </div>
        )}

      </main>

      {/* ── Request Leave Modal ── */}
      {isLeaveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <h2 className="text-gradient" style={{ fontSize: "1.5rem" }}>Ask for Leave</h2>
              <button onClick={() => setIsLeaveModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                <FormLabel>Is it a Full Day or Half Day?</FormLabel>
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
                <FormLabel>Why do you need leave?</FormLabel>
                <input 
                  type="text" 
                  required 
                  className="input-modern" 
                  placeholder="E.g. Going to doctor, family work..." 
                  value={leaveForm.reason} 
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} 
                />
              </div>

              <button 
                type="submit" 
                className="btn-modern btn-primary" 
                style={{ width: "100%", marginTop: "0.5rem", padding: "1rem", fontSize: "1rem" }}
                disabled={submittingLeave}
              >
                {submittingLeave ? "Sending..." : "Send Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Personal Details Modal ── */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <h2 className="text-gradient" style={{ fontSize: "1.5rem" }}>Change Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                <FormLabel>Change Login PIN (6 numbers)</FormLabel>
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
                style={{ width: "100%", marginTop: "0.5rem", padding: "1rem", fontSize: "1rem" }}
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
