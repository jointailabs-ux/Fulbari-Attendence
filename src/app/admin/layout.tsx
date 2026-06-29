"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check local preferences
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsLightTheme(true);
    }
    
    // Check authentication state
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;

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
  }, [isAuthenticated, pinEntry]);

  const handlePinKeyPress = (key: string) => {
    setError("");
    if (key === "clear") {
      setPinEntry("");
    } else if (key === "backspace") {
      setPinEntry((prev) => prev.slice(0, -1));
    } else if (pinEntry.length < 6) {
      const nextPin = pinEntry + key;
      setPinEntry(nextPin);
      
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
        body: JSON.stringify({ portal: "admin", pin })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
        setError("");
      } else {
        setError(data.error || "Access Denied: Invalid Admin PIN");
        setPinEntry("");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setPinEntry("");
    }
  };

  const toggleTheme = () => {
    const newTheme = !isLightTheme;
    setIsLightTheme(newTheme);
    localStorage.setItem("theme", newTheme ? "light" : "dark");
  };

  const navLinks = [
    { name: "Homepage", href: "/", icon: "🏠" },
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Staff", href: "/admin/staff", icon: "👥" },
    { name: "Slots", href: "/admin/qr", icon: "👆" },
    { name: "Financials", href: "/admin/financials", icon: "💰" },
    { name: "Payroll", href: "/admin/payroll", icon: "📑" },
    { name: "Clock-In Kiosk", href: "/kiosk?from=admin", icon: "🧬" },
  ];

  const mobileLinks = [
    { name: "Home", href: "/", icon: "🏠" },
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Staff", href: "/admin/staff", icon: "👥" },
    { name: "Kiosk", href: "/kiosk?from=admin", icon: "🧬" },
  ];

  if (!isAuthenticated) {
    return (
      <div className={`admin-shell ${isLightTheme ? "light-theme" : ""}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="bg-mesh" />
        <div className="glass animate-slide-up" style={{ padding: '3rem', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', width: '90%', zIndex: 10 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="text-gradient" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
              Access Code
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Enter the 6-digit code for the Admin Dashboard.
            </p>
          </div>
          
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
              const filled = pinEntry.length > i;
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
          
          <Link href="/">
            <button 
              className="btn-modern btn-secondary" 
              style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-shell animate-slide-up ${isLightTheme ? "light-theme" : ""}`}>
      <div className="bg-mesh" />
      
      {/* Sidebar - Hidden on Mobile */}
      <aside className="sidebar-modern glass" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
        <div style={{ padding: '0 0.5rem 2rem 0.5rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: '800' }}>
            Fulbari
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.1em' }}>CONTROL CENTER</p>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {navLinks.map((link) => {
            const isKiosk = link.href === "/kiosk";
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={`sidebar-link ${pathname === link.href ? "active" : ""}`}
                style={isKiosk ? {
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.08))',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '12px',
                  marginTop: '1.25rem',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.05)'
                } : undefined}
              >
                <span style={{ fontSize: '1.25rem' }}>{link.icon}</span>
                <span style={{ fontWeight: isKiosk ? '800' : 'normal' }}>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isLightTheme ? 'Light' : 'Dark'} Mode</span>
             <div 
              onClick={toggleTheme}
              style={{ 
                width: '44px', 
                height: '24px', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '20px', 
                position: 'relative', 
                cursor: 'pointer',
                border: '1px solid var(--glass-border)'
              }}
            >
              <div style={{ 
                width: '18px', 
                height: '18px', 
                background: 'var(--brand-primary)', 
                borderRadius: '50%', 
                position: 'absolute', 
                top: '2px', 
                left: isLightTheme ? '22px' : '2px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
              }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', background: 'var(--brand-accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--brand-accent)' }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>System Live</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>v3.0.0-stable</p>
        </div>
      </aside>

      {/* Floating Mobile Bottom Nav */}
      <div className="bottom-nav-modern">
        {mobileLinks.map((link) => (
          <Link 
            key={link.href}
            href={link.href} 
            className={`sidebar-link ${pathname === link.href ? "active" : ""}`}
            style={{ flexDirection: 'column', gap: '4px', padding: '0.5rem', flex: 1, borderRadius: '20px' }}
          >
            <span style={{ fontSize: '1.25rem' }}>{link.icon}</span>
            <span style={{ fontSize: '0.6rem' }}>{link.name}</span>
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
