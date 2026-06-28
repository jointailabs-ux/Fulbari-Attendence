// src/components/MantraStatusBadge.tsx
"use client";

import React from "react";
import { useMantraDevice } from "../hooks/useMantraDevice";

interface MantraStatusBadgeProps {
  /** Optional callback when connection status changes */
  onStatusChange?: (connected: boolean, deviceName: string | null) => void;
}

export default function MantraStatusBadge({ onStatusChange }: MantraStatusBadgeProps) {
  const { status, isInitializing, reinitialize } = useMantraDevice();

  // Notify parent on status change
  React.useEffect(() => {
    onStatusChange?.(status.connected, status.deviceName);
  }, [status.connected, status.deviceName, onStatusChange]);

  const dotColor = isInitializing
    ? "#f59e0b"
    : status.connected
    ? "#10b981"
    : "#f43f5e";

  const label = isInitializing
    ? "Initializing..."
    : status.connected
    ? `${status.deviceName || "MFS500"} Connected`
    : "Scanner Offline";

  const emoji = isInitializing ? "🟡" : status.connected ? "🟢" : "🔴";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 1rem",
        borderRadius: "100px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        color: "var(--text-muted, #94a3b8)",
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: dotColor,
          boxShadow: `0 0 10px ${dotColor}`,
          display: "inline-block",
          animation: isInitializing
            ? "pulse 1.5s ease-in-out infinite"
            : status.connected
            ? "pulse 2.5s ease-in-out infinite"
            : "none",
        }}
      />
      <span>{label}</span>
      {!status.connected && !isInitializing && (
        <button
          type="button"
          onClick={reinitialize}
          style={{
            background: "none",
            border: "none",
            color: "var(--brand-primary-light, #818cf8)",
            cursor: "pointer",
            padding: 0,
            fontSize: "0.7rem",
            fontWeight: 800,
            marginLeft: "0.25rem",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
