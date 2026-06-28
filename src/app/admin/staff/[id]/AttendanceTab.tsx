"use client";

import React, { useState, useEffect } from "react";

export default function AttendanceTab({ staffId }: { staffId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendarData, setCalendarData] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const fetchCalendar = async () => {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}/attendance?month=${currentMonth}`);
      const data = await res.json();
      setCalendarData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth]);

  const handleMarkLeave = async (type: string) => {
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
      fetchCalendar();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLeave = async () => {
    try {
      await fetch(`/api/v1/staff/${staffId}/leaves?date=${selectedDate.fullDate}`, {
        method: "DELETE"
      });
      setIsLeaveModalOpen(false);
      fetchCalendar();
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
    <section className="glass animate-slide-up" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
           <h2 style={{ fontSize: '1.75rem' }} className="text-gradient">Timekeeping Calendar</h2>
           <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Historical deployment and absence audit.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
          <button className="btn-modern btn-secondary" style={{ padding: '0.4rem 0.8rem', minWidth: 'auto', borderRadius: '10px' }} onClick={() => {
            const d = new Date(year, month - 2);
            setCurrentMonth(d.toISOString().slice(0, 7));
          }}>←</button>
          <input 
            type="month" 
            className="input-modern" 
            style={{ width: 'auto', padding: '0.4rem 0.8rem', border: 'none', background: 'transparent', fontWeight: '700' }} 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)} 
          />
          <button className="btn-modern btn-secondary" style={{ padding: '0.4rem 0.8rem', minWidth: 'auto', borderRadius: '10px' }} onClick={() => {
            const d = new Date(year, month);
            setCurrentMonth(d.toISOString().slice(0, 7));
          }}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: '800', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.5rem', letterSpacing: '0.1em' }}>{d}</div>
        ))}
        {days.map((day, i) => (
          <div 
            key={i} 
            onClick={() => { if(day) { setSelectedDate(day); setIsLeaveModalOpen(true); } }}
            style={{ 
              aspectRatio: '1', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '16px', 
              padding: '0.75rem',
              cursor: day ? 'pointer' : 'default',
              background: day?.data ? `${getStatusColor(day.data.status)}10` : 'rgba(255,255,255,0.01)',
              borderColor: day?.data ? getStatusColor(day.data.status) : 'var(--glass-border)',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: '700',
              color: day?.data ? 'var(--text-main)' : 'var(--text-muted)',
              opacity: day ? 1 : 0
            }}
            className={day ? "glass-hover" : ""}
          >
            {day?.day}
            {day?.data && (
              <div style={{ 
                position: 'absolute', 
                bottom: '0.5rem', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: getStatusColor(day.data.status),
                boxShadow: `0 0 10px ${getStatusColor(day.data.status)}`
              }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '2rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <LegendItem color="var(--brand-accent)" label="DEPLOYED" />
        <LegendItem color="#f59e0b" label="PARTIAL LEAVE" />
        <LegendItem color="var(--brand-secondary)" label="ABSENT" />
        <LegendItem color="var(--brand-primary-light)" label="IN PROGRESS" />
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
                        {selectedDate.data.breaks.map((b: any, idx: number) => {
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
