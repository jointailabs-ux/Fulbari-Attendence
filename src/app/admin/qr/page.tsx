"use client";

import React, { useEffect, useState } from "react";

const GRAD_PALETTES = [
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#fb923c", "#fcd34d"],
  ["#10b981", "#06b6d4"],
];

const TerminalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

export default function SlotManagement() {
  const [slots, setSlots] = useState<any[]>([]);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newSlotName, setNewSlotName] = useState("");
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const slotsRes = await fetch("/api/v1/slots");
      setSlots(await slotsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/v1/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSlotName })
      });
      setIsSlotModalOpen(false);
      setNewSlotName("");
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/v1/slots/${editingSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingSlot.name })
      });
      setIsEditModalOpen(false);
      setEditingSlot(null);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? All associated staff assignment history for this slot will be lost.`)) {
      return;
    }
    try {
      await fetch(`/api/v1/slots/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </label>
  );

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Staff Slots</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage slots and terminal designations for the attendance roster.</p>
        </div>
        <button className="btn-modern btn-primary" onClick={() => setIsSlotModalOpen(true)} style={{ padding: "0.7rem 1.5rem", fontSize: "0.9rem" }}>
          + Add Slot
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {slots.map((slot: any, idx) => {
          const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
          const hasActiveStaff = slot.profiles?.some((p: any) => p.isActive);
          const assignedStaffName = slot.profiles?.filter((p: any) => p.isActive)[0]?.name;

          return (
            <div 
              key={slot.id} 
              style={{
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(12,12,18,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(20px)",
                padding: "1.25rem 1.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                position: "relative",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 12px 30px ${c1}18, 0 4px 20px rgba(0,0,0,0.5)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* Colored top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

              {/* Upper Section: Icon + Edit */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: `linear-gradient(135deg, ${c1}15, ${c2}15)`,
                  border: `1px solid ${c1}25`, color: c1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 10px ${c1}10`
                }}>
                  <TerminalIcon />
                </div>

                <button 
                  onClick={() => { setEditingSlot(slot); setIsEditModalOpen(true); }}
                  style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
                    color: "var(--text-muted)", borderRadius: "8px", padding: "0.35rem 0.6rem",
                    cursor: "pointer", fontSize: "0.65rem", fontWeight: "700", transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  EDIT
                </button>
              </div>

              {/* Designation Name */}
              <div style={{ marginTop: "0.25rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>{slot.name}</h3>
                <code style={{ fontSize: "0.65rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>
                  ID: {slot.id.slice(0, 8)}
                </code>
              </div>

              {/* Assignment Status Pill */}
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.3rem 0.7rem", borderRadius: "8px", width: "fit-content",
                background: hasActiveStaff ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${hasActiveStaff ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}`
              }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: hasActiveStaff ? "#10b981" : "rgba(255,255,255,0.2)"
                }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: hasActiveStaff ? "#10b981" : "var(--text-muted)" }}>
                  {hasActiveStaff ? `Assigned: ${assignedStaffName}` : "Unassigned"}
                </span>
              </div>
            </div>
          );
        })}

        {slots.length === 0 && (
          <div className="glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '6rem 2rem', borderRadius: "20px" }}>
             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
            <h2 style={{ marginBottom: '0.5rem' }}>No Slots Provisioned</h2>
            <p style={{ color: 'var(--text-muted)' }}>Start by adding your first slot.</p>
          </div>
        )}
      </div>

      {/* Modern New Slot Modal */}
      {isSlotModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSlotModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: "2rem" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>New Slot</h2>
              <button onClick={() => setIsSlotModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateSlot} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <FormLabel>Slot Designation</FormLabel>
                <input name="name" required className="input-modern" placeholder="e.g. Front Counter, Bar Terminal" value={newSlotName} onChange={(e) => setNewSlotName(e.target.value)} />
              </div>
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                {loading ? 'Initializing...' : 'Provision Slot'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Edit Slot Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingSlot(null); }}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: "2rem" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Update Slot</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingSlot(null); }} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdateSlot} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <FormLabel>Slot Designation</FormLabel>
                <input 
                  name="name" 
                  required 
                  className="input-modern" 
                  value={editingSlot?.name || ""} 
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                 <button type="button" onClick={() => handleDeleteSlot(editingSlot.id, editingSlot.name)} style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--brand-secondary)', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.18)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)"}>
                   🗑️
                 </button>
                 <button type="submit" className="btn-modern btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .bottom-nav-modern, .sidebar-modern, .btn-modern, header, .modal-overlay {
            display: none !important;
          }
          .glass {
            border: 1px solid #ddd !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            break-inside: avoid;
            margin-bottom: 2rem;
          }
          .text-gradient {
            -webkit-text-fill-color: initial !important;
            color: #000 !important;
          }
          .main-content {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
