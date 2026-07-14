"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const GRAD_PALETTES = [
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#f43f5e", "#fb923c"],
  ["#10b981", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#a855f7", "#6366f1"],
];

function Avatar({ name, index }: { name: string; index: number }) {
  const [c1, c2] = GRAD_PALETTES[index % GRAD_PALETTES.length];
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: "46px", height: "46px", borderRadius: "14px", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: "1rem", color: "white",
      boxShadow: `0 4px 14px ${c1}55`,
    }}>
      {initials}
    </div>
  );
}

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [formData, setFormData] = useState({ name: "", phone: "", pin: "", monthlySalary: "", slotId: "" });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/v1/staff-onboard-data");
      const data = await res.json();
      if (data) {
        setStaffList(data.staffList || []);
        setSlots(data.slots || []);
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (isAddModalOpen || isEditModalOpen) fetchData(); }, [isAddModalOpen, isEditModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setEditingStaff({ ...editingStaff, [name]: type === "checkbox" ? (e.target as any).checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/v1/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      setIsAddModalOpen(false);
      setFormData({ name: "", phone: "", pin: "", monthlySalary: "", slotId: "" });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/v1/staff/${editingStaff.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingStaff) });
      setIsEditModalOpen(false); setEditingStaff(null); fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This will permanently remove all their records.`)) return;
    try { await fetch(`/api/v1/staff/${id}`, { method: "DELETE" }); fetchData(); }
    catch (e) { console.error(e); }
  };

  const filtered = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone || "").includes(search) ||
        (s.slot?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.slot?.outlet?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && s.isActive) ||
        (filterStatus === "inactive" && !s.isActive);
      return matchSearch && matchStatus;
    });
  }, [staffList, search, filterStatus]);

  const activeCount = staffList.filter((s) => s.isActive).length;

  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </label>
  );

  return (
    <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>Personnel Hub</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <span style={{ color: "#10b981", fontWeight: 700 }}>{activeCount} active</span> · {staffList.length} total staff
          </p>
        </div>
        <button className="btn-modern btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: "0.7rem 1.5rem", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
          + Onboard Staff
        </button>
      </header>

      {/* ── Search + Filter Bar ── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="input-modern"
            placeholder="Search name, phone, slot, outlet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.75rem", paddingTop: "0.7rem", paddingBottom: "0.7rem", fontSize: "0.9rem" }}
          />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: "flex", gap: "0.4rem", background: "rgba(255,255,255,0.03)", padding: "0.3rem", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              style={{
                padding: "0.4rem 0.9rem", borderRadius: "8px", border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: "0.8rem", fontFamily: "var(--font-heading)",
                textTransform: "capitalize",
                background: filterStatus === f
                  ? f === "active" ? "rgba(16,185,129,0.15)" : f === "inactive" ? "rgba(244,63,94,0.15)" : "rgba(139,92,246,0.15)"
                  : "transparent",
                color: filterStatus === f
                  ? f === "active" ? "#10b981" : f === "inactive" ? "var(--brand-secondary)" : "var(--brand-primary-light)"
                  : "var(--text-muted)",
                transition: "all 0.2s ease",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {search && (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Staff Grid ── */}
      {filtered.length === 0 ? (
        <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔍</div>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            {search ? `No staff matching "${search}"` : "No staff found. Start by onboarding someone."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {filtered.map((staff, idx) => {
            const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
            return (
              <div
                key={staff.id}
                style={{
                  borderRadius: "18px", overflow: "hidden",
                  background: "rgba(12,12,18,0.7)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  opacity: staff.isActive ? 1 : 0.55,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  position: "relative",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 35px ${c1}22, 0 4px 20px rgba(0,0,0,0.5)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)"; }}
              >
                {/* Colored top accent bar */}
                <div style={{ height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                {/* Card Body */}
                <div style={{ padding: "1rem 1.1rem" }}>
                  {/* Top row: avatar + name + status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                    <Avatar name={staff.name} index={idx} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{staff.name}</p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {staff.phone}
                      </p>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.25rem 0.6rem", borderRadius: "50px",
                      background: staff.isActive ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.08)",
                      border: `1px solid ${staff.isActive ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.2)"}`,
                    }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: staff.isActive ? "#10b981" : "var(--brand-secondary)", boxShadow: staff.isActive ? "0 0 6px #10b981" : "none" }} />
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, color: staff.isActive ? "#10b981" : "var(--brand-secondary)" }}>
                        {staff.isActive ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                  </div>

                  {/* Info chips row */}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
                    <span style={{ padding: "0.2rem 0.55rem", background: `${c1}18`, border: `1px solid ${c1}30`, borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, color: c1, whiteSpace: "nowrap" }}>
                      {staff.slot?.name || "No Slot"}
                    </span>
                    <span style={{ padding: "0.2rem 0.55rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {staff.slot?.outlet?.name || "—"}
                    </span>
                    <span style={{ padding: "0.2rem 0.55rem", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>
                      ₹{Number(staff.monthlySalary).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Link href={`/admin/staff/${staff.id}`} style={{
                      flex: 1, textAlign: "center", padding: "0.5rem",
                      background: `linear-gradient(135deg, ${c1}22, ${c2}22)`,
                      border: `1px solid ${c1}33`, borderRadius: "10px",
                      fontSize: "0.78rem", fontWeight: 700, color: c1,
                      transition: "all 0.2s",
                    }}>
                      View Profile
                    </Link>
                    <button
                      onClick={() => { setEditingStaff(staff); setIsEditModalOpen(true); }}
                      style={{ padding: "0.5rem 0.75rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, transition: "all 0.2s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(staff.id, staff.name)}
                      style={{ padding: "0.5rem 0.75rem", borderRadius: "10px", border: "1px solid rgba(244,63,94,0.15)", background: "rgba(244,63,94,0.05)", color: "var(--brand-secondary)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, opacity: 0.75, transition: "all 0.2s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.12)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.05)"; }}
                    >
                      Drop
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Staff Modal ── */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <h2 className="text-gradient" style={{ fontSize: "1.5rem" }}>Onboard Staff</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <FormLabel>Slot Assignment</FormLabel>
                <select name="slotId" required className="input-modern" value={formData.slotId} onChange={handleInputChange}>
                  <option value="">Choose Slot</option>
                  {availableSlots.map((slot: any) => (
                    <option key={slot.id} value={slot.id}>{slot.name} ({slot.outlet?.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Full Name</FormLabel>
                <input name="name" required className="input-modern" placeholder="e.g. Ravi Kumar" value={formData.name} onChange={handleInputChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <FormLabel>Phone</FormLabel>
                  <input name="phone" required className="input-modern" placeholder="+91 98765 43210" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div>
                  <FormLabel>Security PIN (6 digits)</FormLabel>
                  <input name="pin" required type="password" maxLength={6} className="input-modern" placeholder="••••••" value={formData.pin} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <FormLabel>Monthly Salary (₹)</FormLabel>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700 }}>₹</span>
                  <input name="monthlySalary" required type="number" step="1" className="input-modern" style={{ paddingLeft: "2rem" }} placeholder="25000" value={formData.monthlySalary} onChange={handleInputChange} />
                </div>
              </div>
              <button type="submit" className="btn-modern btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
                Finalize Onboarding
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Staff Modal ── */}
      {isEditModalOpen && editingStaff && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingStaff(null); }}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <h2 className="text-gradient" style={{ fontSize: "1.5rem" }}>Edit · {editingStaff.name}</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingStaff(null); }} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Active toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.85rem" }}>Active Employment</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Toggle to suspend and free their slot.</p>
                </div>
                <div onClick={() => setEditingStaff({ ...editingStaff, isActive: !editingStaff.isActive })}
                  style={{ width: "46px", height: "24px", background: editingStaff.isActive ? "var(--brand-accent)" : "rgba(255,255,255,0.05)", borderRadius: "20px", position: "relative", cursor: "pointer", border: "1px solid var(--glass-border)", transition: "background 0.3s" }}>
                  <div style={{ width: "18px", height: "18px", background: "white", borderRadius: "50%", position: "absolute", top: "2px", left: editingStaff.isActive ? "24px" : "2px", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
              </div>
              <div>
                <FormLabel>Slot Assignment</FormLabel>
                <select name="slotId" required className="input-modern" value={editingStaff.slotId} onChange={handleEditInputChange} disabled={!editingStaff.isActive}>
                  {slots.map((slot: any) => {
                    const isOtherAssigned = staffList.some(s => s.slotId === slot.id && s.id !== editingStaff.id && s.isActive);
                    if (isOtherAssigned) return null;
                    return <option key={slot.id} value={slot.id}>{slot.name} ({slot.outlet?.name})</option>;
                  })}
                </select>
              </div>
              <div>
                <FormLabel>Legal Name</FormLabel>
                <input name="name" required className="input-modern" value={editingStaff.name} onChange={handleEditInputChange} />
              </div>
              <div>
                <FormLabel>Security PIN (6 digits) — leave blank to keep</FormLabel>
                <input name="pin" type="password" maxLength={6} className="input-modern" placeholder="••••••" value={editingStaff.pin || ""} onChange={handleEditInputChange} />
              </div>
              <div>
                <FormLabel>Monthly Salary (₹)</FormLabel>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700 }}>₹</span>
                  <input name="monthlySalary" required type="number" step="1" className="input-modern" style={{ paddingLeft: "2rem" }} value={editingStaff.monthlySalary} onChange={handleEditInputChange} />
                </div>
              </div>
              <button type="submit" className="btn-modern btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>Apply Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
