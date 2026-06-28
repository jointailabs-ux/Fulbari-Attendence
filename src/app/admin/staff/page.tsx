"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pin: "",
    monthlySalary: "",
    slotId: "",
    location: "Restaurant"
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/v1/staff-onboard-data");
      const data = await res.json();
      if (data) {
        setStaffList(data.staffList || []);
        setSlots(data.slots || []);
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen) {
      fetchData();
    }
  }, [isAddModalOpen, isEditModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setEditingStaff({ 
      ...editingStaff, 
      [name]: type === 'checkbox' ? (e.target as any).checked : value 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      setIsAddModalOpen(false);
      setFormData({ name: "", phone: "", pin: "", monthlySalary: "", slotId: "", location: "Restaurant" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/v1/staff/${editingStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStaff)
      });
      setIsEditModalOpen(false);
      setEditingStaff(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will permanently remove all their attendance and payroll history.`)) {
      return;
    }
    try {
      await fetch(`/api/v1/staff/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Personnel Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your workforce deployment and slot assignments.</p>
        </div>
        <button className="btn-modern btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <span style={{ fontSize: '1.2rem' }}>+</span> Onboard New Staff
        </button>
      </header>

      {/* Staff List */}
      <section>
        <div className="table-container glass">
          <table>
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Work Location</th>
                <th>Assigned Slot</th>
                <th>Base Salary</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff: any) => (
                <tr key={staff.id} style={{ opacity: staff.isActive ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--brand-primary-light)' }}>
                        {staff.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: '600' }}>{staff.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>{staff.location || "Default"}</span>
                  </td>
                  <td>
                    <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500' }}>
                      {staff.slot?.name || "Pending Slot"}
                    </span>
                  </td>
                  <td style={{ fontWeight: '500' }}>₹{staff.monthlySalary}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: staff.isActive ? 'var(--brand-accent)' : 'var(--brand-secondary)' }}></div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{staff.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link href={`/admin/staff/${staff.id}`} className="btn-modern btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Profile
                      </Link>
                      <button onClick={() => { setEditingStaff(staff); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(staff.id, staff.name)} style={{ background: 'none', border: 'none', color: 'var(--brand-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>
                        Drop
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
                    No staff records found. Start by onboarding someone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modern Add Staff Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>Onboard Staff</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Work Location</label>
                  <select name="location" required className="input-modern" value={formData.location} onChange={handleInputChange}>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Cafe Hub">Cafe Hub</option>
                    <option value="Chai Hub">Chai Hub</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Slot Assignment</label>
                  <select name="slotId" required className="input-modern" value={formData.slotId} onChange={handleInputChange}>
                    <option value="">Choose Slot</option>
                    {availableSlots.map((slot: any) => (
                      <option key={slot.id} value={slot.id}>{slot.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Full Legal Name</label>
                <input name="name" required className="input-modern" placeholder="e.g. John Smith" value={formData.name} onChange={handleInputChange} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Phone Identity</label>
                  <input name="phone" required className="input-modern" placeholder="+91 00000 00000" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Security PIN (4 Digits)</label>
                  <input name="pin" required type="password" maxLength={4} className="input-modern" placeholder="••••" value={formData.pin} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Monthly Salary Commitment (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                  <input name="monthlySalary" required type="number" step="1" className="input-modern" style={{ paddingLeft: '2rem' }} placeholder="25000" value={formData.monthlySalary} onChange={handleInputChange} />
                </div>
              </div>
              
              <button type="submit" className="btn-modern btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                Finalize Onboarding
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Edit Staff Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingStaff(null); }}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>Update Profile</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingStaff(null); }} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem' }}>Active Employment</label>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Toggle to disable account and free slot.</p>
                </div>
                <div 
                  onClick={() => setEditingStaff({...editingStaff, isActive: !editingStaff.isActive})}
                  style={{ 
                    width: '48px', 
                    height: '24px', 
                    background: editingStaff.isActive ? 'var(--brand-accent)' : 'rgba(255,255,255,0.05)', 
                    borderRadius: '20px', 
                    position: 'relative', 
                    cursor: 'pointer',
                    border: '1px solid var(--glass-border)',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    background: 'white', 
                    borderRadius: '50%', 
                    position: 'absolute', 
                    top: '2px', 
                    left: editingStaff.isActive ? '26px' : '2px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Location</label>
                  <select name="location" required className="input-modern" value={editingStaff.location} onChange={handleEditInputChange}>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Cafe Hub">Cafe Hub</option>
                    <option value="Chai Hub">Chai Hub</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Slot Assignment</label>
                  <select name="slotId" required className="input-modern" value={editingStaff.slotId} onChange={handleEditInputChange} disabled={!editingStaff.isActive}>
                    {slots.map((slot: any) => {
                      const isOtherAssigned = staffList.some(s => s.slotId === slot.id && s.id !== editingStaff.id && s.isActive);
                      if (isOtherAssigned) return null;
                      return <option key={slot.id} value={slot.id}>{slot.name}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Legal Name</label>
                <input name="name" required className="input-modern" value={editingStaff.name} onChange={handleEditInputChange} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Security Override PIN</label>
                <input name="pin" type="password" maxLength={4} className="input-modern" placeholder="Leave blank to maintain current" value={editingStaff.pin || ""} onChange={handleEditInputChange} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Adjusted Base Salary (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                  <input name="monthlySalary" required type="number" step="1" className="input-modern" style={{ paddingLeft: '2rem' }} value={editingStaff.monthlySalary} onChange={handleEditInputChange} />
                </div>
              </div>
              
              <button type="submit" className="btn-modern btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                Apply Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
