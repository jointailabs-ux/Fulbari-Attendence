"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
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

interface ActivityEvent {
  type: string;
  time: string;
  label: string;
}

interface ActivityData {
  staffName: string;
  state: string;
  startTime: string | null;
  endTime: string | null;
  events: ActivityEvent[];
  totalBreakMins: number;
  netWorkHrs: string;
  breakCount: number;
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

const EVENT_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  SHIFT_START: { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "🟢" },
  BREAK_START: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "☕" },
  BREAK_END:   { color: "#06b6d4", bg: "rgba(6,182,212,0.12)",  icon: "▶️" },
  SHIFT_END:   { color: "#f43f5e", bg: "rgba(244,63,94,0.12)",  icon: "🔴" },
};

// ─── Advance Modal ────────────────────────────────────────────────────────────
function AdvanceModal({
  staff,
  onClose,
}: {
  staff: RosterItem;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, amount }),
      });
      if (res.ok) {
        setSuccess(true);
        setAmount("");
      } else {
        const d = await res.json();
        setError(d.error || "Failed to issue advance.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "rgba(14,14,22,0.97)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: "24px",
        width: "100%", maxWidth: "400px",
        padding: "2rem",
        boxShadow: "0 24px 60px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.6)",
        position: "relative",
        animation: "popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: "1rem", right: "1rem",
          background: "rgba(255,255,255,0.06)", border: "none",
          color: "var(--text-muted)", cursor: "pointer",
          width: "32px", height: "32px", borderRadius: "8px",
          fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{
            width: "46px", height: "46px", borderRadius: "12px",
            background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem",
          }}>💳</div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Issue Advance</p>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>{staff.name}</h3>
          </div>
        </div>

        {success ? (
          <div style={{
            textAlign: "center", padding: "2rem 1rem",
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "16px",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
            <p style={{ fontWeight: 700, color: "#10b981", marginBottom: "0.25rem" }}>Advance Issued!</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>The salary advance has been recorded.</p>
            <button onClick={onClose} style={{
              marginTop: "1.25rem", padding: "0.6rem 1.5rem",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "10px", color: "#10b981", fontWeight: 700, cursor: "pointer",
            }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>
                Amount (₹)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-muted)", fontWeight: 700, fontSize: "1rem",
                }}>₹</span>
                <input
                  type="number"
                  className="input-modern"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(""); }}
                  min="1"
                  style={{ paddingLeft: "2.2rem", fontSize: "1.1rem", fontWeight: 700, width: "100%" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>

            {error && (
              <p style={{ color: "#f43f5e", fontSize: "0.8rem", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "rgba(244,63,94,0.08)", borderRadius: "8px" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "0.7rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
              }}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !amount}
                style={{
                  flex: 2, padding: "0.7rem",
                  background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
                  border: "none", borderRadius: "12px",
                  color: "white", cursor: submitting || !amount ? "not-allowed" : "pointer",
                  fontWeight: 800, fontSize: "0.9rem",
                  opacity: submitting || !amount ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {submitting ? "⏳ Issuing..." : "Issue Advance"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Activity Modal ───────────────────────────────────────────────────────────
function ActivityModal({
  staff,
  date,
  onClose,
}: {
  staff: RosterItem;
  date: string;
  onClose: () => void;
}) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/v1/admin/staff-activity?staffId=${staff.id}&date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setActivity(data.activity);
      } catch {
        setErr("Could not load activity data.");
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [staff.id, date]);

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZone: "Asia/Kolkata",
      hour12: true,
    });
  };

  const formatDate = (d: string) => {
    if (!d) return "Today";
    const [y, m, day] = d.split("-");
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    return dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "rgba(14,14,22,0.98)",
        border: "1px solid rgba(6,182,212,0.25)",
        borderRadius: "24px",
        width: "100%", maxWidth: "460px",
        maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(6,182,212,0.15), 0 8px 32px rgba(0,0,0,0.7)",
        position: "relative",
        animation: "popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 1.75rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "rgba(255,255,255,0.06)", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
            width: "32px", height: "32px", borderRadius: "8px",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{
              width: "46px", height: "46px", borderRadius: "12px",
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem", flexShrink: 0,
            }}>📋</div>
            <div>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Daily Activity</p>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>{staff.name}</h3>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, paddingLeft: "0.1rem" }}>
            📅 {formatDate(date)}
          </p>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.75rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
              <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.85rem" }}>Loading activity...</p>
            </div>
          ) : err ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#f43f5e" }}>⚠️ {err}</div>
          ) : !activity ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍃</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No activity recorded for this day.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.6rem", marginBottom: "1.5rem",
              }}>
                {[
                  { label: "Work Hours", value: `${activity.netWorkHrs} hrs`, color: "#10b981" },
                  { label: "Break Time", value: `${activity.totalBreakMins} mins`, color: "#f59e0b" },
                  { label: "Breaks Taken", value: `${activity.breakCount}`, color: "#06b6d4" },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: "rgba(0,0,0,0.3)", borderRadius: "12px",
                    padding: "0.75rem 0.6rem", textAlign: "center",
                    border: `1px solid ${s.color}20`,
                  }}>
                    <p style={{ fontSize: "1rem", fontWeight: 900, color: s.color, margin: "0 0 0.15rem 0", fontFamily: "monospace" }}>{s.value}</p>
                    <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                Timeline
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {activity.events.map((ev, idx) => {
                  const style = EVENT_STYLES[ev.type] || EVENT_STYLES.SHIFT_START;
                  const isLast = idx === activity.events.length - 1;
                  return (
                    <div key={idx} style={{ display: "flex", gap: "0.75rem", position: "relative" }}>
                      {/* Left connector line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "32px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: style.bg, border: `2px solid ${style.color}60`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.9rem", flexShrink: 0, zIndex: 1,
                        }}>
                          {style.icon}
                        </div>
                        {!isLast && (
                          <div style={{
                            width: "2px", flex: 1, minHeight: "24px",
                            background: "rgba(255,255,255,0.06)", margin: "2px 0",
                          }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? "0" : "1rem" }}>
                        <div style={{
                          background: style.bg,
                          border: `1px solid ${style.color}20`,
                          borderRadius: "10px", padding: "0.65rem 0.9rem",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
                        }}>
                          <p style={{ fontWeight: 700, fontSize: "0.82rem", color: style.color, margin: 0 }}>{ev.label}</p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace", fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>
                            {formatTime(ev.time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current status if shift not ended */}
              {activity.state !== "SHIFT_ENDED" && (
                <div style={{
                  marginTop: "1rem", padding: "0.75rem 1rem",
                  background: "rgba(245,158,11,0.08)", border: "1px dashed rgba(245,158,11,0.3)",
                  borderRadius: "10px", textAlign: "center",
                }}>
                  <p style={{ fontSize: "0.78rem", color: "#f59e0b", fontWeight: 700, margin: 0 }}>
                    {activity.state === "ON_BREAK" ? "☕ Currently on break" : "🟢 Shift is still in progress"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.75rem",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0, display: "flex", gap: "0.75rem",
        }}>
          <Link href={`/admin/staff/${staff.id}`} style={{
            flex: 1, textAlign: "center", padding: "0.65rem",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 700,
            display: "block",
          }}>
            Full Profile ➔
          </Link>
          <button onClick={onClose} style={{
            flex: 1, padding: "0.65rem",
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            border: "none", borderRadius: "10px",
            color: "white", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DailyRosterMonitor({ roster }: { roster: RosterItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "PRESENT" | "BREAK" | "ENDED" | "ABSENT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("ALL");
  const [selectedSlot, setSelectedSlot] = useState("ALL");
  const [currentRoster, setCurrentRoster] = useState<RosterItem[]>(roster);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [advanceModal, setAdvanceModal] = useState<RosterItem | null>(null);
  const [activityModal, setActivityModal] = useState<RosterItem | null>(null);

  useEffect(() => {
    const localNow = new Date();
    const tzOffset = localNow.getTimezoneOffset() * 60000;
    const todayStr = new Date(localNow.getTime() - tzOffset).toISOString().split("T")[0];
    setSelectedDate(todayStr);
  }, []);

  useEffect(() => {
    setCurrentRoster(roster);
  }, [roster]);

  const fetchRosterForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/attendance?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentRoster(data.roster || []);
      }
    } catch (e) {
      console.error("Error loading roster for date:", e);
    } finally {
      setLoading(false);
    }
  };

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (selectedDate) {
      fetchRosterForDate(selectedDate);
    }
  }, [selectedDate]);

  const counts = {
    ALL: currentRoster.length,
    PRESENT: currentRoster.filter((r) => r.state === "SHIFT_STARTED").length,
    BREAK: currentRoster.filter((r) => r.state === "ON_BREAK").length,
    ENDED: currentRoster.filter((r) => r.state === "SHIFT_ENDED").length,
    ABSENT: currentRoster.filter((r) => r.state === "NOT_STARTED").length,
  };

  const uniqueOutlets = useMemo(() => {
    const outlets = currentRoster.map((r) => r.location).filter(Boolean);
    return Array.from(new Set(outlets));
  }, [currentRoster]);

  const uniqueSlots = useMemo(() => {
    const slots = currentRoster.map((r) => r.slotName).filter(Boolean);
    return Array.from(new Set(slots));
  }, [currentRoster]);

  const filteredRoster = useMemo(() => {
    return currentRoster.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slotName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filter !== "ALL") {
        if (filter === "PRESENT" && item.state !== "SHIFT_STARTED") return false;
        if (filter === "BREAK" && item.state !== "ON_BREAK") return false;
        if (filter === "ENDED" && item.state !== "SHIFT_ENDED") return false;
        if (filter === "ABSENT" && item.state !== "NOT_STARTED") return false;
      }

      if (selectedOutlet !== "ALL" && item.location !== selectedOutlet) return false;
      if (selectedSlot !== "ALL" && item.slotName !== selectedSlot) return false;

      return true;
    });
  }, [currentRoster, filter, searchQuery, selectedOutlet, selectedSlot]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: 0 }} className="text-gradient">Daily Attendance Monitor</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
              Real-time status roster of all active personnel.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          
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

          <input
            type="date"
            className="input-modern"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "150px", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}
          />

          <select
            className="input-modern"
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            style={{ width: "150px", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}
          >
            <option value="ALL">All Outlets</option>
            {uniqueOutlets.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <select
            className="input-modern"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            style={{ width: "150px", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}
          >
            <option value="ALL">All Slots</option>
            {uniqueSlots.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

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

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Loading roster...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍃</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No personnel found for the selected search & filter criteria.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
            {filteredRoster.map((item, idx) => {
              const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
              const badge = STATUS_MAP[item.state] || STATUS_MAP.NOT_STARTED;
              const hasActivity = item.state !== "NOT_STARTED";

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

                  {/* Action Buttons Row */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {/* Advance Button */}
                    <button
                      type="button"
                      onClick={() => setAdvanceModal(item)}
                      style={{
                        flex: 1, padding: "0.5rem 0.4rem",
                        background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(217,70,239,0.15))",
                        border: "1px solid rgba(139,92,246,0.25)",
                        borderRadius: "10px", cursor: "pointer",
                        fontSize: "0.72rem", fontWeight: 700,
                        color: "#a78bfa",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(217,70,239,0.3))";
                        e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(217,70,239,0.15))";
                        e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
                      }}
                    >
                      💳 Advance
                    </button>

                    {/* View Activity Button */}
                    <button
                      type="button"
                      onClick={() => hasActivity ? setActivityModal(item) : undefined}
                      disabled={!hasActivity}
                      title={!hasActivity ? "No activity recorded for this staff today" : "View today's activity timeline"}
                      style={{
                        flex: 1, padding: "0.5rem 0.4rem",
                        background: hasActivity
                          ? "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))"
                          : "rgba(255,255,255,0.02)",
                        border: hasActivity
                          ? "1px solid rgba(6,182,212,0.25)"
                          : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "10px",
                        cursor: hasActivity ? "pointer" : "not-allowed",
                        fontSize: "0.72rem", fontWeight: 700,
                        color: hasActivity ? "#67e8f9" : "var(--text-muted)",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                        opacity: hasActivity ? 1 : 0.5,
                      }}
                      onMouseEnter={e => {
                        if (!hasActivity) return;
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.28), rgba(59,130,246,0.28))";
                        e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)";
                      }}
                      onMouseLeave={e => {
                        if (!hasActivity) return;
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))";
                        e.currentTarget.style.borderColor = "rgba(6,182,212,0.25)";
                      }}
                    >
                      📋 Activity
                    </button>

                    {/* Manage Profile */}
                    <Link href={`/admin/staff/${item.id}`} style={{
                      flex: 1.2, textAlign: "center", padding: "0.5rem 0.4rem",
                      background: `linear-gradient(135deg, ${c1}15, ${c2}15)`,
                      border: `1px solid ${c1}20`, borderRadius: "10px",
                      fontSize: "0.72rem", fontWeight: 700, color: c1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s", gap: "0.25rem",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}25, ${c2}25)`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}15, ${c2}15)`; }}
                    >
                      👤 Profile
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}
        <style jsx global>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes popIn {
            from { opacity: 0; transform: scale(0.88) translateY(16px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </section>

      {/* Advance Modal */}
      {advanceModal && (
        <AdvanceModal staff={advanceModal} onClose={() => setAdvanceModal(null)} />
      )}

      {/* Activity Modal */}
      {activityModal && (
        <ActivityModal staff={activityModal} date={selectedDate} onClose={() => setActivityModal(null)} />
      )}
    </>
  );
}
