"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";

interface BreakLog {
  id: string;
  startTime: string;
  endTime: string | null;
}

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
  breaks: BreakLog[];
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
  SHIFT_STARTED: { label: "Working / Present", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "🟢" },
  ON_BREAK:      { label: "On Break",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "🟡" },
  SHIFT_ENDED:   { label: "Shift Ended",       color: "#f43f5e", bg: "rgba(244,63,94,0.1)",  icon: "🔴" },
  NOT_STARTED:   { label: "Not Started / Absent", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", icon: "⚪" },
};

// Event colours for timeline
const EV_STYLE: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  SHIFT_START: { dot: "#10b981", bg: "rgba(16,185,129,0.13)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
  BREAK_START: { dot: "#f59e0b", bg: "rgba(245,158,11,0.13)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  BREAK_END:   { dot: "#06b6d4", bg: "rgba(6,182,212,0.13)",  text: "#67e8f9", border: "rgba(6,182,212,0.25)"  },
  SHIFT_END:   { dot: "#f43f5e", bg: "rgba(244,63,94,0.13)",  text: "#fb7185", border: "rgba(244,63,94,0.25)"  },
};

// ─── Advance Modal ────────────────────────────────────────────────────────────
function AdvanceModal({ staff, onClose }: { staff: RosterItem; onClose: () => void }) {
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
      if (res.ok) { setSuccess(true); setAmount(""); }
      else { const d = await res.json(); setError(d.error || "Failed to issue advance."); }
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "rgba(9,9,16,0.98)", border: "1px solid rgba(139,92,246,0.28)", borderRadius: "24px",
        width: "100%", maxWidth: "380px", padding: "2rem",
        boxShadow: "0 32px 80px rgba(139,92,246,0.18), 0 8px 32px rgba(0,0,0,0.6)",
        position: "relative", animation: "popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,0.06)", border: "none", color: "var(--text-muted)", cursor: "pointer", width: "30px", height: "30px", borderRadius: "8px", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "linear-gradient(135deg, #8b5cf6, #d946ef)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>💳</div>
          <div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Issue Advance</p>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>{staff.name}</h3>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "16px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
            <p style={{ fontWeight: 700, color: "#10b981", marginBottom: "0.25rem" }}>Advance Issued!</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>The salary advance has been recorded.</p>
            <button onClick={onClose} style={{ marginTop: "1.25rem", padding: "0.6rem 1.5rem", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", color: "#10b981", fontWeight: 700, cursor: "pointer" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>Amount (₹)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700, fontSize: "1rem" }}>₹</span>
                <input type="number" className="input-modern" placeholder="e.g. 500" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} min="1" style={{ paddingLeft: "2.2rem", fontSize: "1.1rem", fontWeight: 700, width: "100%" }} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
              </div>
            </div>
            {error && <p style={{ color: "#f43f5e", fontSize: "0.8rem", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "rgba(244,63,94,0.08)", borderRadius: "8px" }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onClose} style={{ flex: 1, padding: "0.7rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !amount} style={{ flex: 2, padding: "0.7rem", background: "linear-gradient(135deg, #8b5cf6, #d946ef)", border: "none", borderRadius: "12px", color: "white", cursor: submitting || !amount ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.9rem", opacity: submitting || !amount ? 0.6 : 1, transition: "opacity 0.2s" }}>
                {submitting ? "⏳ Issuing..." : "Issue Advance"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Activity Modal — timeline design matching screenshot ─────────────────────
function ActivityModal({ staff, date, onClose }: { staff: RosterItem; date: string; onClose: () => void }) {
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const hasActivity = staff.state !== "NOT_STARTED" && !!staff.startTime;

  // Net work hours from inline roster data — no extra API call
  let workHoursDisplay = "--";
  if (staff.startTime) {
    const start = new Date(staff.startTime).getTime();
    const end   = staff.endTime ? new Date(staff.endTime).getTime() : Date.now();
    let brkMs = 0;
    staff.breaks.forEach(b => { brkMs += (b.endTime ? new Date(b.endTime).getTime() : Date.now()) - new Date(b.startTime).getTime(); });
    workHoursDisplay = (Math.max(0, end - start - brkMs) / 3600000).toFixed(2);
  }

  // Full date label
  const dateLabel = (() => {
    if (!date) return "Today";
    const [y, m, d] = date.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  })();

  // Build timeline
  type TLEv = { type: string; time: string; label: string };
  const events: TLEv[] = [];
  if (staff.startTime) events.push({ type: "SHIFT_START", time: staff.startTime, label: "Shift Started" });
  staff.breaks.forEach((b, i) => {
    events.push({ type: "BREAK_START", time: b.startTime, label: `Break ${i + 1} Started` });
    if (b.endTime) events.push({ type: "BREAK_END", time: b.endTime, label: `Break ${i + 1} Ended` });
  });
  if (staff.endTime) events.push({ type: "SHIFT_END", time: staff.endTime, label: "Shift Ended" });
  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "rgba(9,9,16,0.98)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px", width: "100%", maxWidth: "390px", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", animation: "popIn 0.28s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "1.3rem 1.4rem 0.9rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: "linear-gradient(135deg, #06b6d4, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>📋</div>
              <div>
                <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.1rem 0" }}>Daily Activity</p>
                <h3 style={{ fontSize: "1rem", fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{staff.name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "var(--text-muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "7px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            >✕</button>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.6rem 0 0 0" }}>📅 {dateLabel}</p>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.1rem 1.4rem 0.6rem" }}>
          {!hasActivity ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍃</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No activity recorded for this day.</p>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.45rem", marginBottom: "1.3rem" }}>
                {[
                  { value: `${workHoursDisplay} hrs`, label: "WORK HOURS",   color: "#06b6d4" },
                  { value: staff.breakTimeStr || "--", label: "BREAK TIME",   color: "#f59e0b" },
                  { value: String(staff.breaks.length), label: "BREAKS TAKEN", color: "#ffffff" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "0.8rem 0.3rem", textAlign: "center" }}>
                    <p style={{ fontSize: "0.95rem", fontWeight: 900, color: s.color, margin: "0 0 0.18rem 0", fontFamily: "monospace", lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline label */}
              <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8rem" }}>Timeline</p>

              {/* Timeline events */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {events.map((ev, idx) => {
                  const s = EV_STYLE[ev.type] || EV_STYLE.SHIFT_START;
                  const isLast = idx === events.length - 1;
                  return (
                    <div key={idx} style={{ display: "flex", gap: "0.6rem" }}>
                      {/* Dot + connector line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "22px", flexShrink: 0 }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: s.dot, boxShadow: `0 0 10px ${s.dot}70`, border: `3px solid ${s.dot}35`, marginTop: "5px", flexShrink: 0 }} />
                        {!isLast && <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "rgba(255,255,255,0.07)", margin: "3px 0" }} />}
                      </div>
                      {/* Pill */}
                      <div style={{ flex: 1, paddingBottom: isLast ? "0" : "0.55rem" }}>
                        <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "10px", padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: s.text }}>{ev.label}</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtTime(ev.time)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active shift notice */}
              {staff.state !== "SHIFT_ENDED" && (
                <div style={{ marginTop: "0.9rem", padding: "0.55rem 1rem", background: "rgba(245,158,11,0.07)", border: "1px dashed rgba(245,158,11,0.25)", borderRadius: "10px", textAlign: "center" }}>
                  <p style={{ fontSize: "0.73rem", color: "#f59e0b", fontWeight: 700, margin: 0 }}>
                    {staff.state === "ON_BREAK" ? "☕ Currently on break" : "🟢 Shift is still in progress"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.85rem 1.4rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <Link
            href={`/admin/staff/${staff.id}`}
            style={{ flex: 1, textAlign: "center", padding: "0.65rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            Full Profile →
          </Link>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "0.65rem", background: "linear-gradient(135deg, #06b6d4, #3b82f6)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", transition: "opacity 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            Close
          </button>
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
  const [advanceModal, setAdvanceModal] = useState<RosterItem | null>(null);
  const [activityModal, setActivityModal] = useState<RosterItem | null>(null);

  useEffect(() => {
    const localNow = new Date();
    const tzOffset = localNow.getTimezoneOffset() * 60000;
    setSelectedDate(new Date(localNow.getTime() - tzOffset).toISOString().split("T")[0]);
  }, []);

  useEffect(() => { setCurrentRoster(roster); }, [roster]);

  const fetchRosterForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/attendance?date=${dateStr}`);
      if (res.ok) { const data = await res.json(); setCurrentRoster(data.roster || []); }
    } catch (e) { console.error("Error loading roster for date:", e); }
    finally { setLoading(false); }
  };

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    if (selectedDate) fetchRosterForDate(selectedDate);
  }, [selectedDate]);

  const counts = {
    ALL:     currentRoster.length,
    PRESENT: currentRoster.filter(r => r.state === "SHIFT_STARTED").length,
    BREAK:   currentRoster.filter(r => r.state === "ON_BREAK").length,
    ENDED:   currentRoster.filter(r => r.state === "SHIFT_ENDED").length,
    ABSENT:  currentRoster.filter(r => r.state === "NOT_STARTED").length,
  };

  const uniqueOutlets = useMemo(() => Array.from(new Set(currentRoster.map(r => r.location).filter(Boolean))), [currentRoster]);
  const uniqueSlots   = useMemo(() => Array.from(new Set(currentRoster.map(r => r.slotName).filter(Boolean))), [currentRoster]);

  const filteredRoster = useMemo(() => currentRoster.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slotName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter !== "ALL") {
      if (filter === "PRESENT" && item.state !== "SHIFT_STARTED") return false;
      if (filter === "BREAK"   && item.state !== "ON_BREAK")      return false;
      if (filter === "ENDED"   && item.state !== "SHIFT_ENDED")   return false;
      if (filter === "ABSENT"  && item.state !== "NOT_STARTED")   return false;
    }
    if (selectedOutlet !== "ALL" && item.location !== selectedOutlet) return false;
    if (selectedSlot   !== "ALL" && item.slotName !== selectedSlot)   return false;
    return true;
  }), [currentRoster, filter, searchQuery, selectedOutlet, selectedSlot]);

  const fmtCard = (iso: string | null) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  };

  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: 0 }} className="text-gradient">Daily Attendance Monitor</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>Real-time status roster of all active personnel.</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="input-modern" placeholder="Search staff, location, slot…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: "2.3rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem" }} />
          </div>

          <input type="date" className="input-modern" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: "150px", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }} />

          <select className="input-modern" value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} style={{ width: "150px", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <option value="ALL">All Outlets</option>
            {uniqueOutlets.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select className="input-modern" value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} style={{ width: "150px", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <option value="ALL">All Slots</option>
            {uniqueSlots.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={{ display: "flex", gap: "0.3rem", background: "rgba(255,255,255,0.02)", padding: "0.2rem", borderRadius: "10px", border: "1px solid var(--glass-border)", flexWrap: "wrap" }}>
            {([
              { id: "ALL",     label: "All",     activeColor: "var(--brand-primary-light)" },
              { id: "PRESENT", label: "Working", activeColor: "#10b981" },
              { id: "BREAK",   label: "Break",   activeColor: "#f59e0b" },
              { id: "ENDED",   label: "Ended",   activeColor: "#f43f5e" },
              { id: "ABSENT",  label: "Absent",  activeColor: "#94a3b8" },
            ] as const).map(tab => {
              const isActive = filter === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setFilter(tab.id as any)} style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "var(--font-heading)", fontWeight: isActive ? 800 : 600, background: isActive ? "rgba(255,255,255,0.05)" : "transparent", color: isActive ? tab.activeColor : "var(--text-muted)", transition: "all 0.2s ease" }}>
                  {tab.label} ({counts[tab.id as keyof typeof counts]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Roster cards */}
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Loading roster...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="glass" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "20px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍃</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No personnel found for the selected criteria.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
            {filteredRoster.map((item, idx) => {
              const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
              const badge = STATUS_MAP[item.state] || STATUS_MAP.NOT_STARTED;
              const hasActivity = item.state !== "NOT_STARTED" && !!item.startTime;

              return (
                <div key={item.id}
                  style={{ borderRadius: "18px", overflow: "hidden", background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", position: "relative", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 30px ${c1}18, 0 4px 20px rgba(0,0,0,0.5)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {/* Top accent */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                  {/* Avatar + Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Avatar name={item.name} index={idx} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>🏷️ {item.slotName}</p>
                    </div>
                  </div>

                  {/* Location + Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ padding: "0.2rem 0.55rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>📍 {item.location}</span>
                    <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: badge.bg, border: `1px solid ${badge.color}25`, fontSize: "0.68rem", fontWeight: 800, color: badge.color, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <span>{badge.icon}</span> {badge.label}
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "0.65rem 0.85rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Clock In</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace" }}>{fmtCard(item.startTime)}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Clock Out</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace" }}>{fmtCard(item.endTime)}</span>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.4rem", marginTop: "0.1rem" }}>
                      <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Break</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace", color: item.breakTimeStr && item.breakTimeStr !== "--" ? "#f59e0b" : "var(--text-muted)" }}>{item.breakTimeStr || "--"}</span>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.4rem", marginTop: "0.1rem" }}>
                      <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Worked</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 900, fontFamily: "monospace", color: item.workTimeStr && item.workTimeStr !== "--" ? "var(--brand-accent)" : "var(--text-muted)" }}>{item.workTimeStr || "--"}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {/* Advance */}
                    <button type="button" onClick={() => setAdvanceModal(item)}
                      style={{ flex: 1, padding: "0.5rem 0.4rem", background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(217,70,239,0.15))", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "10px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(217,70,239,0.3))"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(217,70,239,0.15))"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"; }}
                    >💳 Advance</button>

                    {/* Activity */}
                    <button type="button" onClick={() => hasActivity && setActivityModal(item)} disabled={!hasActivity}
                      title={hasActivity ? "View today's activity" : "No activity recorded"}
                      style={{ flex: 1, padding: "0.5rem 0.4rem", background: hasActivity ? "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))" : "rgba(255,255,255,0.02)", border: hasActivity ? "1px solid rgba(6,182,212,0.25)" : "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", cursor: hasActivity ? "pointer" : "not-allowed", fontSize: "0.72rem", fontWeight: 700, color: hasActivity ? "#67e8f9" : "var(--text-muted)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", opacity: hasActivity ? 1 : 0.5 }}
                      onMouseEnter={e => { if (!hasActivity) return; e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.28), rgba(59,130,246,0.28))"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)"; }}
                      onMouseLeave={e => { if (!hasActivity) return; e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.25)"; }}
                    >📋 Activity</button>

                    {/* Profile */}
                    <Link href={`/admin/staff/${item.id}`}
                      style={{ flex: 1.2, textAlign: "center", padding: "0.5rem 0.4rem", background: `linear-gradient(135deg, ${c1}15, ${c2}15)`, border: `1px solid ${c1}20`, borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700, color: c1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", gap: "0.25rem" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}25, ${c2}25)`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${c1}15, ${c2}15)`; }}
                    >👤 Profile</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style jsx global>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes popIn { from { opacity: 0; transform: scale(0.88) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        `}</style>
      </section>

      {advanceModal  && <AdvanceModal  staff={advanceModal}  onClose={() => setAdvanceModal(null)} />}
      {activityModal && <ActivityModal staff={activityModal} date={selectedDate} onClose={() => setActivityModal(null)} />}
    </>
  );
}
