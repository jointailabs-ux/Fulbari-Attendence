"use client";

import React, { useEffect, useState, useMemo } from "react";

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
      width: "42px", height: "42px", borderRadius: "12px", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: "0.95rem", color: "white",
      boxShadow: `0 4px 10px ${c1}33`,
    }}>
      {initials}
    </div>
  );
}

export default function AdminLeavesManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/v1/admin/leaves");
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (e) {
      console.error("Error loading leave requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    const actionText = status === "APPROVED" ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${actionText} this leave request?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewedBy: "ADMIN_PORTAL",
        }),
      });

      if (res.ok) {
        alert(`Leave request ${actionText}d successfully!`);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process request");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch = r.staff.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [requests, filterStatus, searchQuery]);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  };

  return (
    <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      
      {/* ── Header ── */}
      <header>
        <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>Leave Requests</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Review, approve, or reject employee leave applications. Approved leaves are treated as paid days in the payroll engine.
        </p>
      </header>

      {/* ── Search + Filter Pills ── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
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

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "0.3rem", background: "rgba(255,255,255,0.02)", padding: "0.2rem", borderRadius: "10px", border: "1px solid var(--glass-border)", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All", color: "var(--text-main)", bg: "transparent" },
            { id: "PENDING", label: "Pending", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
            { id: "APPROVED", label: "Approved", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            { id: "REJECTED", label: "Rejected", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as any)}
                style={{
                  padding: "0.4rem 0.85rem", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontWeight: 800, fontSize: "0.75rem", fontFamily: "var(--font-heading)",
                  background: isActive ? tab.bg || "rgba(255,255,255,0.05)" : "transparent",
                  color: isActive ? tab.color : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label} ({counts[tab.id as keyof typeof counts]})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Request Grid ── */}
      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Loading leave requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🍃</div>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            {searchQuery ? `No requests matching "${searchQuery}"` : `No leave requests in this category.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "1rem" }}>
          {filteredRequests.map((req, idx) => {
            const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
            const startStr = new Date(req.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            const endStr = new Date(req.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            
            const statusColors = 
              req.status === "APPROVED" ? { text: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" } :
              req.status === "REJECTED" ? { text: "#f43f5e", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.15)" } :
              { text: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.2)" };

            return (
              <div
                key={req.id}
                style={{
                  borderRadius: "18px", overflow: "hidden",
                  background: "rgba(12,12,18,0.75)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(20px)",
                  padding: "1.25rem",
                  display: "flex", flexDirection: "column", gap: "0.75rem",
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 10px 25px ${c1}12, 0 4px 15px rgba(0,0,0,0.4)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                {/* Profile row */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Avatar name={req.staff.name} index={idx} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req.staff.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      🏷️ {req.staff.slot?.name || "No Slot"} · 📍 {req.staff.slot?.outlet?.name || "No Location"}
                    </p>
                  </div>
                </div>

                {/* Date range details */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem",
                  background: "rgba(0,0,0,0.2)", padding: "0.65rem 0.85rem", borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.03)"
                }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Start Date</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace" }}>{startStr}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>End Date</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace" }}>{endStr}</span>
                  </div>
                </div>

                {/* Reason description box */}
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "0.65rem 0.75rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                    Reason & Duration ({req.type === "FULL" ? "Full Day" : "Half Day"})
                  </span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-main)", margin: 0 }}>{req.reason}</p>
                </div>

                {/* Footer status / review buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <span style={{
                    padding: "0.25rem 0.6rem", borderRadius: "6px",
                    background: statusColors.bg, border: `1px solid ${statusColors.border}`,
                    fontSize: "0.7rem", fontWeight: 800, color: statusColors.text
                  }}>
                    {req.status}
                  </span>

                  {req.status === "PENDING" && (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        onClick={() => handleReview(req.id, "REJECTED")}
                        style={{
                          padding: "0.4rem 0.8rem", borderRadius: "8px",
                          border: "1px solid rgba(244,63,94,0.25)", background: "rgba(244,63,94,0.05)",
                          color: "#f43f5e", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, transition: "all 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.05)"}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(req.id, "APPROVED")}
                        style={{
                          padding: "0.4rem 0.8rem", borderRadius: "8px",
                          border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)",
                          color: "#10b981", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, transition: "all 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.18)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
