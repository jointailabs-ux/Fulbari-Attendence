"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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
  slot?: { name: string; outlet?: { name: string; shiftStartTime: string; shiftEndTime: string } };
  payrolls: PayrollRecord[];
  currentMonth: {
    month: string;
    presentDays: number;
    totalDays: number;
    attendancePercent: number;
    pendingAdvance: number;
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
  const [tab, setTab] = useState<"overview" | "salary">("overview");

  useEffect(() => {
    // Auth guard — must have logged in via /staff
    const auth = sessionStorage.getItem(`staff_auth_${staffId}`);
    if (!auth) {
      router.replace("/staff");
      return;
    }
    fetchData();
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

  const handleLogout = () => {
    sessionStorage.removeItem(`staff_auth_${staffId}`);
    router.push("/staff");
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

        {/* Hero Banner */}
        <div className="glass animate-slide-up" style={{
          padding: "2rem", borderRadius: "20px", marginBottom: "1.5rem",
          background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))",
          border: "1px solid rgba(139,92,246,0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "20px", flexShrink: 0,
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",
              border: "2px solid rgba(139,92,246,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: "1.6rem", color: "var(--brand-primary-light)",
              boxShadow: "0 0 30px rgba(139,92,246,0.2)"
            }}>
              {initials(staff.name)}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: "0.2rem" }}>{staff.name}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                📍 {staff.slot?.outlet?.name} &nbsp;|&nbsp; 🏷️ {staff.slot?.name}
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.3rem 0.9rem", borderRadius: "50px",
                background: statusInfo.bg, border: `1px solid ${statusInfo.color}33`,
                fontSize: "0.8rem", fontWeight: 700, color: statusInfo.color
              }}>
                {statusInfo.icon} Today: {statusInfo.label}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>MONTHLY SALARY</p>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#10b981" }}>₹{staff.monthlySalary.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* This Month Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { icon: "📅", label: "Days Present", value: `${staff.currentMonth.presentDays} / ${staff.currentMonth.totalDays}`, color: "#06b6d4" },
            { icon: "📈", label: "Attendance", value: `${staff.currentMonth.attendancePercent}%`, color: "#8b5cf6" },
            { icon: "💳", label: "Pending Advance", value: `₹${staff.currentMonth.pendingAdvance.toLocaleString("en-IN")}`, color: "#f59e0b" },
            { icon: "💰", label: "Total Earned", value: `₹${totalEarned.toLocaleString("en-IN")}`, color: "#10b981" },
          ].map((stat, i) => (
            <div key={i} className="glass" style={{ padding: "1.25rem", borderRadius: "16px" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>{stat.label}</p>
              <p style={{ fontSize: "1.4rem", fontWeight: 900, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Nav */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.02)", padding: "0.4rem", borderRadius: "14px", border: "1px solid var(--glass-border)", width: "fit-content" }}>
          {(["overview", "salary"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "0.5rem 1.25rem", borderRadius: "10px",
                fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                background: tab === t ? "rgba(139,92,246,0.2)" : "transparent",
                color: tab === t ? "var(--brand-primary-light)" : "var(--text-muted)",
                border: tab === t ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                transition: "all 0.2s ease",
                textTransform: "capitalize"
              }}
            >
              {t === "overview" ? "👤 Profile" : "💸 Salary History"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="animate-slide-up glass" style={{ padding: "2rem", borderRadius: "20px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>My Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
              {[
                { label: "Full Name", value: staff.name, icon: "👤" },
                { label: "Phone Number", value: staff.phone, icon: "📱" },
                { label: "Work Location", value: staff.slot?.outlet?.name || "—", icon: "📍" },
                { label: "Assigned Role", value: staff.slot?.name || "—", icon: "🏷️" },
                { label: "Monthly Salary", value: `₹${staff.monthlySalary.toLocaleString("en-IN")}`, icon: "💰" },
                { label: "Joining Date", value: joinDate, icon: "📆" },
                { label: "Shift Hours", value: staff.slot?.outlet ? `${staff.slot.outlet.shiftStartTime} – ${staff.slot.outlet.shiftEndTime}` : "—", icon: "🕐" },
                { label: "Emergency Contact", value: staff.emergencyContact || "Not provided", icon: "🚨" },
                { label: "Address", value: staff.address || "Not provided", icon: "🏠" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "1.2rem", marginTop: "0.1rem" }}>{item.icon}</div>
                  <div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.15rem" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salary History Tab */}
        {tab === "salary" && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {staff.payrolls.length === 0 ? (
              <div className="glass" style={{ padding: "4rem", textAlign: "center", borderRadius: "20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
                <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>No salary records yet.</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>Your salary history will appear here once processed by the owner.</p>
              </div>
            ) : (
              staff.payrolls.map((rec) => (
                <div key={rec.id} className="glass" style={{
                  padding: "1.5rem", borderRadius: "16px",
                  border: "1px solid var(--glass-border)",
                  display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center"
                }}>
                  {/* Month Label */}
                  <div style={{ flex: "0 0 auto" }}>
                    <div style={{
                      width: "56px", height: "56px", borderRadius: "14px",
                      background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))",
                      border: "1px solid rgba(139,92,246,0.2)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                    }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--brand-primary-light)", textTransform: "uppercase" }}>
                        {new Date(rec.monthYear + "-01").toLocaleString("en-IN", { month: "short" })}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--text-main)" }}>
                        {rec.monthYear.split("-")[0]}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <p style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.25rem" }}>{formatMonth(rec.monthYear)}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Released on {new Date(rec.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ padding: "0.15rem 0.6rem", background: "rgba(139,92,246,0.1)", color: "var(--brand-primary-light)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700 }}>
                        {rec.selectedMode} MODE
                      </span>
                      {rec.advancesDeducted > 0 && (
                        <span style={{ padding: "0.15rem 0.6rem", background: "rgba(244,63,94,0.08)", color: "var(--brand-secondary)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700 }}>
                          -₹{rec.advancesDeducted.toLocaleString("en-IN")} advance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Gross</p>
                      <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>₹{(rec.selectedMode === "STRICT" ? rec.strictSalary : rec.simpleSalary).toLocaleString("en-IN")}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Deducted</p>
                      <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--brand-secondary)" }}>-₹{rec.advancesDeducted.toLocaleString("en-IN")}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Net Pay</p>
                      <p style={{ fontWeight: 900, fontSize: "1.3rem", color: "#10b981" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
