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
      icon: "⚡",
      gradient: "linear-gradient(135deg, #8b5cf6, #c084fc)"
    },
    {
      label: "On Break Today",
      count: onBreakStaff.length,
      data: onBreakStaff,
      icon: "☕",
      gradient: "linear-gradient(135deg, #fb923c, #fcd34d)"
    },
    {
      label: "Salary Paid This Month",
      count: `₹${totalMonthlyExpense.toLocaleString('en-IN')}`,
      data: [],
      icon: "💳",
      gradient: "linear-gradient(135deg, #10b981, #34d399)",
      noModal: true
    },
    {
      label: "Advances Issued This Month",
      count: `₹${totalAdvancesThisMonth.toLocaleString('en-IN')}`,
      data: [],
      icon: "💰",
      gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
      noModal: true
    },
    {
      label: "Net Salary Payable (After Advances)",
      count: `₹${Math.max(0, totalExpectedSalary - (totalPendingAdvancesAmount || 0)).toLocaleString('en-IN')}`,
      data: [],
      icon: "📊",
      gradient: "linear-gradient(135deg, #6366f1, #818cf8)",
      noModal: true
    },
    {
      label: "Advances Paid (Total)",
      count: `₹${(totalPendingAdvancesAmount || 0).toLocaleString('en-IN')}`,
      data: pendingAdvances,
      icon: "💸",
      gradient: "linear-gradient(135deg, #f43f5e, #fb7185)"
    },
  ];

  return (
    <>
      <div className="grid-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass glass-hover stat-card"
            style={{ cursor: stat.noModal ? "default" : "pointer", position: 'relative', overflow: 'hidden' }}
            onClick={() => !stat.noModal && setModalData({ title: stat.label, staff: stat.data })}
          >
            <div style={{ 
              position: 'absolute', 
              top: '-10px', 
              right: '-10px', 
              fontSize: '4rem', 
              opacity: 0.05,
              transform: 'rotate(15deg)'
            }}>
              {stat.icon}
            </div>
            
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value" style={{ 
              background: stat.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {stat.count}
            </span>
            
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--brand-primary-light)' }}>
              VIEW DETAILS →
            </div>
          </div>
        ))}
      </div>

      {modalData && (
        <div className="modal-overlay" onClick={() => setModalData(null)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <button className="modal-close" onClick={() => setModalData(null)}>
              &times;
            </button>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }} className="text-gradient">
              {modalData.title}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: '2rem' }}>
              Real-time snapshot of personnel status.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {modalData.staff.length > 0 ? (
                modalData.staff.map((s) => (
                  <div key={s.id} style={{ 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <span style={{ fontWeight: "600", fontSize: '1rem' }}>{s.name}</span>
                    {s.extra && (
                      <span style={{ fontSize: "0.8rem", color: "var(--brand-primary-light)", fontWeight: '500' }}>
                        {s.extra}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🍃</div>
                  <p style={{ color: "var(--text-muted)" }}>No staff members in this category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
