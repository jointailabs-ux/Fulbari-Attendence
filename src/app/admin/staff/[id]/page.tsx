"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import OverviewTab from "./OverviewTab";
import AttendanceTab from "./AttendanceTab";
import AdvancesTab from "./AdvancesTab";
import DocumentsTab from "./DocumentsTab";
import PayrollTab from "./PayrollTab";
import BiometricsTab from "./BiometricsTab";

export default function EmployeeProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/v1/staff/${id}`);
      const data = await res.json();
      setStaff(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Synchronizing profile data...</div>;
  if (!staff) return <div style={{ padding: '4rem', textAlign: 'center' }}>Personnel record not found.</div>;

  const tabs = [
    { id: "overview", label: "Profile", icon: "👤" },
    { id: "attendance", label: "Attendance", icon: "📅" },
    { id: "advances", label: "Debt/Advances", icon: "💰" },
    { id: "payroll", label: "Financials", icon: "📑" },
    { id: "documents", label: "Documents", icon: "📂" },
    { id: "biometrics", label: "Biometrics", icon: "🧬" },
  ];

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/admin/staff" style={{ color: 'var(--brand-primary-light)', fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>←</span> BACK TO ROSTER
            </Link>
          </div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{staff.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
              {staff.slot?.name || "UNASSIGNED"}
            </span>
            <span style={{ width: '6px', height: '6px', background: 'var(--glass-border)', borderRadius: '50%' }}></span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>{staff.location}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
               <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--brand-accent)', letterSpacing: '0.05em' }}>EMPLOYMENT STATUS</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '800' }}>{staff.isActive ? 'ACTIVE' : 'INACTIVE'}</p>
            </div>
        </div>
      </header>

      {/* Modern Tabs Navigation */}
      <nav className="glass" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: '20px', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn-modern ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              flex: 1, 
              padding: '0.75rem 1.5rem', 
              fontSize: '0.85rem', 
              borderRadius: '16px',
              border: 'none',
              background: activeTab === tab.id ? undefined : 'transparent'
            }}
          >
            <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="tab-content" style={{ minHeight: '400px' }}>
        {activeTab === "overview" && <OverviewTab staff={staff} refresh={fetchProfile} />}
        {activeTab === "attendance" && <AttendanceTab staffId={id} />}
        {activeTab === "advances" && <AdvancesTab staffId={id} />}
        {activeTab === "payroll" && <PayrollTab staffId={id} />}
        {activeTab === "documents" && <DocumentsTab staffId={id} />}
        {activeTab === "biometrics" && <BiometricsTab staff={staff} refresh={fetchProfile} />}
      </div>
    </div>
  );
}
