"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function FinancialsManagement() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ staffId: "", amount: "" });
  const [editingAdv, setEditingAdv] = useState<any>(null);
  
  // Filters
  const [filterStaffId, setFilterStaffId] = useState("");
  const [filterMonth, setFilterMonth] = useState(""); // YYYY-MM

  const fetchData = async () => {
    try {
      const [advRes, staffRes] = await Promise.all([
        fetch("/api/v1/advance"),
        fetch("/api/v1/staff")
      ]);
      const [advData, staffData] = await Promise.all([
        advRes.json(),
        staffRes.json()
      ]);
      setAdvances(advData);
      setStaffList(staffData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/v1/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ staffId: "", amount: "" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/v1/advance/${editingAdv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAdv)
      });
      setIsEditModalOpen(false);
      setEditingAdv(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleActive = async (adv: any) => {
    try {
      await fetch(`/api/v1/advance/${adv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !adv.isActive })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const activeAdvances = advances.filter((a: any) => a.isActive && a.status === 'PENDING');
  
  const historyAdvances = advances.filter((a: any) => {
    const matchesStaff = filterStaffId ? a.staffId === filterStaffId : true;
    const matchesMonth = filterMonth ? a.date.startsWith(filterMonth) : true;
    return matchesStaff && matchesMonth;
  });

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Financial Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Track advances, salary disbursements, and personnel liquidity.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/payroll" className="btn-modern btn-secondary">
             Payroll Engine
          </Link>
          <button className="btn-modern btn-primary" onClick={() => setIsModalOpen(true)}>
            <span style={{ fontSize: '1.2rem' }}>+</span> Log Advance
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        {/* Active Advances */}
        <section>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Pending Settlements</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Outstanding advances that will be deducted in the next payroll cycle.</p>
          </div>
          
          <div className="table-container glass">
            <table>
              <thead>
                <tr>
                  <th>Personnel Member</th>
                  <th>Outstanding Amount</th>
                  <th>Disbursement Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeAdvances.map((adv: any) => (
                  <tr key={adv.id}>
                    <td style={{ fontWeight: '600' }}>{adv.staff?.name}</td>
                    <td style={{ color: 'var(--brand-secondary)', fontWeight: '800' }}>-₹{adv.amount}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(adv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingAdv(adv); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--brand-primary-light)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Adjust</button>
                        <button onClick={() => toggleActive(adv)} style={{ background: 'none', border: 'none', color: 'var(--brand-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Void</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeAdvances.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💎</div>
                      All clear! No pending advances at the moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* History Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
               <h2 style={{ fontSize: '1.5rem' }}>Transaction History</h2>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Archive of all financial movements.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select className="input-modern" style={{ width: 'auto', padding: '0.5rem 1rem' }} value={filterStaffId} onChange={(e) => setFilterStaffId(e.target.value)}>
                <option value="">All Personnel</option>
                {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="month" className="input-modern" style={{ width: 'auto', padding: '0.5rem 1rem' }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
            </div>
          </div>
          
          <div className="table-container glass">
            <table>
              <thead>
                <tr>
                  <th>Personnel</th>
                  <th>Amount</th>
                  <th>Transaction Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyAdvances.map((adv: any) => (
                  <tr key={adv.id} style={{ opacity: adv.isActive ? 1 : 0.4 }}>
                    <td style={{ fontWeight: '500' }}>{adv.staff?.name}</td>
                    <td style={{ fontWeight: '700' }}>₹{adv.amount}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(adv.date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: adv.isActive ? 'var(--brand-accent)' : 'var(--text-muted)' }}></div>
                         <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                           {adv.isActive ? 'Active' : 'Voided'}
                         </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modern Add Advance Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>Log Advance</h2>
               <button onClick={() => setIsModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Personnel Selection</label>
                <select name="staffId" required className="input-modern" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                  <option value="">Choose Staff Member...</option>
                  {staffList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Advance Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                  <input name="amount" required type="number" step="0.01" className="input-modern" style={{ paddingLeft: '2rem' }} placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>
              
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Authorize Disbursement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Edit Advance Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingAdv(null); }}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>Adjust Record</h2>
               <button onClick={() => { setIsEditModalOpen(false); setEditingAdv(null); }} className="modal-close">&times;</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>TARGET PERSONNEL</p>
               <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>{editingAdv?.staff?.name}</p>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Revised Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                  <input 
                    name="amount" 
                    required 
                    type="number" 
                    step="0.01" 
                    className="input-modern" 
                    style={{ paddingLeft: '2rem' }}
                    value={editingAdv?.amount || ""} 
                    onChange={(e) => setEditingAdv({...editingAdv, amount: e.target.value})} 
                  />
                </div>
              </div>
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Update Ledger Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
