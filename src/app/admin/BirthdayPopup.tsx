"use client";
import React, { useState } from "react";

interface BirthdayAlert {
  id: string;
  name: string;
  daysRemaining: number;
}

export default function BirthdayPopup({ alerts }: { alerts: BirthdayAlert[] }) {
  const [open, setOpen] = useState(true);

  if (!open || alerts.length === 0) return null;

  return (
    <div className="glass animate-slide-up" style={{ 
      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(245, 158, 11, 0.06))', 
      borderColor: 'rgba(236, 72, 153, 0.2)', 
      padding: '1.5rem 2rem',
      marginBottom: '2.5rem', 
      position: 'relative',
      boxShadow: '0 10px 30px rgba(236, 72, 153, 0.1)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '16px'
    }}>
      <button 
        onClick={() => setOpen(false)} 
        style={{ 
          position: 'absolute', 
          top: '1rem', 
          right: '1rem', 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid var(--glass-border)', 
          color: 'var(--text-muted)', 
          cursor: 'pointer', 
          fontSize: '1.25rem', 
          lineHeight: 1,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        className="glass-hover"
      >
        &times;
      </button>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
        <div style={{ 
          fontSize: '2rem', 
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(245, 158, 11, 0.2))', 
          width: '50px', 
          height: '50px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid rgba(236, 72, 153, 0.3)'
        }}>
          🎂
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#f472b6', marginBottom: '0.4rem', fontSize: '1.25rem', fontWeight: 800 }}>
            Upcoming Celebrations!
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Don't forget to wish your staff members. The following birthdays are coming up:
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {alerts.map((a, i) => {
              let label = "";
              let bg = "";
              let color = "";
              let border = "";
              
              if (a.daysRemaining === 0) {
                label = "Today 🎈";
                bg = "rgba(236, 72, 153, 0.15)";
                color = "#ec4899";
                border = "rgba(236, 72, 153, 0.3)";
              } else if (a.daysRemaining === 1) {
                label = "Tomorrow (1 day prior)";
                bg = "rgba(244, 63, 94, 0.1)";
                color = "#fb7185";
                border = "rgba(244, 63, 94, 0.2)";
              } else {
                label = "In 2 days (2 days prior)";
                bg = "rgba(245, 158, 11, 0.1)";
                color = "#fb923c";
                border = "rgba(245, 158, 11, 0.2)";
              }

              return (
                <div key={i} style={{ 
                  padding: '0.5rem 1rem', 
                  background: bg, 
                  borderRadius: '8px', 
                  border: `1px solid ${border}`,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{a.name}</span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span style={{ color: color, fontWeight: '800' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
