"use client";

import React, { useState } from "react";

interface StaffInfo {
  id: string;
  name: string;
  extra?: string;
}

interface DashboardStatsProps {
  activeStaff: StaffInfo[];
  onBreakStaff: StaffInfo[];
  pendingAdvances: StaffInfo[];
  totalMonthlyExpense: number;
  totalAdvancesThisMonth: number;
  totalExpectedSalary: number;
  totalPendingAdvancesAmount: number;
}

// ─── Glowing SVG Icons ────────────────────────────────────────────────────────
const SVGIcons = {
  Active: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Break: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  Paid: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  AdvanceMonth: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  NetPay: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Debt: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  )
};

export default function DashboardStats({
  activeStaff,
  onBreakStaff,
  pendingAdvances,
  totalMonthlyExpense,
  totalAdvancesThisMonth,
  totalExpectedSalary,
  totalPendingAdvancesAmount,
}: DashboardStatsProps) {
  const [modalData, setModalData] = useState<{
    title: string;
    staff: StaffInfo[];
  } | null>(null);

  const stats = [
    {
      label: "Active Staff Today",
      count: activeStaff.length,
      data: activeStaff,
      icon: SVGIcons.Active,
      gradient: ["#8b5cf6", "#d946ef"], // Purple to Magenta
    },
    {
      label: "On Break Today",
      count: onBreakStaff.length,
      data: onBreakStaff,
      icon: SVGIcons.Break,
      gradient: ["#fb923c", "#fcd34d"], // Orange to Yellow
    },
    {
      label: "Salary Paid This Month",
      count: `₹${totalMonthlyExpense.toLocaleString("en-IN")}`,
      data: [],
      icon: SVGIcons.Paid,
      gradient: ["#10b981", "#34d399"], // Emerald to Mint
      noModal: true
    },
    {
      label: "Advances This Month",
      count: `₹${totalAdvancesThisMonth.toLocaleString("en-IN")}`,
      data: [],
      icon: SVGIcons.AdvanceMonth,
      gradient: ["#f43f5e", "#fb7185"], // Rose to Pink
      noModal: true
    },
    {
      label: "Net Salary Payable",
      count: `₹${Math.max(0, totalExpectedSalary - (totalPendingAdvancesAmount || 0)).toLocaleString("en-IN")}`,
      data: [],
      icon: SVGIcons.NetPay,
      gradient: ["#06b6d4", "#3b82f6"], // Cyan to Blue
      noModal: true
    },
    {
      label: "Advances Outstanding",
      count: `₹${(totalPendingAdvancesAmount || 0).toLocaleString("en-IN")}`,
      data: pendingAdvances,
      icon: SVGIcons.Debt,
      gradient: ["#ec4899", "#f472b6"], // Magenta to Light Pink
    },
  ];

  return (
    <>
      <div className="grid-auto">
        {stats.map((stat, idx) => {
          const [c1, c2] = stat.gradient;
          return (
            <div
              key={stat.label}
              className="glass"
              style={{
                cursor: stat.noModal ? "default" : "pointer",
                position: "relative",
                overflow: "hidden",
                borderRadius: "18px",
                background: "rgba(12,12,18,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(20px)",
                padding: "1.25rem 1.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                opacity: 1,
              }}
              onMouseEnter={e => {
                if (!stat.noModal) {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 12px 30px ${c1}18, 0 4px 20px rgba(0,0,0,0.5)`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
              onClick={() => !stat.noModal && setModalData({ title: stat.label, staff: stat.data })}
            >
              {/* Colored top accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                background: `linear-gradient(90deg, ${c1}, ${c2})`
              }} />

              {/* Upper row: Label + Icon */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
                <span style={{
                  color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.06em", display: "block"
                }}>
                  {stat.label}
                </span>
                
                {/* SVG Icon Box */}
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: `linear-gradient(135deg, ${c1}15, ${c2}15)`,
                  border: `1px solid ${c1}25`, color: c1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 10px ${c1}10`
                }}>
                  <stat.icon />
                </div>
              </div>

              {/* Stat Value */}
              <h3 style={{
                fontSize: "1.75rem", fontWeight: 900, fontFamily: "var(--font-heading)",
                background: `linear-gradient(to right, ${c1}, ${c2})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                {stat.count}
              </h3>

              {/* Footer View details */}
              {!stat.noModal && (
                <div style={{
                  marginTop: "0.25rem", fontSize: "0.72rem", fontWeight: 700,
                  color: c1, display: "flex", alignItems: "center", gap: "0.2rem"
                }}>
                  View details <span style={{ transition: "transform 0.2s" }}>→</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalData && (
        <div className="modal-overlay" onClick={() => setModalData(null)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 className="text-gradient" style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                  {modalData.title}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Real-time snapshot of personnel status.
                </p>
              </div>
              <button className="modal-close" onClick={() => setModalData(null)}>
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {modalData.staff.length > 0 ? (
                modalData.staff.map((s) => (
                  <div key={s.id} style={{ 
                    padding: "0.85rem 1rem", 
                    background: "rgba(255,255,255,0.02)", 
                    borderRadius: "12px", 
                    border: "1px solid var(--glass-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{s.name}</span>
                    {s.extra && (
                      <span style={{ fontSize: "0.75rem", color: "var(--brand-primary-light)", fontWeight: 700, background: "rgba(139,92,246,0.1)", padding: "0.15rem 0.5rem", borderRadius: "6px", border: "1px solid rgba(139,92,246,0.15)" }}>
                        {s.extra}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🍃</div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No records in this category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
