"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handlePinKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handlePinKeyPress("backspace");
      } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
        handlePinKeyPress("clear");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enteredPin]);

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
        // Notice we don't send portal here, so the server decides the role
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.role === "admin") {
          sessionStorage.setItem("admin_auth", "true");
          router.push("/admin");
        } else if (data.role === "manager") {
          sessionStorage.setItem("manager_auth", "true");
          router.push("/manager");
        } else if (data.role === "kiosk") {
          sessionStorage.setItem("kiosk_auth", "true");
          router.push("/kiosk");
        }
      } else {
        setError(data.error || "Access Denied: Invalid PIN");
        setEnteredPin("");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setEnteredPin("");
    }
  };

  return (
    <main className="animate-slide-up" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <div className="bg-mesh" />
      
      <div 
        className="glass animate-slide-up" 
        style={{ 
          maxWidth: '400px', 
          width: '90%',
          padding: '3rem 2rem', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: '24px',
          zIndex: 10
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Fulbari Access
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your 6-digit PIN to securely login.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            color: 'var(--brand-secondary)', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
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
          gap: '0.6rem', 
          justifyContent: 'center', 
          marginBottom: '2.5rem',
          width: '100%' 
        }}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const filled = enteredPin.length > i;
            return (
              <div
                key={i}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  border: `2px solid ${filled ? 'var(--brand-primary-light)' : 'var(--glass-border)'}`,
                  background: filled ? 'rgba(124, 58, 237, 0.08)' : 'rgba(255,255,255,0.02)',
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
          gap: '0.75rem', 
          width: '100%'
        }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handlePinKeyPress(n)}
              style={{
                height: '60px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)',
                fontSize: '1.3rem',
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
              height: '60px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.02)',
              fontSize: '0.9rem',
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
              height: '60px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.02)',
              fontSize: '1.3rem',
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
              height: '60px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.02)',
              fontSize: '1.3rem',
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
      </div>
    </main>
  );
}
