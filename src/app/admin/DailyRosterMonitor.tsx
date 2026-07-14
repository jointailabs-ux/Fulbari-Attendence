"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";

interface RosterItem {
  id: string;
  name: string;
  slotName: string;
  location: string;
  state: "NOT_STARTED" | "SHIFT_STARTED" | "ON_BREAK" | "SHIFT_ENDED";
  startTime: string | null;
  endTime: string | null;
  breakTimeStr?: string;
  workTimeStr?: string;
}

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
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: "0.95rem", color: "white",
      boxShadow: `0 4px 10px ${c1}40`,
    }}>
      {initials}
    </div>
  );
}

const STATUS_MAP = {
  SHIFT_STARTED: { label: "Working / Present", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", icon: "🟢" },
  ON_BREAK: { label: "On Break", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", icon: "🟡" },
  SHIFT_ENDED: { label: "Shift Ended", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.1)", icon: "🔴" },
  NOT_STARTED: { label: "Not Started / Absent", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.08)", icon: "⚪" },
};

export default function DailyRosterMonitor({ roster }: { roster: RosterItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "PRESENT" | "BREAK" | "ENDED" | "ABSENT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = {
    ALL: roster.length,
    PRESENT: roster.filter((r) => r.state === "SHIFT_STARTED").length,
    BREAK: roster.filter((r) => r.state === "ON_BREAK").length,
    ENDED: roster.filter((r) => r.state === "SHIFT_ENDED").length,
    ABSENT: roster.filter((r) => r.state === "NOT_STARTED").length,
  };

  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      // 1. Search Query Filter
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slotName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (filter === "ALL") return true;
      if (filter === "PRESENT") return item.state === "SHIFT_STARTED";
      if (filter === "BREAK") return item.state === "ON_BREAK";
      if (filter === "ENDED") return item.state === "SHIFT_ENDED";
      if (filter === "ABSENT") return item.state === "NOT_STARTED";
      return true;
    });
  }, [roster, filter, searchQuery]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* ── Title Area ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", margin: 0 }} className="text-gradient">Daily Attendance Monitor</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
            Real-time status roster of all active personnel for today.
          </p>
        </div>
      </div>

      {/* ── Filters & Search Bar Row ── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="input-modern"
            placeholder="Search working staff, location, slot…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.3rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem" }}
          />
        </div>

        {/* Tab Filters */}
        <div style={{ display: "flex", gap: "0.3rem", background: "rgba(255,255,255,0.02)", padding: "0.2rem", borderRadius: "10px", border: "1px solid var(--glass-border)", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All", color: "var(--text-main)" },
            { id: "PRESENT", label: "Working", color: "var(--brand-accent)" },
            { id: "BREAK", label: "Break", color: "#f59e0b" },
            { id: "ENDED", label: "Ended", color: "var(--brand-secondary)" },
            { id: "ABSENT", label: "Absent", color: "var(--text-muted)" },
          ].map((tab) => {
            const isActive = filter === tab.id;
            const statusStyle = STATUS_MAP[tab.id === "PRESENT" ? "SHIFT_STARTED" : tab.id === "BREAK" ? "ON_BREAK" : tab.id === "ENDED" ? "SHIFT_ENDED" : tab.id === "ABSENT" ? "NOT_STARTED" : "NOT_STARTED"];
            const activeColor = tab.id === "ALL" ? "var(--brand-primary-light)" : statusStyle.color;
            
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-heading)",
                  fontWeight: isActive ? 800 : 600,
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  color: isActive ? activeColor : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label} ({counts[tab.id as keyof typeof counts]})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Cards Grid ── */}
      {filteredRoster.length === 0 ? (
        <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍃</div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No personnel found for the selected search & filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
          {filteredRoster.map((item, idx) => {
            const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
            const badge = STATUS_MAP[item.state] || STATUS_MAP.NOT_STARTED;

            return (
              <div
                key={item.id}
                style={{
                  borderRadius: "18px", overflow: "hidden",
                  background: "rgba(12,12,18,0.7)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(20px)",
                  padding: "1.1rem 1.25rem",
                  display: "flex", flexDirection: "column", gap: "0.75rem",
                  position: "relative",
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
                {/* Top border accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                {/* Avatar + Profile Title Row */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Avatar name={item.name} index={idx} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      🏷️ {item.slotName}
                    </p>
                  </div>
                </div>

                {/* Info Location & Status Badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span style={{
                    padding: "0.2rem 0.55rem", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px",
                    fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600
                  }}>
                    📍 {item.location}
                  </span>
                  
                  <span style={{
                    padding: "0.25rem 0.6rem", borderRadius: "6px",
                    background: badge.bg, border: `1px solid ${badge.color}25`,
                    fontSize: "0.68rem", fontWeight: 800, color: badge.color,
                    display: "inline-flex", alignItems: "center", gap: "0.25rem"
                  }}>
                    <span>{badge.icon}</span> {badge.label}
                  </span>
                </div>

                {/* Grid stats: Check-in, Out, Break & Work Duration */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem",
                  background: "rgba(0,0,0,0.2)", padding: "0.65rem 0.85rem", borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.03)"
                }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Clock In</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace" }}>{formatTime(item.startTime)}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Clock Out</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace" }}>{formatTime(item.endTime)}</span>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.4rem", marginTop: "0.1rem" }}>
                    <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Break</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace", color: item.breakTimeStr !== "--" ? "#f59e0b" : "var(--text-muted)" }}>
                      {item.breakTimeStr}
                    </span>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.4rem", marginTop: "0.1rem" }}>
                    <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Worked</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 900, fontFamily: "monospace", color: item.workTimeStr !== "--" ? "var(--brand-accent)" : "var(--text-muted)" }}>
                      {item.workTimeStr}
                    </span>
                  </div>
                </div>

                {/* Footer Action link */}
                <Link href={`/admin/staff/${item.id}`} style={{
                  textAlign: "center", padding: "0.5rem",
                  background: `linear-gradient(135deg, ${c1}15, ${c2}15)`,
                  border: `1px solid ${c1}20`, borderRadius: "10px",
                  fontSize: "0.78rem", fontWeight: 700, color: c1,
                  display: "block", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}25, ${c2}25)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}15, ${c2}15)`; }}
                >
                  Manage Profile ➔
                </Link>

              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
