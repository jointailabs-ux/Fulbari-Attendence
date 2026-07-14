"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ─── SVG Icon Components ─────────────────────────────────────────────────────
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Staff: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Slots: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.5 2 6 5 6 8c0 4 6 13 6 13s6-9 6-13c0-3-2.5-6-6-6z"/>
      <circle cx="12" cy="8" r="2"/>
    </svg>
  ),
  Finance: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Payroll: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Kiosk: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const navLinks = [
  { name: "Dashboard", href: "/admin", icon: Icons.Dashboard },
  { name: "Staff", href: "/admin/staff", icon: Icons.Staff },
  { name: "Slots", href: "/admin/qr", icon: Icons.Slots },
  { name: "Finance", href: "/admin/financials", icon: Icons.Finance },
  { name: "Payroll", href: "/admin/payroll", icon: Icons.Payroll },
  { name: "Settings", href: "/admin/settings", icon: Icons.Settings },
  { name: "Kiosk", href: "/kiosk?from=admin", icon: Icons.Kiosk },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") setIsLightTheme(true);
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handlePinKeyPress(e.key);
      else if (e.key === "Backspace") handlePinKeyPress("backspace");
      else if (e.key === "Delete" || e.key.toLowerCase() === "c") handlePinKeyPress("clear");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      if (nextPin.length === 6) verifyPin(nextPin);
    }
  };

  const verifyPin = async (pin: string) => {
    try {
      const res = await fetch("/api/v1/auth-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: "admin", pin }),
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
    } catch {
      setError("Network error. Please try again.");
      setPinEntry("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    router.push("/");
  };

  const toggleTheme = () => {
    const newTheme = !isLightTheme;
    setIsLightTheme(newTheme);
    localStorage.setItem("theme", newTheme ? "light" : "dark");
  };

  if (!isAuthenticated) {
    return (
      <div className={`admin-shell ${isLightTheme ? "light-theme" : ""}`} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="bg-mesh" />
        <div className="glass animate-slide-up" style={{ padding: "3rem 2.5rem", borderRadius: "24px", textAlign: "center", maxWidth: "400px", width: "90%", zIndex: 10 }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 className="text-gradient" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Access Code</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Enter the 6-digit code for the Admin Dashboard.</p>
          </div>
          {error && (
            <div style={{ color: "var(--brand-secondary)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "1rem", padding: "0.5rem 1rem", background: "rgba(244, 63, 94, 0.08)", borderRadius: "8px", border: "1px solid rgba(244, 63, 94, 0.15)", width: "100%" }}>
              ⚠️ {error}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "2rem", width: "100%" }}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const filled = pinEntry.length > i;
              return (
                <div key={i} style={{ width: "42px", height: "42px", borderRadius: "10px", border: `2px solid ${filled ? "var(--brand-primary-light)" : "var(--glass-border)"}`, background: filled ? "rgba(124, 58, 237, 0.08)" : "rgba(255,255,255,0.01)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-main)", boxShadow: filled ? "0 0 10px rgba(124, 58, 237, 0.15)" : "none", transition: "all 0.15s ease" }}>
                  {filled ? "•" : ""}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", width: "100%", marginBottom: "1.5rem" }}>
            {["1","2","3","4","5","6","7","8","9"].map((n) => (
              <button key={n} type="button" onClick={() => handlePinKeyPress(n)} style={{ height: "50px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", cursor: "pointer", transition: "all 0.2s" }} className="glass-hover">{n}</button>
            ))}
            <button type="button" onClick={() => handlePinKeyPress("clear")} style={{ height: "50px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", fontSize: "0.8rem", fontWeight: 700, color: "var(--brand-secondary)", cursor: "pointer", transition: "all 0.2s" }} className="glass-hover">CLR</button>
            <button type="button" onClick={() => handlePinKeyPress("0")} style={{ height: "50px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", cursor: "pointer", transition: "all 0.2s" }} className="glass-hover">0</button>
            <button type="button" onClick={() => handlePinKeyPress("backspace")} style={{ height: "50px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", fontSize: "1.1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} className="glass-hover">⌫</button>
          </div>
          <a href="/"><button className="btn-modern btn-secondary" style={{ width: "100%", padding: "0.7rem", borderRadius: "10px", fontSize: "0.85rem" }}>Cancel</button></a>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-shell ${isLightTheme ? "light-theme" : ""}`}>
      <div className="bg-mesh" />

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar-modern glass" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none", borderLeft: "none", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Brand */}
        <div style={{ padding: "0 0.5rem 2rem 0.5rem" }}>
          <h2 className="text-gradient" style={{ fontSize: "1.75rem", fontWeight: "800" }}>Fulbari</h2>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.12em" }}>CONTROL CENTER</p>
        </div>

        {/* Nav Links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href.split("?")[0]));
            const isKiosk = link.name === "Kiosk";
            return (
              <Link key={link.href} href={link.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                style={isKiosk ? { background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", marginTop: "1rem" } : undefined}
              >
                <span style={{ opacity: isActive ? 1 : 0.6, transition: "opacity 0.2s", color: isActive ? "var(--brand-primary-light)" : "inherit" }}>
                  <link.icon />
                </span>
                <span style={{ fontWeight: isKiosk ? "800" : 700, fontSize: "0.9rem" }}>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div style={{ marginTop: "auto" }}>
          {/* Theme Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", marginBottom: "1rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isLightTheme ? "Light" : "Dark"} Mode</span>
            <div onClick={toggleTheme} style={{ width: "44px", height: "24px", background: "rgba(255,255,255,0.05)", borderRadius: "20px", position: "relative", cursor: "pointer", border: "1px solid var(--glass-border)" }}>
              <div style={{ width: "18px", height: "18px", background: "var(--brand-primary)", borderRadius: "50%", position: "absolute", top: "2px", left: isLightTheme ? "22px" : "2px", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 0 10px rgba(99,102,241,0.5)" }} />
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.9rem 1.25rem", borderRadius: "12px", border: "1px solid rgba(244,63,94,0.2)",
              background: "rgba(244,63,94,0.06)", color: "var(--brand-secondary)",
              cursor: "pointer", fontWeight: 700, fontSize: "0.9rem",
              transition: "all 0.2s ease", fontFamily: "var(--font-heading)"
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.06)"; }}
          >
            <Icons.Logout />
            Sign Out
          </button>

          {/* Status */}
          <div style={{ marginTop: "1rem", padding: "0.9rem 1.1rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: "8px", height: "8px", background: "var(--brand-accent)", borderRadius: "50%", boxShadow: "0 0 10px var(--brand-accent)" }} />
              <span style={{ fontSize: "0.8rem", fontWeight: "600" }}>System Live</span>
            </div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>v3.0.0-stable</p>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <div className="bottom-nav-modern">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href.split("?")[0]));
          return (
            <Link key={link.href} href={link.href} className={`mobile-nav-item ${isActive ? "active" : ""}`}>
              <span className="mobile-nav-icon"><link.icon /></span>
              <span className="mobile-nav-label">{link.name}</span>
            </Link>
          );
        })}
        {/* Logout in mobile nav */}
        <button onClick={handleLogout} className="mobile-nav-item mobile-nav-logout">
          <span className="mobile-nav-icon"><Icons.Logout /></span>
          <span className="mobile-nav-label">Logout</span>
        </button>
      </div>

      {/* ── Main Content ── */}
      <main className="main-content animate-slide-up">
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
