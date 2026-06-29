"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [targetPortal, setTargetPortal] = useState<"admin" | "kiosk" | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!targetPortal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handlePinKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handlePinKeyPress("backspace");
      } else if (e.key === "Escape") {
        setTargetPortal(null);
      } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
        handlePinKeyPress("clear");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [targetPortal, enteredPin]);

  const handlePortalClick = (portal: "admin" | "kiosk", e: React.MouseEvent) => {
    e.preventDefault();
    setTargetPortal(portal);
    setEnteredPin("");
    setError("");
  };

  const handlePinKeyPress = (key: string) => {
    setError("");
    if (key === "clear") {
      setEnteredPin("");
    } else if (key === "backspace") {
      setEnteredPin((prev) => prev.slice(0, -1));
    } else if (enteredPin.length < 6) {
      const nextPin = enteredPin + key;
      setEnteredPin(nextPin);
      
      if (nextPin.length === 6) {
        verifyPin(nextPin);
      }
    }
  };

  const verifyPin = async (pin: string) => {
    try {
      const res = await fetch("/api/v1/auth-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: targetPortal, pin })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (targetPortal === "admin") {
          sessionStorage.setItem("admin_auth", "true");
          router.push("/admin");
        } else if (targetPortal === "kiosk") {
          sessionStorage.setItem("kiosk_auth", "true");
          router.push("/kiosk");
        }
      } else {
        setError(data.error || `Access Denied: Invalid ${targetPortal === "admin" ? "Admin" : "Kiosk"} PIN`);
        setEnteredPin("");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setEnteredPin("");
    }
  };

  return (
    <main className="animate-slide-up">
      <div className="bg-mesh" />
      
      <div className="container-main" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '4rem' }}>
          <span className="glass" style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '100px', 
            fontSize: '0.8rem', 
            fontWeight: '600',
            color: 'var(--brand-primary-light)',
            marginBottom: '2rem',
            display: 'inline-block'
          }}>
            ✨ Next Generation Attendance
          </span>
          <h1 className="text-gradient" style={{ 
            fontSize: 'clamp(2.5rem, 8vw, 5rem)', 
            lineHeight: '1.1',
            marginBottom: '1.5rem'
          }}>
            Fulbari Restora<br/>Attendance
          </h1>
          <p style={{ 
            fontSize: 'clamp(1rem, 2vw, 1.25rem)', 
            color: 'var(--text-muted)', 
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            A precision-engineered terminal for modern restaurants. 
            Real-time tracking, automated payroll, and seamless staff management.
          </p>
        </div>

        <div className="grid-auto" style={{ width: '100%', maxWidth: '900px' }}>
          {/* Admin Portal Button */}
          <a 
            href="/admin" 
            onClick={(e) => handlePortalClick("admin", e)}
            className="glass glass-hover" 
            style={{ padding: '3rem 2rem', textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '1.5rem'
            }}>
              ⚙️
            </div>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>Admin Portal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Full control over operations. Manage staff, analyze financials, and finalize payroll records.
            </p>
            <div style={{ marginTop: '2rem', fontWeight: '600', color: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Open Dashboard <span>→</span>
            </div>
          </a>

          {/* Kiosk Button */}
          <a 
            href="/kiosk" 
            onClick={(e) => handlePortalClick("kiosk", e)}
            className="glass glass-hover" 
            style={{ padding: '3rem 2rem', textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: 'rgba(244, 63, 94, 0.1)', 
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '1.5rem'
            }}>
              📱
            </div>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>Staff Kiosk</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Touch-optimized terminal for daily clock-ins. PIN-secured attendance logging.
            </p>
            <div style={{ marginTop: '2rem', fontWeight: '600', color: 'var(--brand-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Launch Terminal <span>→</span>
            </div>
          </a>
        </div>

        <footer style={{ marginTop: '6rem', opacity: 0.5, fontSize: '0.8rem' }}>
          <p>© 2026 Fulbari Restora • Powered by Antigravity AI Engine</p>
        </footer>
      </div>

      {/* 6-Digit PIN Modal Overlay */}
      {targetPortal && (
        <div className="modal-overlay" onClick={() => setTargetPortal(null)}>
          <div 
            className="glass modal-content animate-slide-up" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '380px', 
              padding: '2.5rem 2rem', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button 
              className="modal-close" 
              onClick={() => setTargetPortal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                Access Code
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Enter the 6-digit code for the {targetPortal === "admin" ? "Admin Dashboard" : "Kiosk Terminal"}.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ 
                color: 'var(--brand-secondary)', 
                fontSize: '0.85rem', 
                fontWeight: '600', 
                marginBottom: '1rem',
                padding: '0.5rem 1rem',
                background: 'rgba(244, 63, 94, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(244, 63, 94, 0.15)',
                width: '100%'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Code circles indicators */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              justifyContent: 'center', 
              marginBottom: '2rem',
              width: '100%' 
            }}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const filled = enteredPin.length > i;
                return (
                  <div
                    key={i}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      border: `2px solid ${filled ? 'var(--brand-primary-light)' : 'var(--glass-border)'}`,
                      background: filled ? 'rgba(124, 58, 237, 0.08)' : 'rgba(255,255,255,0.01)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      boxShadow: filled ? '0 0 10px rgba(124, 58, 237, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {filled ? "•" : ""}
                  </div>
                );
              })}
            </div>

            {/* Numeric Keypad */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.6rem', 
              width: '100%',
              marginBottom: '1.5rem'
            }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePinKeyPress(n)}
                  style={{
                    height: '50px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="glass-hover"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePinKeyPress("clear")}
                style={{
                  height: '50px',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--brand-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="glass-hover"
              >
                CLR
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress("0")}
                style={{
                  height: '50px',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="glass-hover"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress("backspace")}
                style={{
                  height: '50px',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: '1.1rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                className="glass-hover"
              >
                ⌫
              </button>
            </div>

            <button 
              className="btn-modern btn-secondary" 
              onClick={() => setTargetPortal(null)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
