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

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsLightTheme(true);
    }
  }, []);

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
