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
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 6 = Sat

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
        isSaturday: dow === 6,
        isSunday: dow === 0,
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
    <div className="occasion-page-shell animate-slide-up">
      {/* ── Scoped Responsive Styles ── */}
      <style>{`
        .occasion-page-shell {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .occasion-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .occasion-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
        }
        .occasion-calendar-card {
          padding: 1.75rem;
          border-radius: 24px;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .occasion-weekdays-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 6px;
          width: 100%;
        }
        .occasion-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          width: 100%;
        }
        .occasion-cell {
          min-height: 85px;
          border-radius: 14px;
          padding: 0.55rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          box-sizing: border-box;
          user-select: none;
        }
        .occasion-cell-day {
          font-size: 1.05rem;
          font-weight: 900;
          line-height: 1;
        }
        .occasion-cell-badge {
          font-size: 0.6rem;
          font-weight: 900;
          padding: 0.12rem 0.35rem;
          border-radius: 6px;
          white-space: nowrap;
          line-height: 1.2;
        }
        .occasion-event-tag {
          margin-top: 0.25rem;
          background: rgba(0,0,0,0.5);
          padding: 0.25rem 0.35rem;
          border-radius: 6px;
          border: 1px solid rgba(251,191,36,0.3);
          font-size: 0.65rem;
          font-weight: 800;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .occasion-weekday-header {
          text-align: center;
          font-weight: 900;
          font-size: 0.72rem;
          padding: 0.4rem 0;
          letter-spacing: 0.05em;
        }

        /* ── Mobile Phone Optimization (under 640px) ── */
        @media (max-width: 640px) {
          .occasion-page-shell {
            gap: 1rem;
          }
          .occasion-header h1 {
            font-size: 1.75rem !important;
          }
          .occasion-stats-grid {
            grid-template-columns: 1fr !important;
            gap: 0.6rem !important;
          }
          .occasion-calendar-card {
            padding: 0.75rem 0.35rem !important;
            border-radius: 16px !important;
          }
          .occasion-weekdays-grid {
            gap: 2px !important;
            margin-bottom: 4px !important;
          }
          .occasion-days-grid {
            gap: 2px !important;
          }
          .occasion-cell {
            min-height: 54px !important;
            padding: 0.25rem 0.15rem !important;
            border-radius: 8px !important;
          }
          .occasion-cell-day {
            font-size: 0.82rem !important;
          }
          .occasion-cell-badge {
            font-size: 0.5rem !important;
            padding: 0.05rem 0.2rem !important;
            border-radius: 4px !important;
          }
          .occasion-event-tag {
            font-size: 0.52rem !important;
            padding: 0.1rem 0.2rem !important;
            margin-top: 0.15rem !important;
          }
          .occasion-weekday-header {
            font-size: 0.6rem !important;
            padding: 0.2rem 0 !important;
          }
        }
      `}</style>

      {/* ── Page Header ── */}
      <header className="occasion-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.3rem" }}>🌟</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Peak Attendance Policy
            </span>
          </div>
          <h1 className="text-gradient" style={{ fontSize: "2.4rem", margin: 0, fontWeight: 900, letterSpacing: "-0.02em" }}>
            Occasions & Weekend Rules
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.3rem", maxWidth: "650px", lineHeight: 1.45 }}>
            Absences on <strong style={{ color: "#fb7185" }}>Saturdays, Sundays</strong>, and marked <strong style={{ color: "#fbbf24" }}>Occasion Days</strong> cut <strong style={{ color: "#fff" }}>1.5 days</strong> of leave instead of 1 day.
          </p>
        </div>

        {/* Month Selector */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "0.35rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
          <button
            className="btn-modern btn-secondary"
            style={{ padding: "0.4rem 0.75rem", minWidth: "auto", borderRadius: "8px", fontWeight: 800 }}
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
            style={{ width: "auto", padding: "0.4rem 0.6rem", border: "none", background: "transparent", fontWeight: "800", fontSize: "0.9rem", color: "var(--text-main)" }}
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
          />
          <button
            className="btn-modern btn-secondary"
            style={{ padding: "0.4rem 0.75rem", minWidth: "auto", borderRadius: "8px", fontWeight: 800 }}
            onClick={() => {
              const d = new Date(year, month);
              setCurrentMonth(d.toISOString().slice(0, 7));
            }}
          >
            →
          </button>
        </div>
      </header>

      {/* ── Policy Summary Cards ── */}
      <div className="occasion-stats-grid">
        {/* Card 1: Saturday & Sunday Rule */}
        <div className="glass" style={{ padding: "1.2rem", borderRadius: "16px", border: "1px solid rgba(244,63,94,0.25)", background: "rgba(244,63,94,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fb7185", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              🏖️ Weekend Rule (Sat & Sun)
            </span>
            <span style={{ padding: "0.15rem 0.4rem", borderRadius: "6px", background: "rgba(244,63,94,0.15)", color: "#fb7185", fontWeight: 900, fontSize: "0.68rem" }}>
              1.5x CUT
            </span>
          </div>
          <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", margin: "0.3rem 0 0 0" }}>
            {totalWeekendDaysThisMonth} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Sat & Sun days</span>
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.3rem 0 0 0" }}>
            Absence on any <strong style={{ color: "#fb7185" }}>Saturday or Sunday</strong> cuts <strong>1.5 days leave</strong>.
          </p>
        </div>

        {/* Card 2: Custom Occasions */}
        <div className="glass" style={{ padding: "1.2rem", borderRadius: "16px", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ⭐ Marked Occasion Days
            </span>
            <span style={{ padding: "0.15rem 0.4rem", borderRadius: "6px", background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 900, fontSize: "0.68rem" }}>
              1.5x CUT
            </span>
          </div>
          <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", margin: "0.3rem 0 0 0" }}>
            {totalOccasionsThisMonth} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>special events</span>
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.3rem 0 0 0" }}>
            Festival/rush dates marked by the owner cut <strong>1.5 days leave</strong>.
          </p>
        </div>

        {/* Card 3: Free Leave Allowance */}
        <div className="glass" style={{ padding: "1.2rem", borderRadius: "16px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              🎁 Monthly Leave Allowance
            </span>
            <span style={{ padding: "0.15rem 0.4rem", borderRadius: "6px", background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 900, fontSize: "0.68rem" }}>
              4.0 FREE
            </span>
          </div>
          <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", margin: "0.3rem 0 0 0" }}>
            4.0 <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Paid Leaves / Staff</span>
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.3rem 0 0 0" }}>
            Salary deduction occurs only if weighted leaves exceed 4 days.
          </p>
        </div>
      </div>

      {/* ── Interactive 7-Day Calendar Grid ── */}
      <section className="glass occasion-calendar-card">
        {/* Calendar Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
              {new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>
              Tap any date to mark as an Occasion Day.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.7rem", fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(244,63,94,0.25)", border: "1px solid #fb7185" }} />
              <span style={{ color: "#fb7185" }}>Sat & Sun (1.5x)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(251,191,36,0.3)", border: "1px solid #fbbf24" }} />
              <span style={{ color: "#fbbf24" }}>⭐ Occasion (1.5x)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }} />
              <span style={{ color: "var(--text-muted)" }}>Weekday (1.0x)</span>
            </div>
          </div>
        </div>

        {/* Days of Week Header (SUN to SAT) */}
        <div className="occasion-weekdays-grid">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d, idx) => {
            const isWeekendHeader = idx === 0 || idx === 6;
            return (
              <div
                key={d}
                className="occasion-weekday-header"
                style={{
                  color: isWeekendHeader ? "#fb7185" : "var(--text-muted)",
                  background: isWeekendHeader ? "rgba(244,63,94,0.06)" : "transparent",
                  borderRadius: "6px",
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Days Grid */}
        <div className="occasion-days-grid">
          {calendarDays.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} style={{ opacity: 0 }} />;
            }

            const { day, dateStr, isWeekend, isSaturday, isSunday, occasion } = cell;

            return (
              <div
                key={dateStr}
                onClick={() => handleOpenDate(dateStr)}
                className="occasion-cell glass-hover"
                style={{
                  background: occasion
                    ? "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.06))"
                    : isWeekend
                    ? "rgba(244,63,94,0.06)"
                    : "rgba(255,255,255,0.015)",
                  border: occasion
                    ? "1.5px solid #fbbf24"
                    : isWeekend
                    ? "1px solid rgba(244,63,94,0.35)"
                    : "1px solid var(--glass-border)",
                  boxShadow: occasion
                    ? "0 4px 12px rgba(251,191,36,0.15)"
                    : isWeekend
                    ? "0 2px 8px rgba(244,63,94,0.08)"
                    : "none",
                }}
              >
                {/* Header row in cell: Day number + Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                  <span
                    className="occasion-cell-day"
                    style={{
                      color: occasion ? "#fbbf24" : isWeekend ? "#fb7185" : "var(--text-main)",
                    }}
                  >
                    {day}
                  </span>

                  {occasion ? (
                    <span
                      className="occasion-cell-badge"
                      style={{
                        background: "rgba(251,191,36,0.25)",
                        border: "1px solid rgba(251,191,36,0.45)",
                        color: "#fbbf24",
                      }}
                    >
                      ⭐ 1.5x
                    </span>
                  ) : isSaturday ? (
                    <span
                      className="occasion-cell-badge"
                      style={{
                        background: "rgba(244,63,94,0.18)",
                        border: "1px solid rgba(244,63,94,0.4)",
                        color: "#fb7185",
                      }}
                    >
                      Sat 1.5x
                    </span>
                  ) : isSunday ? (
                    <span
                      className="occasion-cell-badge"
                      style={{
                        background: "rgba(244,63,94,0.18)",
                        border: "1px solid rgba(244,63,94,0.4)",
                        color: "#fb7185",
                      }}
                    >
                      Sun 1.5x
                    </span>
                  ) : (
                    <span
                      className="occasion-cell-badge"
                      style={{
                        color: "var(--text-muted)",
                        opacity: 0.4,
                      }}
                    >
                      1x
                    </span>
                  )}
                </div>

                {/* Event Name Tag for marked occasions */}
                {occasion && (
                  <div className="occasion-event-tag" title={occasion.name}>
                    {occasion.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Occasions List Table ── */}
      <section className="glass" style={{ padding: "1.5rem", borderRadius: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Configured Occasions ({occasions.length})</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.1rem 0 0 0" }}>
              High-demand dates configured for this cycle.
            </p>
          </div>
        </div>

        {occasions.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "14px" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>🗓️</div>
            <p style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem", margin: 0 }}>
              No custom occasion days marked for this month.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>
              Click any date above in the calendar to mark an occasion.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
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
                    padding: "1rem 1.15rem",
                    borderRadius: "14px",
                    background: "rgba(251,191,36,0.03)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase" }}>
                        📅 {formattedDate}
                      </span>
                      <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", margin: "0.15rem 0 0 0" }}>
                        {occ.name}
                      </h3>
                    </div>
                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "6px",
                        background: "rgba(251,191,36,0.15)",
                        border: "1px solid rgba(251,191,36,0.3)",
                        fontSize: "0.68rem",
                        fontWeight: 900,
                        color: "#fbbf24",
                      }}
                    >
                      {occ.multiplier || 1.5}x Cut
                    </span>
                  </div>

                  {occ.description && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>{occ.description}</p>
                  )}

                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
                    <button
                      onClick={() => handleOpenDate(dStr)}
                      className="btn-modern btn-secondary"
                      style={{ flex: 1, padding: "0.35rem", fontSize: "0.72rem", borderRadius: "8px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOccasion(occ.id, dStr)}
                      style={{
                        flex: 1,
                        padding: "0.35rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(244,63,94,0.3)",
                        background: "rgba(244,63,94,0.06)",
                        color: "#f43f5e",
                        fontWeight: 800,
                        fontSize: "0.72rem",
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
              maxWidth: "440px",
              padding: "1.75rem",
              borderRadius: "22px",
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(12,12,18,0.98)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  🌟 Occasion Day Setting
                </span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0.2rem 0 0 0" }}>
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
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOccasion} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Presets */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                  Quick Presets
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {PRESET_EVENTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormName(preset)}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "8px",
                        border: "1px solid var(--glass-border)",
                        background: formName === preset ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.02)",
                        color: formName === preset ? "#fbbf24" : "var(--text-main)",
                        fontSize: "0.7rem",
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
                <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Occasion / Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Durga Puja Rush, Diwali Peak, Special Event"
                  className="input-modern"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "10px", fontSize: "0.88rem" }}
                />
              </div>

              {/* Multiplier setting */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Leave Deduction Multiplier
                </label>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {[1.5, 2.0].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setFormMultiplier(mult)}
                      style={{
                        flex: 1,
                        padding: "0.55rem",
                        borderRadius: "8px",
                        border: `1px solid ${formMultiplier === mult ? "#fbbf24" : "var(--glass-border)"}`,
                        background: formMultiplier === mult ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.02)",
                        color: formMultiplier === mult ? "#fbbf24" : "var(--text-muted)",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      {mult}x Leave Cut
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expected 2x table bookings, full staff mandatory"
                  className="input-modern"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "10px", fontSize: "0.82rem" }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                {existingOccasionId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOccasion(existingOccasionId, selectedDate)}
                    style={{
                      padding: "0.7rem 0.9rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(244,63,94,0.3)",
                      background: "rgba(244,63,94,0.08)",
                      color: "#f43f5e",
                      fontWeight: 800,
                      fontSize: "0.82rem",
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
                  style={{ flex: 1, padding: "0.7rem", borderRadius: "10px", fontSize: "0.82rem" }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1.4,
                    padding: "0.7rem",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    color: "#000",
                    fontWeight: 900,
                    fontSize: "0.82rem",
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
