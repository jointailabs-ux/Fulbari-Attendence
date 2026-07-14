"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface StaffItem {
  id: string;
  name: string;
  slot?: { name: string; outlet?: { name: string } };
}

export default function StaffPortalPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [pinEntry, setPinEntry] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [step, setStep] = useState<"select" | "pin">("select");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/staff-login?list=true");
        const data = await res.json();
        setStaffList(Array.isArray(data) ? data : []);
      } catch {
        setStaffList([]);
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  const filtered = staffList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.slot?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectStaff = (staff: StaffItem) => {
    setSelectedStaff(staff);
    setPinEntry("");
    setError("");
    setStep("pin");
  };

  const handlePinKey = useCallback(
    (key: string) => {
      setError("");
      if (key === "clear") {
        setPinEntry("");
      } else if (key === "backspace") {
        setPinEntry((p) => p.slice(0, -1));
      } else if (pinEntry.length < 6) {
        const next = pinEntry + key;
        setPinEntry(next);
        if (next.length === 6) {
          verifyPin(next);
        }
      }
    },
    [pinEntry]
  );

  useEffect(() => {
    if (step !== "pin") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handlePinKey(e.key);
      else if (e.key === "Backspace") handlePinKey("backspace");
      else if (e.key === "Delete" || e.key.toLowerCase() === "c") handlePinKey("clear");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, handlePinKey]);

  const verifyPin = async (pin: string) => {
    if (!selectedStaff) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaff.id, pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem(`staff_auth_${selectedStaff.id}`, "true");
        router.push(`/staff/${selectedStaff.id}`);
      } else {
        setError(data.error || "Incorrect PIN. Please try again.");
        setPinEntry("");
      }
    } catch {
      setError("Network error. Please try again.");
      setPinEntry("");
    } finally {
      setLoading(false);
    }
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="staff-portal-shell">
      <div className="bg-mesh" />

      {/* Header */}
      <header className="staff-portal-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="portal-logo">👤</div>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, background: "linear-gradient(135deg, #c4b5fd, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Portal
            </h1>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>EMPLOYEE SELF-SERVICE</p>
          </div>
        </div>
        <a href="/" style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          ← Back to Home
        </a>
      </header>

      <main className="staff-portal-main">
        {step === "select" && (
          <div className="animate-slide-up" style={{ width: "100%", maxWidth: "560px" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👋</div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Who are you?</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                Select your name to access your profile and salary information.
              </p>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: "1.5rem" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem" }}>🔍</span>
              <input
                type="text"
                className="input-modern"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="Search by name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Staff List */}
            <div className="glass" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
              {loadingList ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading staff list...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  {search ? "No staff found matching your search." : "No active staff members found."}
                </div>
              ) : (
                filtered.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => handleSelectStaff(staff)}
                    className="staff-select-btn"
                  >
                    <div className="staff-avatar">{initials(staff.name)}</div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{staff.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {staff.slot?.name || "No slot"} • {staff.slot?.outlet?.name || ""}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>→</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === "pin" && selectedStaff && (
          <div className="animate-slide-up glass" style={{ padding: "2.5rem", borderRadius: "24px", textAlign: "center", maxWidth: "380px", width: "90%" }}>
            {/* Back + Avatar */}
            <button
              onClick={() => { setStep("select"); setPinEntry(""); setError(""); }}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              ← Change user
            </button>

            <div className="staff-avatar-lg">{initials(selectedStaff.name)}</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "1rem", marginBottom: "0.3rem" }}>
              {selectedStaff.name}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
              {selectedStaff.slot?.name} · {selectedStaff.slot?.outlet?.name}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Enter your 6-digit PIN to continue
            </p>

            {error && (
              <div style={{ color: "var(--brand-secondary)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1rem", padding: "0.5rem 1rem", background: "rgba(244,63,94,0.08)", borderRadius: "8px", border: "1px solid rgba(244,63,94,0.15)" }}>
                ⚠️ {error}
              </div>
            )}

            {/* PIN dots */}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "2rem" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const filled = pinEntry.length > i;
                return (
                  <div
                    key={i}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      border: `2px solid ${filled ? "var(--brand-primary-light)" : "var(--glass-border)"}`,
                      background: filled ? "rgba(139, 92, 246, 0.12)" : "rgba(255,255,255,0.01)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.75rem",
                      boxShadow: filled ? "0 0 16px rgba(139, 92, 246, 0.2)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {filled ? "•" : ""}
                  </div>
                );
              })}
            </div>

            {/* Numpad */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "1rem" }}>
              {["1","2","3","4","5","6","7","8","9"].map((n) => (
                <button
                  key={n}
                  onClick={() => handlePinKey(n)}
                  disabled={loading}
                  className="pin-key-btn"
                >
                  {n}
                </button>
              ))}
              <button onClick={() => handlePinKey("clear")} disabled={loading} className="pin-key-btn pin-key-action">CLR</button>
              <button onClick={() => handlePinKey("0")} disabled={loading} className="pin-key-btn">0</button>
              <button onClick={() => handlePinKey("backspace")} disabled={loading} className="pin-key-btn">⌫</button>
            </div>

            {loading && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Verifying...</p>
            )}
          </div>
        )}
      </main>

      <style>{`
        .staff-portal-shell {
          min-height: 100vh;
          background: var(--bg-dark);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .staff-portal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid var(--glass-border);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(3, 0, 10, 0.6);
        }
        .portal-logo {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2));
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }
        .staff-portal-main {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem 1rem;
        }
        .staff-select-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          cursor: pointer;
          color: var(--text-main);
          transition: all 0.2s ease;
          width: 100%;
        }
        .staff-select-btn:hover {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateX(4px);
        }
        .staff-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.25));
          border: 1px solid rgba(139,92,246,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          color: var(--brand-primary-light);
          flex-shrink: 0;
        }
        .staff-avatar-lg {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.25));
          border: 2px solid rgba(139,92,246,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          color: var(--brand-primary-light);
          margin: 0 auto;
          box-shadow: 0 0 30px rgba(139,92,246,0.15);
        }
        .pin-key-btn {
          height: 54px;
          border-radius: 14px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,0.02);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: var(--font-heading);
        }
        .pin-key-btn:hover:not(:disabled) {
          background: rgba(139,92,246,0.1);
          border-color: rgba(139,92,246,0.3);
          transform: scale(1.04);
        }
        .pin-key-btn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .pin-key-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pin-key-action {
          color: var(--brand-secondary);
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
