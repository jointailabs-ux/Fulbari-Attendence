"use client";
import React, { useState } from "react";

export default function EmergencyPopup({ alerts }: { alerts: { name: string, percent: number }[] }) {
  const [open, setOpen] = useState(true);

  if (!open || alerts.length === 0) return null;

  return (
    <div className="glass animate-slide-up" style={{ 
      background: 'rgba(244, 63, 94, 0.08)', 
      borderColor: 'rgba(244, 63, 94, 0.2)', 
      padding: '1.5rem 2rem',
      marginBottom: '2.5rem', 
      position: 'relative',
      boxShadow: '0 10px 30px rgba(244, 63, 94, 0.1)'
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
          justifyContent: 'center'
        }}
      >
        &times;
      </button>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
        <div style={{ 
          fontSize: '2rem', 
          background: 'rgba(244, 63, 94, 0.15)', 
          width: '50px', 
          height: '50px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          ⚠️
        </div>
        <div>
          <h3 style={{ color: 'var(--brand-secondary)', marginBottom: '0.4rem', fontSize: '1.25rem' }}>
            Financial Risk Alert
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Critical advance levels detected. The following personnel have exceeded 50% of their monthly salary in advances:
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ 
                padding: '0.5rem 1rem', 
                background: 'rgba(244, 63, 94, 0.1)', 
                borderRadius: '8px', 
                border: '1px solid rgba(244, 63, 94, 0.1)',
                fontSize: '0.85rem'
              }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{a.name}</span>
                <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>•</span>
                <span style={{ color: 'var(--brand-secondary)', fontWeight: '800' }}>{a.percent}% Advance</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
