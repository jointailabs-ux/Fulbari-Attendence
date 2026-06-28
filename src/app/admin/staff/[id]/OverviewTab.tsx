// src/app/admin/staff/[id]/OverviewTab.tsx
"use client";

import React, { useState, useEffect } from "react";

interface FormData {
  name: string;
  phone: string;
  monthlySalary: number;
  emergencyContact: string;
  address: string;
  slotId: string;
  location: string;
  isActive: boolean;
  pin: string; // blank by default, overwrites when provided
}

export default function OverviewTab({ staff, refresh }: { staff: any; refresh: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: staff.name || '',
    phone: staff.phone || '',
    monthlySalary: staff.monthlySalary || 0,
    emergencyContact: staff.emergencyContact || '',
    address: staff.address || '',
    slotId: staff.slotId || '',
    location: staff.location || 'Restaurant',
    isActive: staff.isActive !== undefined ? staff.isActive : true,
    pin: ''
  });

  // Fetch slots roster for dropdown select
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch("/api/v1/slots");
        const data = await res.json();
        setSlots(data);
      } catch (e) {
        console.error("Error loading slot slots:", e);
      }
    };
    fetchSlots();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        monthlySalary: Number(formData.monthlySalary),
        emergencyContact: formData.emergencyContact,
        address: formData.address,
        slotId: formData.slotId,
        location: formData.location,
        isActive: formData.isActive
      };

      if (formData.pin.trim()) {
        if (!/^\d{4}$/.test(formData.pin.trim())) {
          alert("PIN must be exactly 4 digits.");
          return;
        }
        payload.pin = formData.pin.trim();
      }

      const res = await fetch(`/api/v1/staff/${staff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditing(false);
        setFormData(prev => ({ ...prev, pin: '' })); // reset pin input
        refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update record");
      }
    } catch (e) {
      console.error(e);
      alert("Network error occurred.");
    }
  };

  const metrics = [
    { label: "Attendance Reliability", value: `${staff.metrics?.attendanceRate || 0}%`, color: "var(--brand-primary-light)", icon: "📈" },
    { label: "Deployment Days", value: staff.metrics?.totalDaysWorked || 0, color: "var(--brand-accent)", icon: "📅" },
    { label: "Absence Record", value: staff.metrics?.totalLeaves?.total || 0, color: "var(--brand-secondary)", icon: "🚫" },
    { label: "Financial Exposure", value: `₹${staff.metrics?.totalAdvanceTaken || 0}`, color: "#f59e0b", icon: "💰" },
  ];

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Metrics Grid */}
      <div className="grid-auto">
        {metrics.map((m, i) => (
          <div key={i} className="glass stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <span className="stat-label">{m.label}</span>
               <span style={{ fontSize: '1.25rem' }}>{m.icon}</span>
            </div>
            <h3 className="stat-value" style={{ color: m.color }}>{m.value}</h3>
          </div>
        ))}
      </div>

      {/* Details Card */}
      <section className="glass" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem' }} className="text-gradient">Personnel Profile</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Core identification and employment records.</p>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`btn-modern ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
            style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
          >
            {isEditing ? "Discard Changes" : "Modify Record"}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Legal Name</label>
              <input 
                className="input-modern" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Contact Identifier (Phone)</label>
              <input 
                className="input-modern" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Base Remuneration (Monthly Salary in ₹)</label>
              <input 
                className="input-modern" 
                type="number" 
                value={formData.monthlySalary} 
                onChange={(e) => setFormData({...formData, monthlySalary: Number(e.target.value)})} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Active Shift Slot</label>
              <select 
                className="input-modern"
                value={formData.slotId}
                onChange={(e) => setFormData({...formData, slotId: e.target.value})}
                required
              >
                <option value="">Select Shift Slot...</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.outlet?.name || 'Main'})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Primary Assignment Location</label>
              <select 
                className="input-modern"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                required
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Cafe Hub">Cafe Hub</option>
                <option value="Chai Hub">Chai Hub</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Employment Status</label>
              <select 
                className="input-modern"
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) => setFormData({...formData, isActive: e.target.value === "active"})}
                required
              >
                <option value="active">Active (Permitted Clock-ins)</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Overriding security PIN (4 digits)</label>
              <input 
                className="input-modern" 
                type="password"
                maxLength={4}
                placeholder="•••• (Leave blank to keep existing PIN)"
                value={formData.pin} 
                onChange={(e) => setFormData({...formData, pin: e.target.value})} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Emergency Protocol Contact</label>
              <input 
                className="input-modern" 
                placeholder="Name or Contact Info"
                value={formData.emergencyContact} 
                onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} 
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Residential Address</label>
              <textarea 
                className="input-modern" 
                style={{ minHeight: '80px', resize: 'vertical' }} 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%' }}>Update Permanent Record</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            <DetailItem label="Official Name" value={staff.name} />
            <DetailItem label="Verified Phone" value={staff.phone} />
            <DetailItem label="Active Slot" value={staff.slot?.name || "UNASSIGNED"} />
            <DetailItem label="Primary Location" value={staff.location} />
            <DetailItem label="Monthly Salary" value={`₹${staff.monthlySalary}`} />
            <DetailItem label="Activation Date" value={new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <DetailItem label="Emergency Dispatch" value={staff.emergencyContact || "No data provided"} />
            <DetailItem label="Primary Residency" value={staff.address || "No data provided"} />
          </div>
        )}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{value}</p>
    </div>
  );
}
