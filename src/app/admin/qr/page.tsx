"use client";

import React, { useEffect, useState } from "react";

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Staff Slots</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage staff slot assignments for the attendance system.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-modern btn-primary" onClick={() => setIsSlotModalOpen(true)}>
            <span style={{ fontSize: '1.2rem' }}>+</span> Add New Slot
          </button>
        </div>
      </header>

      <div className="grid-auto">
        {slots.map((slot: any) => (
          <div key={slot.id} className="glass glass-hover" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
              <button 
                onClick={() => { setEditingSlot(slot); setIsEditModalOpen(true); }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700' }}
              >
                EDIT
              </button>
            </div>

            <div style={{ 
              width: '80px', height: '80px', 
              background: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              fontSize: '2rem',
            }}>
              👆
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{slot.name}</h3>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              marginBottom: '1.5rem' 
            }}>
              <div style={{ 
                width: '8px', height: '8px', borderRadius: '50%',
                background: slot.profiles?.some((p: any) => p.isActive) ? 'var(--brand-accent)' : 'rgba(255,255,255,0.1)'
              }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {slot.profiles?.filter((p: any) => p.isActive).length > 0 
                  ? `Assigned to ${slot.profiles.filter((p: any) => p.isActive)[0]?.name}` 
                  : 'Unassigned'
                }
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>SLOT ID</p>
              <code style={{ fontSize: '0.7rem', color: 'var(--brand-primary-light)', wordBreak: 'break-all' }}>{slot.id.slice(0, 8)}...</code>
            </div>
          </div>
        ))}

        {slots.length === 0 && (
          <div className="glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '6rem 2rem' }}>
             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
            <h2 style={{ marginBottom: '0.5rem' }}>No Terminals Provisioned</h2>
            <p style={{ color: 'var(--text-muted)' }}>Start by adding your first counter or staff slot.</p>
          </div>
        )}
      </div>

      {/* Modern New Slot Modal */}
      {isSlotModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSlotModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>New Terminal</h2>
              <button onClick={() => setIsSlotModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateSlot} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Terminal Designation</label>
                <input name="name" required className="input-modern" placeholder="e.g. Front Counter, Bar Terminal" value={newSlotName} onChange={(e) => setNewSlotName(e.target.value)} />
              </div>
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Initializing...' : 'Provision Terminal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Edit Slot Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingSlot(null); }}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>Update Terminal</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingSlot(null); }} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdateSlot} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Terminal Designation</label>
                <input 
                  name="name" 
                  required 
                  className="input-modern" 
                  value={editingSlot?.name || ""} 
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button type="button" onClick={() => handleDeleteSlot(editingSlot.id, editingSlot.name)} style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--brand-secondary)', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer' }}>
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
