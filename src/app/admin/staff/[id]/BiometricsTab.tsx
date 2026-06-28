// src/app/admin/staff/[id]/BiometricsTab.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  discoverAndInitDevice,
  captureFingerprint,
  getDeviceStatus,
  verifyFingerprint,
  checkServiceRunning,
  uninitDevice,
  type MantraServiceStatus,
} from "../../../../lib/mantra";

interface FingerprintRecord {
  id: string;
  fingerIndex: string;
  deviceInfo: string | null;
  enrolledAt: string;
  templateData?: string; // included in staff.fingerprints
}

const FINGER_LABELS: Record<string, string> = {
  RIGHT_INDEX: "👉 Right Index",
  RIGHT_THUMB: "👍 Right Thumb",
  RIGHT_MIDDLE: "🖕 Right Middle",
  LEFT_INDEX: "👈 Left Index",
  LEFT_THUMB: "👎 Left Thumb",
  LEFT_MIDDLE: "Left Middle",
};

export default function BiometricsTab({
  staff,
  refresh,
}: {
  staff: any;
  refresh: () => void;
}) {
  const [targetFinger, setTargetFinger] = useState("RIGHT_INDEX");

  // Device state
  const [deviceStatus, setDeviceStatus] = useState<MantraServiceStatus>({
    connected: false,
    deviceName: null,
    error: null,
  });
  const [isDeviceInit, setIsDeviceInit] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasConnectedRef = useRef(false);
  const isInitRef = useRef(false);

  const initDevice = useCallback(async () => {
    if (isInitRef.current) return;
    isInitRef.current = true;
    setIsDeviceInit(true);
    const result = await discoverAndInitDevice();
    setDeviceStatus(result);
    wasConnectedRef.current = result.connected;
    setIsDeviceInit(false);
    isInitRef.current = false;
  }, []);

  useEffect(() => {
    // Auto-init when tab opens
    initDevice();

    pollRef.current = setInterval(async () => {
      if (isInitRef.current) return;
      
      const currentStatus = await getDeviceStatus();
      if (isInitRef.current) return;

      if (!currentStatus.connected) {
        if (wasConnectedRef.current) {
          setDeviceStatus(currentStatus);
          wasConnectedRef.current = false;
        }
      } else if (!wasConnectedRef.current) {
        // Auto-reconnect
        await initDevice();
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      uninitDevice();
    };
  }, [initDevice]);

  // ── Enroll state ─────────────────────────────────────────────────────────────
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanSuccess, setScanSuccess] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | null>(null);

  // ── Test state ───────────────────────────────────────────────────────────────
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testScore, setTestScore] = useState<number | null>(null);

  // ── Enroll handler ───────────────────────────────────────────────────────────
  const handleEnroll = async () => {
    setScanLoading(true);
    setScanMessage("Place finger on scanner...");
    setScanSuccess(false);
    setQualityScore(null);

    try {
      const currentCount: number = staff.fingerprints?.length ?? 0;
      if (currentCount >= 3) {
        throw new Error(
          "Maximum of 3 enrolled fingerprint slots reached. Delete an existing one first."
        );
      }

      if (!deviceStatus.connected) {
        // Try auto-init before giving up
        await initDevice();
        if (!wasConnectedRef.current) {
          throw new Error(
            "Scanner not connected. Plug in your MFS500 scanner and click Connect."
          );
        }
      }

      const result = await captureFingerprint();

      if (!result.success || !result.template) {
        throw new Error(result.error ?? "Fingerprint capture failed.");
      }

      setQualityScore(result.quality);
      setScanMessage(`Scan successful! Quality: ${result.quality}%. Saving...`);

      const enrollRes = await fetch("/api/v1/fingerprint/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          template: result.template,
          fingerIndex: targetFinger,
          deviceInfo: deviceStatus.deviceName ?? "MFS500-MorFin",
        }),
      });

      const enrollData = await enrollRes.json();
      if (!enrollRes.ok) {
        throw new Error(enrollData.error ?? "Failed to save template to database.");
      }

      setScanMessage(
        `✅ Fingerprint enrolled successfully for ${FINGER_LABELS[targetFinger] ?? targetFinger}!`
      );
      setScanSuccess(true);
      refresh();
    } catch (e: any) {
      setScanMessage(e.message ?? "Enrollment failed.");
      setScanSuccess(false);
    } finally {
      setScanLoading(false);
    }
  };

  // ── Test fingerprint handler ─────────────────────────────────────────────────
  const handleTestFingerprint = async () => {
    const enrolledPrints: FingerprintRecord[] = staff.fingerprints ?? [];

    if (enrolledPrints.length === 0) {
      setTestMessage("No fingerprints enrolled yet. Enrol at least one first.");
      setTestSuccess(false);
      return;
    }

    setTestLoading(true);
    setTestMessage("Place the enrolled finger on scanner...");
    setTestSuccess(null);
    setTestScore(null);

    try {
      if (!deviceStatus.connected) {
        await initDevice();
        if (!wasConnectedRef.current) {
          throw new Error("Scanner not connected.");
        }
      }

      const capture = await captureFingerprint();
      if (!capture.success || !capture.template) {
        throw new Error(capture.error ?? "Capture failed.");
      }

      // Verify against all enrolled templates — stop on first match
      let matched = false;
      let bestScore = 0;

      for (const fp of enrolledPrints) {
        if (!fp.templateData) continue;
        const vr = await verifyFingerprint(capture.template, fp.templateData);
        if (vr.score > bestScore) bestScore = vr.score;
        if (vr.match) {
          matched = true;
          break;
        }
      }

      setTestScore(bestScore);

      if (matched) {
        setTestMessage(
          `✅ Fingerprint MATCHED! Score: ${bestScore}. Enrollment is working correctly.`
        );
        setTestSuccess(true);
      } else {
        setTestMessage(
          `❌ No match found (best score: ${bestScore}). Try again with the exact enrolled finger.`
        );
        setTestSuccess(false);
      }
    } catch (e: any) {
      setTestMessage(e.message ?? "Test failed.");
      setTestSuccess(false);
    } finally {
      setTestLoading(false);
    }
  };

  // ── Delete handler ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Permanently delete fingerprint template for ${label}?`)) return;

    try {
      const res = await fetch(`/api/v1/fingerprint/enroll?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        refresh();
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to delete template.");
      }
    } catch {
      alert("Network error while deleting template.");
    }
  };

  // ── Device status display ────────────────────────────────────────────────────
  const dotColor = isDeviceInit
    ? "#f59e0b"
    : deviceStatus.connected
    ? "#10b981"
    : "#f43f5e";

  const statusLabel = isDeviceInit
    ? "Initializing..."
    : deviceStatus.connected
    ? `${deviceStatus.deviceName ?? "MFS500"} Connected`
    : "Scanner Offline";

  const currentPrints: FingerprintRecord[] = staff.fingerprints ?? [];

  return (
    <div
      className="animate-slide-up"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "2rem",
      }}
    >
      {/* ── Left: Enroll panel ── */}
      <section
        className="glass"
        style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}
      >
        <div>
          <h2 style={{ fontSize: "1.75rem" }} className="text-gradient">
            Enrol Biometric
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Map fingerprint templates to this personnel ID.
          </p>
        </div>

        {/* Scanner status */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(255,255,255,0.01)",
            border: "1px solid var(--glass-border)",
            borderRadius: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: dotColor,
                boxShadow: `0 0 10px ${dotColor}`,
                animation: isDeviceInit
                  ? "pulse 1.5s ease-in-out infinite"
                  : deviceStatus.connected
                  ? "pulse 2.5s ease-in-out infinite"
                  : "none",
              }}
            />
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {statusLabel}
            </span>
          </div>
          {deviceStatus.error && (
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {deviceStatus.error}
            </p>
          )}
          {!deviceStatus.connected && !isDeviceInit && (
            <button
              type="button"
              className="btn-modern"
              onClick={initDevice}
              style={{
                marginTop: "0.75rem",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                borderRadius: "8px",
                background: "var(--brand-primary)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              🔄 Connect Device
            </button>
          )}
        </div>

        {/* Enrolled count */}
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {currentPrints.length} of 3 fingerprint
          {currentPrints.length !== 1 ? "s" : ""} enrolled
        </div>

        {/* Enroll form */}
        {currentPrints.length < 3 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                }}
              >
                Select Target Finger
              </label>
              <select
                className="input-modern"
                value={targetFinger}
                onChange={(e) => setTargetFinger(e.target.value)}
              >
                {Object.entries(FINGER_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-modern btn-primary"
              disabled={scanLoading}
              onClick={handleEnroll}
              style={{
                padding: "0.9rem",
                fontSize: "1rem",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {scanLoading ? "⏳ Scanning..." : "⚡ Enroll Fingerprint"}
            </button>

            {!deviceStatus.connected && !isDeviceInit && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#f59e0b",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                ⚠️ Scanner offline — connect your MFS500 to enable enrollment.
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: "1.5rem",
              border: "1px dashed var(--brand-secondary)",
              background: "rgba(244, 63, 94, 0.02)",
              borderRadius: "14px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🛑</span>
            <h4 style={{ margin: "0.5rem 0 0.25rem 0", fontWeight: 700 }}>
              Enrollment Limit Reached
            </h4>
            <p
              style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}
            >
              Maximum of 3 fingerprints per employee. Delete a template to register
              another.
            </p>
          </div>
        )}

        {/* Enrollment result log */}
        {scanMessage && (
          <div
            style={{
              padding: "1rem",
              background: scanSuccess
                ? "rgba(16, 185, 129, 0.05)"
                : "rgba(255,255,255,0.01)",
              border: `1px solid ${
                scanSuccess ? "rgba(16, 185, 129, 0.2)" : "var(--glass-border)"
              }`,
              borderRadius: "12px",
              fontSize: "0.8rem",
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>Capture Log:</p>
            <p
              style={{
                margin: 0,
                color: scanSuccess
                  ? "var(--brand-accent)"
                  : "var(--brand-primary-light)",
                fontFamily: "monospace",
                lineHeight: 1.5,
              }}
            >
              {scanMessage}
            </p>
            {qualityScore !== null && (
              <div style={{ marginTop: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.25rem",
                    fontWeight: 700,
                  }}
                >
                  <span>SCAN QUALITY</span>
                  <span
                    style={{
                      color:
                        qualityScore >= 60 ? "var(--brand-accent)" : "#f59e0b",
                    }}
                  >
                    {qualityScore}%
                  </span>
                </div>
                <div
                  style={{
                    height: "6px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "100px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${qualityScore}%`,
                      background:
                        qualityScore >= 60 ? "var(--brand-accent)" : "#f59e0b",
                      boxShadow: `0 0 8px ${
                        qualityScore >= 60 ? "var(--brand-accent)" : "#f59e0b"
                      }`,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test fingerprint section */}
        {currentPrints.length > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--glass-border)",
              paddingTop: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.25rem",
                }}
              >
                Verify Enrollment
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                Test that a scan matches the enrolled templates.
              </p>
            </div>
            <button
              type="button"
              className="btn-modern"
              disabled={testLoading}
              onClick={handleTestFingerprint}
              style={{
                padding: "0.75rem",
                fontSize: "0.9rem",
                borderRadius: "12px",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "var(--brand-primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {testLoading ? "⏳ Testing..." : "🔍 Test Fingerprint"}
            </button>

            {testMessage && (
              <div
                style={{
                  padding: "0.875rem",
                  background:
                    testSuccess === true
                      ? "rgba(16, 185, 129, 0.05)"
                      : testSuccess === false
                      ? "rgba(244, 63, 94, 0.05)"
                      : "rgba(255,255,255,0.01)",
                  border: `1px solid ${
                    testSuccess === true
                      ? "rgba(16, 185, 129, 0.2)"
                      : testSuccess === false
                      ? "rgba(244, 63, 94, 0.2)"
                      : "var(--glass-border)"
                  }`,
                  borderRadius: "10px",
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  color:
                    testSuccess === true
                      ? "var(--brand-accent)"
                      : testSuccess === false
                      ? "#f43f5e"
                      : "var(--brand-primary-light)",
                  lineHeight: 1.5,
                }}
              >
                {testMessage}
                {testScore !== null && testSuccess === true && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div
                      style={{
                        height: "4px",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "100px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(testScore, 100)}%`,
                          background: "var(--brand-accent)",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Right: Active templates ── */}
      <section
        className="glass"
        style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}
      >
        <div>
          <h2 style={{ fontSize: "1.75rem" }} className="text-gradient">
            Active Templates
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Enrolled biometric security templates for this employee.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {currentPrints.map((print) => {
            const dateStr = new Date(print.enrolledAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const label = FINGER_LABELS[print.fingerIndex] ?? print.fingerIndex.replace(/_/g, " ");

            return (
              <div
                key={print.id}
                style={{
                  padding: "1.25rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4
                    style={{
                      margin: "0 0 0.25rem 0",
                      fontSize: "1rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span>🧬</span>
                    {label}
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Enrolled: {dateStr}
                  </p>
                  <p
                    style={{
                      margin: "0.25rem 0 0 0",
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    Device: {print.deviceInfo ?? "MFS500-MorFin"}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(print.id, label)}
                  className="btn-modern"
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.75rem",
                    background: "rgba(244, 63, 94, 0.08)",
                    color: "var(--brand-secondary)",
                    border: "1px solid rgba(244, 63, 94, 0.15)",
                    borderRadius: "10px",
                  }}
                >
                  Revoke
                </button>
              </div>
            );
          })}

          {currentPrints.length === 0 && (
            <div
              style={{
                padding: "4rem 1rem",
                textAlign: "center",
                border: "1px dashed var(--glass-border)",
                borderRadius: "16px",
              }}
            >
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h4 style={{ margin: "1rem 0 0.25rem 0", fontWeight: 700 }}>
                No Biometrics Enrolled
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                This employee relies on PIN fallback. Enrol up to 3 fingerprint
                templates to enable biometric clock-in.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
