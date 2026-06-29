// src/app/kiosk/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  discoverAndInitDevice,
  captureFingerprint,
  getDeviceStatus,
  checkServiceRunning,
  uninitDevice,
  type MantraServiceStatus,
} from "../../lib/mantra";

type Step =
  | "IDLE"
  | "SCANNING"
  | "MATCHED"
  | "NO_MATCH"
  | "ERROR"
  | "PIN_SELECT"
  | "PIN_ENTRY"
  | "ACTIONS"
  | "SUCCESS";

// ─────────────────────────────────────────────────────────────────────────────

export default function KioskPage() {
  const [step, setStep] = useState<Step>("IDLE");
  const [staff, setStaff] = useState<any>(null);
  const [clockType, setClockType] = useState<"IN" | "OUT" | "ALREADY_OUT" | null>(null);
  const [clockTime, setClockTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Device status
  const [deviceStatus, setDeviceStatus] = useState<MantraServiceStatus>({
    connected: false,
    deviceName: null,
    error: null,
  });
  const [isDeviceInit, setIsDeviceInit] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasConnectedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastScanTimeRef = useRef(0);
  const DEBOUNCE_MS = 2000;

  // PIN fallback state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [attendanceState, setAttendanceState] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [isAdminOrigin, setIsAdminOrigin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      setIsAdminOrigin(searchParams.get("from") === "admin");
    }
  }, []);

  // ── Device management ────────────────────────────────────────────────────────

  const initDevice = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setIsDeviceInit(true);

    const result = await discoverAndInitDevice();

    if (mountedRef.current) {
      setDeviceStatus(result);
      wasConnectedRef.current = result.connected;
      setIsDeviceInit(false);
    }
    isInitializingRef.current = false;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    initDevice();
    fetchStaffList();

    pollRef.current = setInterval(async () => {
      if (!mountedRef.current || isInitializingRef.current) return;

      const currentStatus = await getDeviceStatus();
      if (!mountedRef.current) return;

      if (!currentStatus.connected) {
        if (wasConnectedRef.current) {
          setDeviceStatus(currentStatus);
          wasConnectedRef.current = false;
        }
      } else if (!wasConnectedRef.current) {
        // Auto reconnect — no user click needed
        await initDevice();
      }
    }, 3000);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      uninitDevice();
    };
  }, [initDevice]);

  // Physical Keyboard Support for Kiosk PIN input
  useEffect(() => {
    if (step !== "PIN_ENTRY") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handlePinKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handlePinKeyPress("backspace");
      } else if (e.key === "Escape") {
        setStep("PIN_SELECT");
        setEnteredPin("");
        setError("");
      } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
        handlePinKeyPress("clear");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step, enteredPin]);

  // ── Staff list ───────────────────────────────────────────────────────────────

  const fetchStaffList = async () => {
    try {
      const res = await fetch("/api/v1/staff");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaffList(data.filter((s: any) => s.isActive));
      }
    } catch (e: any) {
      console.error("Failed to load staff list:", e.message);
    }
  };

  // ── Biometric scan (1:N — server does the matching) ──────────────────────────

  const triggerBiometricScan = async () => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < DEBOUNCE_MS) return;
    lastScanTimeRef.current = now;

    setLoading(true);
    setError("");
    setStep("SCANNING");

    try {
      // If device not connected, attempt auto-init before failing
      if (!wasConnectedRef.current) {
        const result = await discoverAndInitDevice();
        wasConnectedRef.current = result.connected;
        if (mountedRef.current) {
          setDeviceStatus(result);
        }
        if (!result.connected) {
          throw new Error(
            result.error || "Scanner not connected. Please plug in the MFS500 and wait for it to initialize automatically."
          );
        }
      }

      // 1. Capture fingerprint via proxy
      const capture = await captureFingerprint();
      if (!capture.success || !capture.template) {
        throw new Error(capture.error ?? "Fingerprint capture failed.");
      }

      // 2. Server-side 1:N identification (uses raw TCP — correct MorFin protocol)
      const identifyRes = await fetch("/api/v1/fingerprint/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateData: capture.template }),
      });

      const identifyData = await identifyRes.json();

      if (!identifyRes.ok || !identifyData.success) {
        if (identifyRes.status === 404) {
          // No match found
          setStep("NO_MATCH");
          setError(identifyData.error ?? "Fingerprint not recognised.");
          setTimeout(() => { if (mountedRef.current) resetKiosk(); }, 4000);
          return;
        }
        if (identifyRes.status === 503) {
          throw new Error(identifyData.error ?? "Scanner service unavailable.");
        }
        throw new Error(identifyData.error ?? "Identification failed.");
      }

      // 3. Navigate to Actions Screen for identified employee
      setStaff({
        staffId: identifyData.staffId,
        staffName: identifyData.staffName,
        slotName: identifyData.slotName || "Standard Slot",
      });
      setAttendanceState(identifyData.currentState || "NOT_STARTED");
      setTodayRecord(identifyData.todayRecord);
      setStep("ACTIONS");
    } catch (e: any) {
      setError(e.message ?? "Biometric scan failed.");
      setStep("ERROR");
      setTimeout(() => { if (mountedRef.current) resetKiosk(); }, 4500);
    } finally {
      setLoading(false);
    }
  };

  // ── Biometric verify for selected staff (PIN flow → biometric 1:1) ────────────

  const triggerBiometricVerifyForStaff = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    setError("");

    try {
      if (!wasConnectedRef.current) {
        const result = await discoverAndInitDevice();
        wasConnectedRef.current = result.connected;
        if (mountedRef.current) {
          setDeviceStatus(result);
        }
        if (!result.connected) {
          throw new Error(result.error || "Scanner not connected. Please plug in the MFS500.");
        }
      }

      const capture = await captureFingerprint();
      if (!capture.success || !capture.template) {
        throw new Error(capture.error ?? "Capture failed.");
      }

      // 1:1 verify via server (uses raw TCP correctly)
      const identifyRes = await fetch("/api/v1/fingerprint/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateData: capture.template,
          staffId: selectedStaff.id,
        }),
      });

      const identifyData = await identifyRes.json();

      if (!identifyRes.ok || !identifyData.success) {
        throw new Error(
          identifyData.error ?? "Fingerprint does not match this employee's records."
        );
      }

      setStaff({
        staffId: identifyData.staffId,
        staffName: identifyData.staffName,
        slotName: identifyData.slotName ?? selectedStaff.slot?.name ?? "Standard Slot",
      });
      setAttendanceState(identifyData.currentState ?? "NOT_STARTED");
      setTodayRecord(identifyData.todayRecord);
      setStep("ACTIONS");
      setEnteredPin("");
    } catch (e: any) {
      setError(e.message ?? "Biometric verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── PIN flow ─────────────────────────────────────────────────────────────────

  const handlePinKeyPress = (key: string) => {
    if (key === "clear") {
      setEnteredPin("");
    } else if (key === "backspace") {
      setEnteredPin((p) => p.slice(0, -1));
    } else if (enteredPin.length < 4) {
      const next = enteredPin + key;
      setEnteredPin(next);
      if (next.length === 4) submitPin(next);
    }
  };

  const submitPin = async (pin: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaff.id, pin }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Invalid PIN.");

      setStaff({
        staffId: selectedStaff.id,
        staffName: data.name || data.staffName,
        slotName: selectedStaff.slot?.name ?? "Standard Slot",
      });
      setAttendanceState(data.currentState ?? "NOT_STARTED");
      setTodayRecord(data.todayRecord);
      setStep("ACTIONS");
      setEnteredPin("");
    } catch (e: any) {
      setError(e.message ?? "Invalid PIN.");
      setEnteredPin("");
    } finally {
      setLoading(false);
    }
  };

  // ── Attendance actions (from PIN/biometric flow) ──────────────────────────────

  const handleAction = async (action: string) => {
    if (!staff) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.staffId, action }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Action failed.");
      setAttendanceState(data.newState);
      setTodayRecord(data.todayRecord);
      setStep("SUCCESS");
      setTimeout(() => {
        if (mountedRef.current) {
          if (isAdminOrigin) {
            window.location.href = "/admin";
          } else {
            resetKiosk();
          }
        }
      }, 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────────

  const resetKiosk = () => {
    setStep("IDLE");
    setStaff(null);
    setClockType(null);
    setClockTime("");
    setError("");
    setSelectedStaff(null);
    setEnteredPin("");
    setSearchQuery("");
    setAttendanceState(null);
    setTodayRecord(null);
    fetchStaffList();
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ── Status display helpers ───────────────────────────────────────────────────

  const statusDotColor = isDeviceInit
    ? "#f59e0b"
    : deviceStatus.connected
    ? "#10b981"
    : "#f43f5e";

  const statusLabel = isDeviceInit
    ? "INITIALIZING"
    : deviceStatus.connected
    ? "SCANNER READY"
    : "SCANNER OFFLINE";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="kiosk-wrapper"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
      }}
    >
      <div className="bg-mesh" />

      {/* ── Top-left Exit to Homepage Button ── */}
      <div style={{ position: "fixed", top: "1rem", left: "1rem", zIndex: 50 }}>
        <a
          href={isAdminOrigin ? "/admin" : "/"}
          className="glass glass-hover"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.15rem",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(12px)",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          {isAdminOrigin ? "↩ Back to Admin" : "🏠 Homepage"}
        </a>
      </div>

      {/* ── Top-right Scanner Status Badge ── */}
      <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 50 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 1rem",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(12px)",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: statusDotColor,
              boxShadow: `0 0 10px ${statusDotColor}`,
              animation: isDeviceInit
                ? "pulse 1s ease-in-out infinite"
                : deviceStatus.connected
                ? "pulse 2.5s ease-in-out infinite"
                : "none",
            }}
          />
          <span>{statusLabel}</span>
          {!deviceStatus.connected && !isDeviceInit && (
            <button
              type="button"
              onClick={initDevice}
              style={{
                background: "none",
                border: "none",
                color: "var(--brand-primary-light)",
                cursor: "pointer",
                fontSize: "0.7rem",
                fontWeight: 800,
                padding: 0,
                marginLeft: "0.25rem",
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* ── Top Banner ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          marginBottom: "2rem",
          padding: "0.5rem 1.25rem",
          borderRadius: "100px",
          border: "1px solid var(--glass-border)",
          background: "rgba(255,255,255,0.01)",
        }}
        className="glass"
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          ✦ FULBARI BIOMETRIC KIOSK
        </span>
      </div>

      <div
        className="glass animate-slide-up"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "3rem 2rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          borderRadius: "24px",
        }}
      >
        {/* Glow spheres */}
        <div
          style={{
            position: "absolute", top: "-100px", left: "-100px",
            width: "200px", height: "200px",
            background: "var(--brand-primary)", filter: "blur(100px)",
            opacity: 0.12, pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "-80px", right: "-80px",
            width: "160px", height: "160px",
            background: "var(--brand-accent)", filter: "blur(80px)",
            opacity: 0.08, pointerEvents: "none",
          }}
        />

        {/* Error banner */}
        {error && (
          <div
            style={{
              marginBottom: "2rem",
              padding: "1rem 1.25rem",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "12px",
              color: "#f43f5e",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              textAlign: "left",
              boxShadow: "0 4px 12px rgba(244, 63, 94, 0.15)",
            }}
            className="animate-slide-up"
          >
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚠️</span>
            <span style={{ fontWeight: 600, lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

        {/* ══ IDLE ══ */}
        {step === "IDLE" && (
          <div className="animate-slide-up">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2rem",
              }}
            >
              <div>
                <h1
                  className="text-gradient"
                  style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
                >
                  {deviceStatus.connected
                    ? "Place Finger to Clock In"
                    : "Scanner Offline"}
                </h1>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    marginBottom: "0",
                  }}
                >
                  {deviceStatus.connected
                    ? "Position your finger on the scanner to mark attendance"
                    : deviceStatus.error ??
                      "Connecting to scanner... please wait or plug in your MFS500."}
                </p>
              </div>

              {/* Pulsing fingerprint button */}
              <button
                type="button"
                id="kiosk-scan-button"
                onClick={triggerBiometricScan}
                disabled={loading}
                style={{
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  border: deviceStatus.connected
                    ? "2px solid rgba(99,102,241,0.4)"
                    : "2px solid var(--glass-border)",
                  background: deviceStatus.connected
                    ? "rgba(99,102,241,0.06)"
                    : "rgba(255,255,255,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: deviceStatus.connected
                    ? "0 8px 32px rgba(99, 102, 241, 0.2)"
                    : "none",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  outline: "none",
                  position: "relative",
                  opacity: loading ? 0.6 : 1,
                }}
                className="glass-hover fingerprint-button"
              >
                {deviceStatus.connected && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "140px",
                      height: "140px",
                      borderRadius: "50%",
                      border: "1px dashed rgba(99,102,241,0.3)",
                      animation: "pulse 2.5s ease-in-out infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: "4rem",
                    filter: deviceStatus.connected
                      ? "drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))"
                      : "none",
                    animation: deviceStatus.connected
                      ? "pulse 2.5s ease-in-out infinite"
                      : "none",
                    opacity: deviceStatus.connected ? 1 : 0.35,
                  }}
                >
                  🧬
                </span>
              </button>

              <button
                type="button"
                id="kiosk-scan-btn"
                onClick={triggerBiometricScan}
                disabled={loading}
                className="btn-modern btn-primary"
                style={{
                  width: "100%",
                  maxWidth: "280px",
                  padding: "0.8rem",
                  borderRadius: "12px",
                }}
              >
                {loading ? "⏳ Scanning..." : "⚡ Tap to Scan"}
              </button>

              {!deviceStatus.connected && !isDeviceInit && (
                <button
                  type="button"
                  onClick={initDevice}
                  className="btn-modern btn-secondary"
                  style={{
                    width: "100%",
                    maxWidth: "280px",
                    padding: "0.7rem",
                    borderRadius: "12px",
                    fontSize: "0.85rem",
                  }}
                >
                  🔄 Connect Scanner
                </button>
              )}

              <button
                onClick={() => setStep("PIN_SELECT")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                🔑 Use PIN Instead
              </button>
            </div>
          </div>
        )}

        {/* ══ SCANNING ══ */}
        {step === "SCANNING" && (
          <div className="animate-slide-up" style={{ padding: "2rem 0" }}>
            <div
              style={{ fontSize: "4rem", marginBottom: "1.5rem", animation: "pulse 1s infinite" }}
            >
              ⏳
            </div>
            <h2
              className="text-gradient"
              style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
            >
              Scanning...
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Hold your finger steady on the scanner.
            </p>
          </div>
        )}

        {/* ══ MATCHED ══ */}
        {step === "MATCHED" && staff && (
          <div className="animate-slide-up" style={{ padding: "2rem 0" }}>
            <div
              style={{
                width: "96px",
                height: "96px",
                background:
                  clockType === "OUT"
                    ? "rgba(244, 63, 94, 0.1)"
                    : "rgba(16, 185, 129, 0.1)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 2rem auto",
                fontSize: "3.5rem",
                boxShadow: `0 0 40px ${
                  clockType === "OUT"
                    ? "rgba(244, 63, 94, 0.2)"
                    : "rgba(16, 185, 129, 0.2)"
                }`,
              }}
            >
              {clockType === "OUT" ? "👋" : clockType === "ALREADY_OUT" ? "✅" : "☀️"}
            </div>
            <h1
              className="text-gradient"
              style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}
            >
              {clockType === "ALREADY_OUT" ? "Already Done!" : `Clocked ${clockType}`}
            </h1>
            <p
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text-main)",
                marginBottom: "0.5rem",
              }}
            >
              {staff.staffName}
            </p>
            <p
              style={{
                fontSize: "1.25rem",
                color: "var(--brand-primary-light)",
                fontWeight: 700,
              }}
            >
              {clockTime}
            </p>
            {clockType === "ALREADY_OUT" && (
              <p
                style={{
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                  borderRadius: "8px",
                  fontWeight: "600",
                }}
              >
                {staff.clockMessage ?? "Shift already ended for today."}
              </p>
            )}
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "1.5rem",
                fontWeight: 600,
              }}
            >
              Returning in 3 seconds...
            </p>
          </div>
        )}

        {/* ══ NO_MATCH ══ */}
        {step === "NO_MATCH" && (
          <div className="animate-slide-up" style={{ padding: "2rem 0" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>❌</div>
            <h2
              style={{
                fontSize: "1.75rem",
                marginBottom: "0.5rem",
                color: "#f43f5e",
              }}
            >
              Not Recognised
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {error || "Fingerprint not recognised. Please try again or contact admin."}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "1.5rem",
                fontWeight: 600,
              }}
            >
              Returning in 4 seconds...
            </p>
          </div>
        )}

        {/* ══ ERROR ══ */}
        {step === "ERROR" && (
          <div className="animate-slide-up" style={{ padding: "2rem 0" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>⚠️</div>
            <h2
              style={{
                fontSize: "1.75rem",
                marginBottom: "0.5rem",
                color: "#f59e0b",
              }}
            >
              Scan Error
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {error || "Something went wrong. Please try again."}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "1.5rem",
                fontWeight: 600,
              }}
            >
              Returning in 4 seconds...
            </p>
          </div>
        )}

        {/* ══ PIN_SELECT: Choose employee ══ */}
        {step === "PIN_SELECT" && (
          <div className="animate-slide-up" style={{ textAlign: "left" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <h1
                className="text-gradient"
                style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}
              >
                Select Employee
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Tap your name to continue.
              </p>
            </div>

            <input
              className="input-modern"
              placeholder="🔍 Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "1.25rem",
                padding: "0.8rem 1.2rem",
                borderRadius: "12px",
              }}
            />

            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                paddingRight: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {staffList
                .filter((s) =>
                  s.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((s) => (
                  <div
                    key={s.id}
                    id={`staff-select-${s.id}`}
                    onClick={() => {
                      setSelectedStaff(s);
                      setStep("PIN_ENTRY");
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.9rem 1.2rem",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "12px",
                      cursor: "pointer",
                    }}
                    className="glass-hover"
                  >
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {s.name}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {s.slot?.name ?? "Standard Slot"}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "1.1rem",
                        color: "var(--brand-primary-light)",
                      }}
                    >
                      →
                    </span>
                  </div>
                ))}
              {staffList.filter((s) =>
                s.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    padding: "2rem",
                  }}
                >
                  No personnel found.
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {deviceStatus.connected && (
                <button
                  onClick={() => setStep("IDLE")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--brand-primary-light)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  🧬 Use Fingerprint Instead
                </button>
              )}
              <button
                className="btn-modern btn-secondary"
                onClick={resetKiosk}
                style={{ padding: "0.7rem", borderRadius: "12px", fontSize: "0.85rem" }}
              >
                ← Cancel
              </button>
            </div>
          </div>
        )}

        {/* ══ PIN_ENTRY: Verify with PIN or Biometric ══ */}
        {step === "PIN_ENTRY" && selectedStaff && (
          <div
            className="animate-slide-up"
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h1
              className="text-gradient"
              style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
            >
              Verify Identity
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Clocking in/out for <strong>{selectedStaff.name}</strong>
            </p>

            {/* Auth method toggle */}
            {deviceStatus.connected && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "2rem",
                  padding: "0.3rem",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "14px",
                  border: "1px solid var(--glass-border)",
                  maxWidth: "280px",
                  width: "100%",
                }}
              >
                <button
                  type="button"
                  id="pin-mode-btn"
                  onClick={() => {
                    setError("");
                    setEnteredPin("");
                  }}
                  className="btn-modern btn-secondary"
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    borderRadius: "10px",
                    minWidth: "auto",
                  }}
                >
                  🔑 PIN
                </button>
                <button
                  type="button"
                  id="biometric-mode-btn"
                  onClick={triggerBiometricVerifyForStaff}
                  disabled={loading}
                  className="btn-modern btn-primary"
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    borderRadius: "10px",
                    minWidth: "auto",
                  }}
                >
                  {loading ? "⏳" : "🧬 Fingerprint"}
                </button>
              </div>
            )}

            {/* PIN dots */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                marginBottom: "2rem",
              }}
            >
              {[0, 1, 2, 3].map((i) => {
                const filled = enteredPin.length > i;
                return (
                  <div
                    key={i}
                    style={{
                      width: "54px",
                      height: "54px",
                      borderRadius: "12px",
                      border: `2px solid ${filled ? "var(--brand-primary-light)" : "var(--glass-border)"}`,
                      background: filled
                        ? "rgba(99, 102, 241, 0.08)"
                        : "rgba(255,255,255,0.01)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.75rem",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      boxShadow: filled
                        ? "0 0 15px rgba(99, 102, 241, 0.15)"
                        : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {filled ? "•" : ""}
                  </div>
                );
              })}
            </div>

            {/* Numeric keypad */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
                maxWidth: "280px",
                width: "100%",
                marginBottom: "2rem",
              }}
            >
              {["1","2","3","4","5","6","7","8","9"].map((n) => (
                <button
                  key={n}
                  type="button"
                  id={`pin-key-${n}`}
                  onClick={() => handlePinKeyPress(n)}
                  disabled={loading}
                  style={{
                    height: "56px",
                    borderRadius: "14px",
                    border: "1px solid var(--glass-border)",
                    background: "rgba(255,255,255,0.02)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    cursor: "pointer",
                  }}
                  className="glass-hover"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                id="pin-key-clear"
                onClick={() => handlePinKeyPress("clear")}
                disabled={loading}
                style={{
                  height: "56px",
                  borderRadius: "14px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255,255,255,0.02)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--brand-secondary)",
                  cursor: "pointer",
                }}
                className="glass-hover"
              >
                CLEAR
              </button>
              <button
                type="button"
                id="pin-key-0"
                onClick={() => handlePinKeyPress("0")}
                disabled={loading}
                style={{
                  height: "56px",
                  borderRadius: "14px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255,255,255,0.02)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  cursor: "pointer",
                }}
                className="glass-hover"
              >
                0
              </button>
              <button
                type="button"
                id="pin-key-backspace"
                onClick={() => handlePinKeyPress("backspace")}
                disabled={loading}
                style={{
                  height: "56px",
                  borderRadius: "14px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255,255,255,0.02)",
                  fontSize: "1.2rem",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="glass-hover"
              >
                ⌫
              </button>
            </div>

            <button
              className="btn-modern btn-secondary"
              onClick={() => {
                setStep("PIN_SELECT");
                setEnteredPin("");
                setError("");
              }}
              style={{
                width: "100%",
                maxWidth: "280px",
                padding: "0.8rem",
                borderRadius: "12px",
              }}
            >
              ← Choose Different Name
            </button>
          </div>
        )}

        {/* ══ ACTIONS: Shift controls ══ */}
        {step === "ACTIONS" && (
          <div className="animate-slide-up">
            <div style={{ marginBottom: "2.5rem" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  background: "rgba(16, 185, 129, 0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem auto",
                  fontSize: "2rem",
                  color: "var(--brand-accent)",
                  boxShadow: "0 0 30px rgba(16, 185, 129, 0.15)",
                }}
              >
                ✓
              </div>
              <h1
                className="text-gradient"
                style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}
              >
                Hi, {staff?.staffName}!
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "0.35rem 0.85rem",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "100px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                  }}
                >
                  {staff?.slotName}
                </span>
                <span
                  style={{
                    padding: "0.35rem 0.85rem",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "var(--brand-accent)",
                    borderRadius: "100px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {attendanceState?.replace(/_/g, " ") ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              {attendanceState === "NOT_STARTED" && (
                <button
                  id="action-start-shift"
                  className="btn-modern btn-primary"
                  onClick={() => handleAction("START_SHIFT")}
                  disabled={loading}
                  style={{ height: "90px", fontSize: "1.4rem", borderRadius: "20px" }}
                >
                  <span style={{ fontSize: "2.25rem", marginRight: "0.5rem" }}>☀️</span>{" "}
                  Start Shift
                </button>
              )}
              {attendanceState === "SHIFT_STARTED" && (
                <>
                  <button
                    id="action-start-break"
                    className="btn-modern"
                    onClick={() => handleAction("START_BREAK")}
                    disabled={loading}
                    style={{
                      height: "80px",
                      fontSize: "1.3rem",
                      borderRadius: "20px",
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "white",
                      border: "none",
                    }}
                  >
                    <span style={{ fontSize: "2rem", marginRight: "0.5rem" }}>☕</span>{" "}
                    Take Break
                  </button>
                  <button
                    id="action-end-shift"
                    className="btn-modern"
                    onClick={() => handleAction("END_SHIFT")}
                    disabled={loading}
                    style={{
                      height: "80px",
                      fontSize: "1.3rem",
                      borderRadius: "20px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "white",
                      border: "none",
                    }}
                  >
                    <span style={{ fontSize: "2rem", marginRight: "0.5rem" }}>🏠</span>{" "}
                    End Shift
                  </button>
                </>
              )}
              {attendanceState === "ON_BREAK" && (
                <button
                  id="action-end-break"
                  className="btn-modern btn-primary"
                  onClick={() => handleAction("END_BREAK")}
                  disabled={loading}
                  style={{ height: "90px", fontSize: "1.4rem", borderRadius: "20px" }}
                >
                  <span style={{ fontSize: "2.25rem", marginRight: "0.5rem" }}>🔙</span>{" "}
                  Resume Work
                </button>
              )}
              {attendanceState === "SHIFT_ENDED" && (
                <div
                  className="glass"
                  style={{
                    padding: "2rem",
                    background: "rgba(255,255,255,0.01)",
                    borderRadius: "16px",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>👋</div>
                  <h3 style={{ marginBottom: "0.5rem", fontWeight: 700 }}>
                    Shift Completed
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    You have completed your shift for today. Have a wonderful day!
                  </p>
                </div>
              )}
            </div>

            {/* Today's Punch Timeline */}
            {todayRecord && (
              <div
                className="glass"
                style={{
                  marginTop: "2rem",
                  padding: "1.25rem",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--glass-border)",
                  textAlign: "left",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "var(--brand-accent)",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  ⏱️ Today's Punch Timeline
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
                  {/* Shift Start */}
                  {todayRecord.startTime && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        🟢 Shift Started
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                        {formatTime(todayRecord.startTime)}
                      </span>
                    </div>
                  )}

                  {/* Breaks */}
                  {todayRecord.breaks && todayRecord.breaks.map((brk: any, idx: number) => (
                    <div key={brk.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", paddingLeft: "1rem", borderLeft: "2px dashed var(--glass-border)", margin: "0.25rem 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                          ☕ Break #{idx + 1} Out (Start)
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                          {formatTime(brk.startTime)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                          ☕ Break #{idx + 1} In (End)
                        </span>
                        <span style={{ fontWeight: 600, color: brk.endTime ? "var(--text-main)" : "#f59e0b" }}>
                          {brk.endTime ? formatTime(brk.endTime) : "Active..."}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Shift End */}
                  {todayRecord.endTime && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                      <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        🔴 Shift Ended
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                        {formatTime(todayRecord.endTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={resetKiosk}
              style={{
                marginTop: "2.5rem",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Cancel & Exit
            </button>
          </div>
        )}

        {/* ══ SUCCESS ══ */}
        {step === "SUCCESS" && (
          <div className="animate-slide-up" style={{ padding: "2rem 0" }}>
            <div
              style={{
                width: "96px",
                height: "96px",
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 2rem auto",
                fontSize: "4rem",
                color: "var(--brand-accent)",
                boxShadow: "0 0 40px rgba(16, 185, 129, 0.2)",
              }}
            >
              ✓
            </div>
            <h1
              className="text-gradient"
              style={{ fontSize: "2.5rem", marginBottom: "1rem" }}
            >
              Success!
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "1.05rem",
                lineHeight: 1.6,
              }}
            >
              Attendance logged for{" "}
              <strong style={{ color: "var(--text-main)" }}>{staff?.staffName}</strong>.
              <br />
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "var(--brand-primary-light)",
                  fontWeight: 600,
                }}
              >
                Returning in 4 seconds...
              </span>
            </p>
          </div>
        )}
      </div>

      <p
        style={{
          marginTop: "2rem",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          opacity: 0.5,
        }}
      >
        FULBARI RESTORA • APMS KIOSK v5.0
      </p>
    </div>
  );
}
