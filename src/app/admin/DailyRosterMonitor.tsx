"use client";
import React, { useState } from "react";

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

export default function DailyRosterMonitor({ roster }: { roster: RosterItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "PRESENT" | "BREAK" | "ENDED" | "ABSENT">("ALL");

  const counts = {
    ALL: roster.length,
    PRESENT: roster.filter((r) => r.state === "SHIFT_STARTED").length,
    BREAK: roster.filter((r) => r.state === "ON_BREAK").length,
    ENDED: roster.filter((r) => r.state === "SHIFT_ENDED").length,
    ABSENT: roster.filter((r) => r.state === "NOT_STARTED").length,
  };

  const filteredRoster = roster.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "PRESENT") return item.state === "SHIFT_STARTED";
    if (filter === "BREAK") return item.state === "ON_BREAK";
    if (filter === "ENDED") return item.state === "SHIFT_ENDED";
    if (filter === "ABSENT") return item.state === "NOT_STARTED";
    return true;
  });

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "SHIFT_STARTED":
        return (
          <span
            style={{
              padding: "0.4rem 0.8rem",
              background: "rgba(16, 185, 129, 0.08)",
              color: "var(--brand-accent)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              borderRadius: "100px",
              fontSize: "0.75rem",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--brand-accent)",
                boxShadow: "0 0 8px var(--brand-accent)",
                display: "inline-block",
              }}
            />
            Working / Present
          </span>
        );
      case "ON_BREAK":
        return (
          <span
            style={{
              padding: "0.4rem 0.8rem",
              background: "rgba(245, 158, 11, 0.08)",
              color: "#f59e0b",
              border: "1px solid rgba(245, 158, 11, 0.15)",
              borderRadius: "100px",
              fontSize: "0.75rem",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#f59e0b",
                boxShadow: "0 0 8px #f59e0b",
                display: "inline-block",
              }}
            />
            On Break
          </span>
        );
      case "SHIFT_ENDED":
        return (
          <span
            style={{
              padding: "0.4rem 0.8rem",
              background: "rgba(244, 63, 94, 0.08)",
              color: "var(--brand-secondary)",
              border: "1px solid rgba(244, 63, 94, 0.15)",
              borderRadius: "100px",
              fontSize: "0.75rem",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--brand-secondary)",
                display: "inline-block",
              }}
            />
            Shift Ended
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: "0.4rem 0.8rem",
              background: "rgba(255, 255, 255, 0.02)",
              color: "var(--text-muted)",
              border: "1px solid var(--glass-border)",
              borderRadius: "100px",
              fontSize: "0.75rem",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "inline-block",
              }}
            />
            Not Started / Absent
          </span>
        );
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", margin: 0 }} className="text-gradient">Daily Attendance Monitor</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
            Real-time status roster of all active personnel for today.
          </p>
        </div>

        {/* Tab Filters */}
        <div style={{ display: "flex", gap: "0.4rem", background: "rgba(255,255,255,0.02)", padding: "0.25rem", borderRadius: "12px", border: "1px solid var(--glass-border)", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All Staff", color: "var(--text-main)" },
            { id: "PRESENT", label: "Present", color: "var(--brand-accent)" },
            { id: "BREAK", label: "On Break", color: "#f59e0b" },
            { id: "ENDED", label: "Ended", color: "var(--brand-secondary)" },
            { id: "ABSENT", label: "Not Started", color: "var(--text-muted)" },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className="btn-modern"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.75rem",
                  borderRadius: "8px",
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  color: isActive ? tab.color : "var(--text-muted)",
                  border: isActive ? "1px solid var(--glass-border)" : "1px solid transparent",
                  fontWeight: isActive ? "700" : "600",
                  minWidth: "auto",
                }}
              >
                {tab.label} ({counts[tab.id as keyof typeof counts]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Roster Table */}
      <div className="table-container glass animate-slide-up">
        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Outlet Location</th>
              <th>Assignment Slot</th>
              <th>Attendance Status</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Break Time</th>
              <th>Work Time</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoster.map((item) => (
              <tr key={item.id}>
                <td data-label="Staff Member" style={{ fontWeight: "700", fontSize: "0.95rem" }}>{item.name}</td>
                <td data-label="Outlet Location">
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      background: "rgba(99, 102, 241, 0.05)",
                      color: "var(--brand-primary-light)",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    📍 {item.location}
                  </span>
                </td>
                <td data-label="Assignment Slot">
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {item.slotName}
                  </span>
                </td>
                <td data-label="Attendance Status">{getStatusBadge(item.state)}</td>
                <td data-label="Clock In" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {formatTime(item.startTime)}
                </td>
                <td data-label="Clock Out" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {formatTime(item.endTime)}
                </td>
                <td data-label="Break Time" style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "700", color: item.breakTimeStr !== "--" ? "#f59e0b" : "var(--text-muted)" }}>
                  {item.breakTimeStr}
                </td>
                <td data-label="Work Time" style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "800", color: item.workTimeStr !== "--" ? "var(--brand-accent)" : "var(--text-muted)" }}>
                  {item.workTimeStr}
                </td>
                <td data-label="Actions" style={{ textAlign: "right" }}>
                  <a
                    href={`/admin/staff/${item.id}`}
                    className="btn-modern btn-secondary"
                    style={{
                      display: "inline-block",
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                      borderRadius: "8px",
                      textDecoration: "none",
                    }}
                  >
                    Manage Profile ➔
                  </a>
                </td>
              </tr>
            ))}
            {filteredRoster.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🍃</div>
                  No personnel records match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
