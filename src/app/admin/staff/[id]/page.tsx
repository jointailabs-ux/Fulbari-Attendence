"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import OverviewTab from "./OverviewTab";
import AttendanceTab from "./AttendanceTab";
import AdvancesTab from "./AdvancesTab";
import DocumentsTab from "./DocumentsTab";
import PayrollTab from "./PayrollTab";
import BiometricsTab from "./BiometricsTab";
import LeavesTab from "./LeavesTab";

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
    { id: "overview",    label: "Profile",    short: "Profile",    icon: "👤" },
    { id: "attendance", label: "Attendance",  short: "Attend.",   icon: "📅" },
    { id: "advances",   label: "Advances",   short: "Advances",  icon: "💰" },
    { id: "leaves",     label: "Leaves",     short: "Leaves",    icon: "📝" },
    { id: "payroll",    label: "Financials", short: "Finance",   icon: "📑" },
    { id: "documents",  label: "Documents",  short: "Docs",      icon: "📂" },
    { id: "biometrics", label: "Biometrics", short: "Biometrics",icon: "🧬" },
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
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>{staff.slot?.outlet?.name || "Unknown"}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
               <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--brand-accent)', letterSpacing: '0.05em' }}>EMPLOYMENT STATUS</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '800' }}>{staff.isActive ? 'ACTIVE' : 'INACTIVE'}</p>
            </div>
        </div>
      </header>

      {/* Responsive Tabs Navigation */}
      <style>{`
        .profile-tab-nav {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.4rem;
          padding: 0.5rem;
          border-radius: 20px;
        }
        .profile-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          padding: 0.6rem 0.3rem;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          white-space: nowrap;
          background: transparent;
          color: var(--text-muted);
        }
        .profile-tab-btn.active {
          background: var(--brand-primary);
          color: white;
          box-shadow: 0 4px 15px rgba(99,102,241,0.35);
        }
        .profile-tab-btn:hover:not(.active) {
          background: rgba(255,255,255,0.07);
          color: var(--text-primary);
        }
        .profile-tab-icon { font-size: 1.2rem; }
        @media (max-width: 640px) {
          .profile-tab-nav {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.4rem;
          }
          .profile-tab-btn {
            padding: 0.7rem 0.25rem;
            font-size: 0.6rem;
            border-radius: 12px;
          }
          .profile-tab-icon { font-size: 1.3rem; }
        }
      `}</style>
      <nav className="glass profile-tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`profile-tab-btn${activeTab === tab.id ? ' active' : ''}`}
          >
            <span className="profile-tab-icon">{tab.icon}</span>
            <span>{tab.short}</span>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="tab-content" style={{ minHeight: '400px' }}>
        {activeTab === "overview" && <OverviewTab staff={staff} refresh={fetchProfile} />}
        {activeTab === "attendance" && <AttendanceTab staffId={id} />}
        {activeTab === "advances" && <AdvancesTab staffId={id} />}
        {activeTab === "leaves" && <LeavesTab staffId={id} />}
        {activeTab === "payroll" && <PayrollTab staffId={id} />}
        {activeTab === "documents" && <DocumentsTab staffId={id} />}
        {activeTab === "biometrics" && <BiometricsTab staff={staff} refresh={fetchProfile} />}
      </div>

    </div>
  );
}
