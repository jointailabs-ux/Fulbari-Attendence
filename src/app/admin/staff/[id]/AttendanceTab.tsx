"use client";

import React, { useState, useEffect } from "react";

interface BreakItem {
  id: string;
  startTime: string;
  endTime: string | null;
}

interface DayData {
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
  workHours?: string;
  breaks?: BreakItem[];
  isOccasion?: boolean;
  occasionName?: string;
  multiplier?: number;
}

interface SelectedDateInfo {
  day: number;
  fullDate: string;
  data?: DayData;
  dow?: number;
  isWeekend?: boolean;
  isOccasion?: boolean;
}

export default function AttendanceTab({ staffId }: { staffId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendarData, setCalendarData] = useState<Record<string, DayData>>({});
  const [selectedDate, setSelectedDate] = useState<SelectedDateInfo | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const reloadCalendar = async () => {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}/attendance?month=${currentMonth}`);
      const data = await res.json();
      setCalendarData(data || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/staff/${staffId}/attendance?month=${currentMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setCalendarData(data || {});
      })
      .catch((e) => console.error(e));

    return () => {
      isMounted = false;
    };
  }, [staffId, currentMonth]);

  const handleMarkLeave = async (type: string) => {
    if (!selectedDate) return;
    try {
      await fetch(`/api/v1/staff/${staffId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.fullDate,
          type,
          markedBy: "Admin"
        })
      });
      setIsLeaveModalOpen(false);
      reloadCalendar();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLeave = async () => {
    if (!selectedDate) return;
    try {
      await fetch(`/api/v1/staff/${staffId}/leaves?date=${selectedDate.fullDate}`, {
        method: "DELETE"
      });
      setIsLeaveModalOpen(false);
      reloadCalendar();
    } catch (e) {
      console.error(e);
    }
  };

  // Calendar Helpers
  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentMonth}-${i.toString().padStart(2, '0')}`;
    days.push({
      day: i,
      fullDate: dateStr,
      data: calendarData[dateStr]
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'var(--brand-accent)';
      case 'FULL_LEAVE': return 'var(--brand-secondary)';
      case 'HALF_LEAVE': return '#f59e0b';
      case 'IN_PROGRESS': return 'var(--brand-primary-light)';
      default: return 'var(--glass-border)';
    }
  };

  return (
    <section className="glass animate-slide-up staff-attendance-section" style={{ padding: '2rem', borderRadius: '24px' }}>
      <style>{`
        .staff-attendance-section {
          padding: 2rem;
          border-radius: 24px;
        }
        .staff-attendance-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .staff-attendance-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }
        .staff-cal-cell {
          aspect-ratio: 1;
          border-radius: 14px;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 800;
          position: relative;
        }
        @media (max-width: 640px) {
          .staff-attendance-section {
            padding: 0.75rem 0.35rem !important;
            border-radius: 16px !important;
          }
          .staff-attendance-weekdays {
            gap: 2px !important;
            margin-bottom: 4px !important;
          }
          .staff-attendance-grid {
            gap: 2px !important;
          }
          .staff-cal-cell {
            padding: 0.2rem 0.1rem !important;
            border-radius: 8px !important;
            font-size: 0.8rem !important;
          }
          .staff-weekday-header {
            font-size: 0.6rem !important;
            padding: 0.2rem 0 !important;
          }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
           <h2 style={{ fontSize: '1.5rem' }} className="text-gradient">Timekeeping Calendar</h2>
           <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Historical deployment and absence audit.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <button className="btn-modern btn-secondary" style={{ padding: '0.35rem 0.7rem', minWidth: 'auto', borderRadius: '8px' }} onClick={() => {
            const d = new Date(year, month - 2);
            setCurrentMonth(d.toISOString().slice(0, 7));
          }}>←</button>
          <input 
            type="month" 
            className="input-modern" 
            style={{ width: 'auto', padding: '0.35rem 0.6rem', border: 'none', background: 'transparent', fontWeight: '700', fontSize: '0.9rem' }} 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)} 
          />
          <button className="btn-modern btn-secondary" style={{ padding: '0.35rem 0.7rem', minWidth: 'auto', borderRadius: '8px' }} onClick={() => {
            const d = new Date(year, month);
            setCurrentMonth(d.toISOString().slice(0, 7));
          }}>→</button>
        </div>
      </div>

      <div className="staff-attendance-weekdays">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, idx) => (
          <div key={d} className="staff-weekday-header" style={{ textAlign: 'center', fontWeight: '800', fontSize: '0.7rem', color: (idx === 0 || idx === 6) ? '#fb7185' : 'var(--text-muted)', padding: '0.3rem', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>

      <div className="staff-attendance-grid">
        {days.map((day, i) => {
          const dow = i % 7;
          const isWeekend = dow === 0 || dow === 6;
          const isOccasion = day?.data?.isOccasion;

          return (
            <div 
              key={i} 
              onClick={() => { if(day) { setSelectedDate({ ...day, dow, isWeekend, isOccasion }); setIsLeaveModalOpen(true); } }}
              style={{ 
                aspectRatio: '1', 
                border: isOccasion ? '1.5px solid #fbbf24' : isWeekend ? '1px solid rgba(244,63,94,0.25)' : '1px solid var(--glass-border)', 
                borderRadius: '16px', 
                padding: '0.65rem',
                cursor: day ? 'pointer' : 'default',
                background: day?.data?.status ? `${getStatusColor(day.data.status)}10` : isOccasion ? 'rgba(251,191,36,0.06)' : isWeekend ? 'rgba(244,63,94,0.02)' : 'rgba(255,255,255,0.01)',
                borderColor: day?.data?.status ? getStatusColor(day.data.status) : isOccasion ? '#fbbf24' : isWeekend ? 'rgba(244,63,94,0.25)' : 'var(--glass-border)',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: '800',
                color: day?.data?.status ? 'var(--text-main)' : isOccasion ? '#fbbf24' : isWeekend ? '#fb7185' : 'var(--text-muted)',
                opacity: day ? 1 : 0
              }}
              className={`staff-cal-cell ${day ? "glass-hover" : ""}`}
            >
              <span>{day?.day}</span>
              
              {isOccasion && (
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.1rem' }}>⭐ 1.5x</span>
              )}
              {!isOccasion && isWeekend && day && (
                <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#fb7185', marginTop: '0.1rem' }}>1.5x</span>
              )}

              {day?.data?.status && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '0.4rem', 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: getStatusColor(day.data.status),
                  boxShadow: `0 0 8px ${getStatusColor(day.data.status)}`
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <LegendItem color="var(--brand-accent)" label="DEPLOYED" />
        <LegendItem color="#f59e0b" label="PARTIAL LEAVE" />
        <LegendItem color="var(--brand-secondary)" label="ABSENT" />
        <LegendItem color="var(--brand-primary-light)" label="IN PROGRESS" />
        <LegendItem color="#fbbf24" label="⭐ OCCASION DAY (1.5x)" />
        <LegendItem color="#fb7185" label="🏖️ WEEKEND (1.5x)" />
      </div>

      {/* Date Detail / Leave Modal */}
      {isLeaveModalOpen && selectedDate && (
        <div className="modal-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="glass modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Audit: {new Date(selectedDate.fullDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Security and deployment status.</p>
              </div>
              <button onClick={() => setIsLeaveModalOpen(false)} className="modal-close">&times;</button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              {selectedDate.data ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>STATUS</span>
                    <span style={{ fontWeight: '800', color: getStatusColor(selectedDate.data.status) }}>{selectedDate.data.status}</span>
                  </div>
                  {selectedDate.data.startTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CLOCK IN</span>
                      <span style={{ fontWeight: '600' }}>{new Date(selectedDate.data.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {selectedDate.data.endTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CLOCK OUT</span>
                      <span style={{ fontWeight: '600' }}>{new Date(selectedDate.data.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {selectedDate.data.breaks && selectedDate.data.breaks.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>BREAK LOGS</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '0.5rem' }}>
                        {selectedDate.data.breaks.map((b: BreakItem, idx: number) => {
                          const start = new Date(b.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                          const end = b.endTime ? new Date(b.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "Active";
                          return (
                            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>☕ Break #{idx+1}</span>
                              <span style={{ fontWeight: '600' }}>{start} - {end}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedDate.data.workHours && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL DURATION</span>
                      <span style={{ fontWeight: '800', color: 'var(--brand-primary-light)' }}>{selectedDate.data.workHours} HRS</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No activity logs for this cycle.</p>
                </div>
              )}

              <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>Administrative Override</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button className="btn-modern" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--brand-secondary)', border: '1px solid rgba(244, 63, 94, 0.2)' }} onClick={() => handleMarkLeave('FULL')}>Full Absence</button>
                  <button className="btn-modern" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }} onClick={() => handleMarkLeave('HALF')}>Partial Leave</button>
                </div>
                {selectedDate.data?.status.includes('LEAVE') && (
                   <button className="btn-modern btn-secondary" style={{ width: '100%' }} onClick={handleDeleteLeave}>Purge Leave Override</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}
