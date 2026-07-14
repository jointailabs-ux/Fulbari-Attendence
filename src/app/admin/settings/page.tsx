"use client";

import React, { useState } from 'react';

export default function SettingsPage() {
  const [currentAdminPin, setCurrentAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [newKioskPin, setNewKioskPin] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdatePins = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    if (!currentAdminPin) {
      setError('Current Admin PIN is required to authorize changes.');
      setIsLoading(false);
      return;
    }

    if (newAdminPin && newAdminPin.length !== 6) {
      setError('Admin PIN must be exactly 6 digits.');
      setIsLoading(false);
      return;
    }

    if (newKioskPin && newKioskPin.length !== 6) {
      setError('Kiosk PIN must be exactly 6 digits.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/settings/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAdminPin, newAdminPin, newKioskPin })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage('PINs updated successfully! Your new settings are live.');
        setCurrentAdminPin('');
        setNewAdminPin('');
        setNewKioskPin('');
      } else {
        setError(data.error || 'Failed to update PINs.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Security Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your system access codes.</p>
      </div>

      <div className="glass" style={{ padding: '2rem', borderRadius: '18px', maxWidth: '600px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span>🔒</span> PIN Management
        </h2>

        
        {message && <div style={{ color: 'var(--brand-primary)', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>{message}</div>}
        {error && <div style={{ color: '#f43f5e', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>{error}</div>}

        <form onSubmit={handleUpdatePins}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Admin PIN *</label>
            <input 
              type="password" 
              placeholder="••••••" 
              value={currentAdminPin}
              onChange={(e) => setCurrentAdminPin(e.target.value)}
              className="input-modern"
              style={{ width: '100%', letterSpacing: '0.5rem' }}
              maxLength={6}
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--brand-secondary)', marginTop: '0.5rem' }}>Required to authorize changes.</p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>New Admin Dashboard PIN</label>
            <input 
              type="password" 
              placeholder="Leave blank to keep current" 
              value={newAdminPin}
              onChange={(e) => setNewAdminPin(e.target.value)}
              className="input-modern"
              style={{ width: '100%', letterSpacing: '0.2rem' }}
              maxLength={6}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>New Kiosk Terminal PIN</label>
            <input 
              type="password" 
              placeholder="Leave blank to keep current" 
              value={newKioskPin}
              onChange={(e) => setNewKioskPin(e.target.value)}
              className="input-modern"
              style={{ width: '100%', letterSpacing: '0.2rem' }}
              maxLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn-modern btn-primary" 
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
