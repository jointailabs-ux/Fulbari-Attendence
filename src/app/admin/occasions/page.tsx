"use client";

import React, { useEffect, useState, useMemo } from "react";

interface OccasionDay {
  id: string;
  date: string; // ISO string
  name: string;
  multiplier: number;
  description?: string | null;
}

const PRESET_EVENTS = [
  "Durga Puja Rush",
  "Diwali Peak Festive",
  "Christmas Eve & Day",
  "New Year Celebration",
  "Holi Festive Surge",
  "Eid Celebration",
  "Weekend Banquet Event",
  "High-Volume Party Night",
  "Independence Day / Republic Day Rush",
];

export default function OccasionsCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 7);
  });

  const [occasions, setOccasions] = useState<OccasionDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formMultiplier, setFormMultiplier] = useState(1.5);
  const [formDescription, setFormDescription] = useState("");
  const [existingOccasionId, setExistingOccasionId] = useState<string | null>(null);

  // Fetch Occasions for currentMonth
  const reloadOccasions = async () => {
    try {
      const res = await fetch(`/api/v1/admin/occasions?month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        setOccasions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load occasion days:", e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/admin/occasions?month=${currentMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setOccasions(data);
        }
      })
      .catch((e) => console.error("Failed to load occasion days:", e));

    return () => {
      isMounted = false;
    };
  }, [currentMonth]);

  // Calendar Calculation
  const [year, month] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun

  // Map of occasions by YYYY-MM-DD
  const occasionMap = useMemo(() => {
    const map = new Map<string, OccasionDay>();
    occasions.forEach((occ) => {
      const dateStr = occ.date.split("T")[0];
      map.set(dateStr, occ);
    });
    return map;
  }, [occasions]);

  // Calendar cells array
  const calendarDays = useMemo(() => {
    const cells = [];
    // Blank padding before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    // Days 1 to daysInMonth
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const d = new Date(year, month - 1, day);
      const dow = d.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dow === 0 || dow === 6;
      const occasion = occasionMap.get(dateStr);
      cells.push({
        day,
        dateStr,
        dow,
        isWeekend,
        occasion,
      });
    }
    return cells;
  }, [currentMonth, firstDayOfWeek, daysInMonth, occasionMap, year, month]);

  // Monthly stats
  const totalOccasionsThisMonth = occasions.length;
  let totalWeekendDaysThisMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6) totalWeekendDaysThisMonth++;
  }

  // Open modal to add or edit
  const handleOpenDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = occasionMap.get(dateStr);
    if (existing) {
      setExistingOccasionId(existing.id);
      setFormName(existing.name);
      setFormMultiplier(existing.multiplier || 1.5);
      setFormDescription(existing.description || "");
    } else {
      setExistingOccasionId(null);
      setFormName("");
      setFormMultiplier(1.5);
      setFormDescription("");
    }
    setModalOpen(true);
  };

  const handleSaveOccasion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !formName.trim()) {
      alert("Please enter an occasion name.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          name: formName.trim(),
          multiplier: Number(formMultiplier) || 1.5,
          description: formDescription.trim(),
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        reloadOccasions();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save occasion");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOccasion = async (id: string, dateStr: string) => {
    if (!confirm(`Are you sure you want to remove the Occasion Day marking for ${dateStr}?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/occasions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (modalOpen) setModalOpen(false);
        reloadOccasions();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete occasion");
      }
    } catch {
      alert("Network error.");
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ── Page Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🌟</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              High-Demand & Attendance Control
            </span>
          </div>
          <h1 className="text-gradient" style={{ fontSize: "2.6rem", margin: 0, fontWeight: 900 }}>
            Occasion Days & Weekend Rules
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "0.4rem", maxWidth: "700px", lineHeight: 1.5 }}>
            Absences on <strong style={{ color: "#fb7185" }}>Saturdays, Sundays</strong>, and marked <strong style={{ color: "#fbbf24" }}>Occasion Days</strong> incur a <strong style={{ color: "#fff" }}>1.5x leave deduction</strong> instead of 1 day to encourage higher attendance during peak operations.
          </p>
        </div>

        {/* Month Selector */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "0.4rem", borderRadius: "14px", border: "1px solid var(--glass-border)" }}>
          <button
            className="btn-modern btn-secondary"
            style={{ padding: "0.45rem 0.85rem", minWidth: "auto", borderRadius: "10px", fontWeight: 800 }}
            onClick={() => {
              const d = new Date(year, month - 2);
              setCurrentMonth(d.toISOString().slice(0, 7));
            }}
          >
            ←
          </button>
          <input
            type="month"
            className="input-modern"
            style={{ width: "auto", padding: "0.45rem 0.85rem", border: "none", background: "transparent", fontWeight: "800", fontSize: "0.95rem", color: "var(--text-main)" }}
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
          />
          <button
            className="btn-modern btn-secondary"
            style={{ padding: "0.45rem 0.85rem", minWidth: "auto", borderRadius: "10px", fontWeight: 800 }}
            onClick={() => {
              const d = new Date(year, month);
              setCurrentMonth(d.toISOString().slice(0, 7));
            }}
          >
            →
          </button>
        </div>
      </header>

      {/* ── Policy Explainer & Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Card 1: Occasion Days */}
        <div className="glass" style={{ padding: "1.4rem", borderRadius: "18px", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Occasion Days This Month
            </span>
            <span style={{ fontSize: "1.3rem" }}>⭐</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "0.3rem 0 0 0" }}>
            {totalOccasionsThisMonth} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>marked dates</span>
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.4rem 0 0 0" }}>
            Penalty weight: <strong>1.5 Days leave cut</strong> per absence.
          </p>
        </div>

        {/* Card 2: Weekend Days */}
        <div className="glass" style={{ padding: "1.4rem", borderRadius: "18px", border: "1px solid rgba(244,63,94,0.25)", background: "rgba(244,63,94,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fb7185", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Weekend Days (Sat & Sun)
            </span>
            <span style={{ fontSize: "1.3rem" }}>🏖️</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "0.3rem 0 0 0" }}>
            {totalWeekendDaysThisMonth} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Saturdays & Sundays</span>
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.4rem 0 0 0" }}>
            Auto-penalized: <strong>1.5 Days leave cut</strong> for weekend absence.
          </p>
        </div>

        {/* Card 3: Free Leave Policy */}
        <div className="glass" style={{ padding: "1.4rem", borderRadius: "18px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Staff Free Leave Allowance
            </span>
            <span style={{ fontSize: "1.3rem" }}>🎁</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "0.3rem 0 0 0" }}>
            4.0 <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Free Paid Leaves / Month</span>
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.4rem 0 0 0" }}>
            Deduction only applies when total weighted leaves exceed 4 days.
          </p>
        </div>
      </div>

      {/* ── Interactive Calendar Grid ── */}
      <section className="glass" style={{ padding: "2rem", borderRadius: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              {new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} Calendar
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Click any date to mark/unmark as an Occasion Day.
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.75rem", fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: "rgba(251,191,36,0.3)", border: "1px solid #fbbf24" }} />
              <span style={{ color: "#fbbf24" }}>⭐ Occasion Day (1.5x)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)" }} />
              <span style={{ color: "#fb7185" }}>🏖️ Sat / Sun (1.5x)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }} />
              <span style={{ color: "var(--text-muted)" }}>Weekday (1.0x)</span>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d, idx) => {
            const isWeekendHeader = idx === 0 || idx === 6;
            return (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  color: isWeekendHeader ? "#fb7185" : "var(--text-muted)",
                  padding: "0.5rem",
                  letterSpacing: "0.08em",
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Grid of Days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.6rem" }}>
          {calendarDays.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} style={{ opacity: 0, minHeight: "95px" }} />;
            }

            const { day, dateStr, isWeekend, occasion } = cell;

            return (
              <div
                key={dateStr}
                onClick={() => handleOpenDate(dateStr)}
                style={{
                  minHeight: "95px",
                  borderRadius: "16px",
                  padding: "0.65rem",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  background: occasion
                    ? "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.05))"
                    : isWeekend
                    ? "rgba(244,63,94,0.04)"
                    : "rgba(255,255,255,0.015)",
                  border: occasion
                    ? "1.5px solid #fbbf24"
                    : isWeekend
                    ? "1px solid rgba(244,63,94,0.25)"
                    : "1px solid var(--glass-border)",
                  boxShadow: occasion ? "0 4px 15px rgba(251,191,36,0.15)" : "none",
                }}
                className="glass-hover"
              >
                {/* Header row in cell */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 900,
                      color: occasion ? "#fbbf24" : isWeekend ? "#fb7185" : "var(--text-main)",
                    }}
                  >
                    {day}
                  </span>

                  {occasion ? (
                    <span
                      style={{
                        padding: "0.15rem 0.4rem",
                        borderRadius: "6px",
                        background: "rgba(251,191,36,0.2)",
                        border: "1px solid rgba(251,191,36,0.4)",
                        fontSize: "0.62rem",
                        fontWeight: 900,
                        color: "#fbbf24",
                      }}
                    >
                      ⭐ 1.5x
                    </span>
                  ) : isWeekend ? (
                    <span
                      style={{
                        padding: "0.15rem 0.35rem",
                        borderRadius: "6px",
                        background: "rgba(244,63,94,0.1)",
                        border: "1px solid rgba(244,63,94,0.2)",
                        fontSize: "0.58rem",
                        fontWeight: 800,
                        color: "#fb7185",
                      }}
                    >
                      Weekend
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", opacity: 0.5 }}>1x</span>
                  )}
                </div>

                {/* Event Name Tag */}
                {occasion && (
                  <div
                    style={{
                      marginTop: "0.3rem",
                      background: "rgba(0,0,0,0.4)",
                      padding: "0.3rem 0.45rem",
                      borderRadius: "8px",
                      border: "1px solid rgba(251,191,36,0.3)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "#fff",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {occasion.name}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Occasion Days List Table ── */}
      <section className="glass" style={{ padding: "2rem", borderRadius: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Configured Occasions ({occasions.length})</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              All custom high-demand event dates configured for this cycle.
            </p>
          </div>
        </div>

        {occasions.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "16px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗓️</div>
            <p style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.9rem" }}>
              No custom occasion days marked for this month.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
              Click on any date above in the calendar to mark it as an Occasion Day.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {occasions.map((occ) => {
              const dStr = occ.date.split("T")[0];
              const formattedDate = new Date(occ.date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={occ.id}
                  style={{
                    padding: "1.1rem 1.25rem",
                    borderRadius: "16px",
                    background: "rgba(251,191,36,0.03)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase" }}>
                        📅 {formattedDate}
                      </span>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 900, color: "#fff", margin: "0.2rem 0 0 0" }}>
                        {occ.name}
                      </h3>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "8px",
                        background: "rgba(251,191,36,0.15)",
                        border: "1px solid rgba(251,191,36,0.3)",
                        fontSize: "0.7rem",
                        fontWeight: 900,
                        color: "#fbbf24",
                      }}
                    >
                      {occ.multiplier || 1.5}x Leave Cut
                    </span>
                  </div>

                  {occ.description && (
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>{occ.description}</p>
                  )}

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                    <button
                      onClick={() => handleOpenDate(dStr)}
                      className="btn-modern btn-secondary"
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.75rem", borderRadius: "8px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOccasion(occ.id, dStr)}
                      style={{
                        flex: 1,
                        padding: "0.4rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(244,63,94,0.3)",
                        background: "rgba(244,63,94,0.06)",
                        color: "#f43f5e",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Modal to Add / Edit Occasion ── */}
      {modalOpen && selectedDate && (
        <div
          className="modal-overlay"
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="glass animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "2rem",
              borderRadius: "24px",
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(12,12,18,0.98)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  🌟 Occasion Day Setting
                </span>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0.2rem 0 0 0" }}>
                  {new Date(selectedDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOccasion} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {/* Preset Event Buttons */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
                  Quick Presets
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {PRESET_EVENTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormName(preset)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        borderRadius: "8px",
                        border: "1px solid var(--glass-border)",
                        background: formName === preset ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.02)",
                        color: formName === preset ? "#fbbf24" : "var(--text-main)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Name Input */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                  Occasion / Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Durga Puja Rush, Diwali Peak, Special Event"
                  className="input-modern"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", fontSize: "0.9rem" }}
                />
              </div>

              {/* Multiplier setting */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                  Leave Deduction Multiplier
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {[1.5, 2.0].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setFormMultiplier(mult)}
                      style={{
                        flex: 1,
                        padding: "0.6rem",
                        borderRadius: "10px",
                        border: `1px solid ${formMultiplier === mult ? "#fbbf24" : "var(--glass-border)"}`,
                        background: formMultiplier === mult ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.02)",
                        color: formMultiplier === mult ? "#fbbf24" : "var(--text-muted)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {mult}x Leave Cut
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                  Staff absent on this day will have {formMultiplier} days of leave deducted.
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expected 2x table bookings, full staff mandatory"
                  className="input-modern"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", borderRadius: "12px", fontSize: "0.85rem" }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem" }}>
                {existingOccasionId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOccasion(existingOccasionId, selectedDate)}
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid rgba(244,63,94,0.3)",
                      background: "rgba(244,63,94,0.08)",
                      color: "#f43f5e",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-modern btn-secondary"
                  style={{ flex: 1, padding: "0.8rem", borderRadius: "12px", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1.5,
                    padding: "0.8rem",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    color: "#000",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(251,191,36,0.3)",
                  }}
                >
                  {saving ? "Saving..." : existingOccasionId ? "Update Occasion" : "Mark as Occasion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
