"use client";

import React, { useEffect, useState } from "react";

const GRAD_PALETTES = [
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#fb923c", "#fcd34d"],
  ["#10b981", "#06b6d4"],
];

export default function LeavesTab({ staffId }: { staffId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`/api/v1/leaves/request?staffId=${staffId}`);
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (e) {
      console.error("Error fetching staff leaves:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [staffId]);

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
        fetchLeaves();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process request");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  if (loading) return <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading leave requests...</div>;

  return (
    <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>Leave Applications</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Track and manage leave requests filed by this staff member.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>No leave applications on file.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {requests.map((req, idx) => {
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
                  padding: "1.1rem 1.25rem",
                  display: "flex", flexDirection: "column", gap: "0.75rem",
                  position: "relative",
                  transition: "transform 0.2s"
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800 }}>
                      {startStr} {startStr !== endStr ? `to ${endStr}` : ""}
                    </h3>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                      Duration: <strong style={{ color: "#fff" }}>{req.type === "FULL" ? "Full Day" : "Half Day"}</strong>
                    </p>
                  </div>
                  <span style={{
                    padding: "0.2rem 0.55rem", borderRadius: "6px",
                    background: statusColors.bg, border: `1px solid ${statusColors.border}`,
                    fontSize: "0.68rem", fontWeight: 800, color: statusColors.text
                  }}>
                    {req.status}
                  </span>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: "0.55rem 0.7rem", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                  <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.15rem" }}>Reason</span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-main)", margin: 0 }}>{req.reason}</p>
                </div>

                {req.status === "PENDING" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <button
                      onClick={() => handleReview(req.id, "REJECTED")}
                      style={{
                        flex: 1, padding: "0.4rem", borderRadius: "8px",
                        border: "1px solid rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.04)",
                        color: "#f43f5e", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.04)"}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "APPROVED")}
                      style={{
                        flex: 1, padding: "0.4rem", borderRadius: "8px",
                        border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)",
                        color: "#10b981", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.15)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.08)"}
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
