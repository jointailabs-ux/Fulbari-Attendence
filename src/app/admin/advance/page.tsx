"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const GRAD_PALETTES = [
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#fb923c", "#fcd34d"],
  ["#10b981", "#06b6d4"],
  ["#f43f5e", "#fb7185"],
  ["#a855f7", "#6366f1"],
];

function Avatar({ name, index }: { name: string; index: number }) {
  const [c1, c2] = GRAD_PALETTES[index % GRAD_PALETTES.length];
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: "0.9rem", color: "white",
      boxShadow: `0 4px 10px ${c1}40`,
    }}>
      {initials}
    </div>
  );
}

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const activeAdvances = advances
    .filter((a: any) => a.isActive && a.status === 'PENDING')
    .filter((a: any) => a.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const historyAdvances = useMemo(() => {
    return advances.filter((a: any) => {
      const matchesStaff = filterStaffId ? a.staffId === filterStaffId : true;
      const matchesMonth = filterMonth ? a.date.startsWith(filterMonth) : true;
      const matchesSearch = a.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStaff && matchesMonth && matchesSearch;
    });
  }, [advances, filterStaffId, filterMonth, searchQuery]);

  const totalOutstanding = activeAdvances.reduce((sum, a) => sum + a.amount, 0);

  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </label>
  );

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* ── Header ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Advance Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Outstanding: <span style={{ color: 'var(--brand-secondary)', fontWeight: 800 }}>₹{totalOutstanding.toLocaleString("en-IN")}</span> across {activeAdvances.length} active settlements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/payroll" className="btn-modern btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
             Payroll Engine
          </Link>
          <button className="btn-modern btn-primary" onClick={() => setIsModalOpen(true)} style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
            + Log Advance
          </button>
        </div>
      </header>

      {/* ── Global Search Filter Bar ── */}
      <div style={{ position: "relative", width: "100%", maxWidth: "450px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="input-modern"
          placeholder="Search personnel by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: "2.3rem", paddingTop: "0.55rem", paddingBottom: "0.55rem", fontSize: "0.85rem" }}
        />
      </div>

      {/* ── Outstanding Advances Grid ── */}
      <section>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Pending Settlements</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Outstanding advances that will be auto-deducted in the next payroll run.</p>
        </div>

        
        {activeAdvances.length === 0 ? (
          <div className="glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💎</div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>All settled! No pending advances at the moment.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {activeAdvances.map((adv: any, idx) => {
              const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
              return (
                <div
                  key={adv.id}
                  style={{
                    borderRadius: "18px", overflow: "hidden",
                    background: "rgba(12,12,18,0.7)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backdropFilter: "blur(20px)",
                    padding: "1.1rem 1.25rem",
                    display: "flex", flexDirection: "column", gap: "0.75rem",
                    transition: "transform 0.2s, box-shadow 0.2s"
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
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Avatar name={adv.staff?.name || "Unknown"} index={idx} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adv.staff?.name}</p>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Issued: {new Date(adv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.12)", padding: "0.6rem 0.85rem", borderRadius: "10px" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand-secondary)" }}>OUTSTANDING</span>
                    <span style={{ fontSize: "1.3rem", fontWeight: 950, color: "var(--brand-secondary)" }}>-₹{adv.amount}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => { setEditingAdv(adv); setIsEditModalOpen(true); }}
                      style={{
                        flex: 1, padding: "0.45rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)", color: "var(--text-muted)", cursor: "pointer",
                        fontSize: "0.75rem", fontWeight: 700, transition: "all 0.2s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                      Adjust Amount
                    </button>
                    <button
                      onClick={() => toggleActive(adv)}
                      style={{
                        padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(244,63,94,0.15)",
                        background: "rgba(244,63,94,0.05)", color: "var(--brand-secondary)", cursor: "pointer",
                        fontSize: "0.75rem", fontWeight: 700, transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.05)"}
                    >
                      Void
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Transaction History List ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
             <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Transaction Log</h2>
             <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Historical archive of all advances.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select className="input-modern" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} value={filterStaffId} onChange={(e) => setFilterStaffId(e.target.value)}>
              <option value="">All Personnel</option>
              {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="month" className="input-modern" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
          </div>
        </div>
        
        {historyAdvances.length === 0 ? (
          <div className="glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ color: 'var(--text-muted)' }}>No transactions match the selected filters.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {historyAdvances.map((adv: any, idx) => {
              const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
              return (
                <div
                  key={adv.id}
                  style={{
                    display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem",
                    padding: "0.85rem 1.1rem", borderRadius: "14px",
                    background: "rgba(10,10,15,0.45)", border: "1px solid var(--glass-border)",
                    opacity: adv.isActive ? 1 : 0.45
                  }}
                >
                  <Avatar name={adv.staff?.name || "Unknown"} index={idx} />
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <p style={{ fontWeight: 800, fontSize: "0.95rem" }}>{adv.staff?.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Disbursed on {new Date(adv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Amount</p>
                      <p style={{ fontWeight: 900, fontSize: "1.1rem", color: adv.isActive ? "#ff6b8b" : "var(--text-muted)" }}>
                        ₹{adv.amount}
                      </p>
                    </div>
                    <div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.3rem",
                        padding: "0.25rem 0.6rem", borderRadius: "6px",
                        background: adv.isActive ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${adv.isActive ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}`
                      }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: adv.isActive ? "#10b981" : "rgba(255,255,255,0.3)" }} />
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: adv.isActive ? "#10b981" : "var(--text-muted)", textTransform: "uppercase" }}>
                          {adv.isActive ? 'Active' : 'Voided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Add Advance Modal ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: "2rem" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
               <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Log Advance</h2>
               <button onClick={() => setIsModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <FormLabel>Personnel Selection</FormLabel>
                <select name="staffId" required className="input-modern" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                  <option value="">Choose Staff Member...</option>
                  {staffList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Advance Amount (₹)</FormLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>₹</span>
                  <input name="amount" required type="number" step="0.01" className="input-modern" style={{ paddingLeft: '2rem' }} placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Authorize Disbursement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Advance Modal ── */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingAdv(null); }}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: "2rem" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
               <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Adjust Record</h2>
               <button onClick={() => { setIsEditModalOpen(false); setEditingAdv(null); }} className="modal-close">&times;</button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
               <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: "0.05em" }}>Target Personnel</p>
               <p style={{ fontWeight: '800', fontSize: '1.05rem' }}>{editingAdv?.staff?.name}</p>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <FormLabel>Revised Amount (₹)</FormLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>₹</span>
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
              <button type="submit" className="btn-modern btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Update Ledger Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
