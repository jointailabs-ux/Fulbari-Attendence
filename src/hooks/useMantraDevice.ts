// src/hooks/useMantraDevice.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  discoverAndInitDevice,
  getDeviceStatus,
  checkServiceRunning,
  uninitDevice,
  type MantraServiceStatus,
} from "../lib/mantra";

const POLL_INTERVAL_MS = 3_000; // 3s poll — fast enough for good UX

export type DeviceState = "idle" | "connecting" | "connected" | "error";

export function useMantraDevice() {
  const [status, setStatus] = useState<MantraServiceStatus>({
    connected: false,
    deviceName: null,
    error: null,
  });
  const [deviceState, setDeviceState] = useState<DeviceState>("idle");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasConnectedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const mountedRef = useRef(true);

  const initialize = useCallback(async () => {
    if (isInitializingRef.current) return; // prevent concurrent inits
    isInitializingRef.current = true;

    if (mountedRef.current) setDeviceState("connecting");

    const result = await discoverAndInitDevice();

    if (!mountedRef.current) {
      isInitializingRef.current = false;
      return;
    }

    setStatus(result);
    setDeviceState(result.connected ? "connected" : "error");
    wasConnectedRef.current = result.connected;
    isInitializingRef.current = false;
  }, []);

  /**
   * Ensure the device is connected. If not, attempt initialization.
   * Returns true if connected after the call.
   */
  const ensureConnected = useCallback(async (): Promise<boolean> => {
    if (wasConnectedRef.current) return true;
    await initialize();
    return wasConnectedRef.current;
  }, [initialize]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial connection attempt
    initialize();

    // Polling loop — auto-reconnect when service comes back or scanner is plugged in
    intervalRef.current = setInterval(async () => {
      if (!mountedRef.current || isInitializingRef.current) return;

      const currentStatus = await getDeviceStatus();
      if (!mountedRef.current) return;

      if (!currentStatus.connected) {
        if (wasConnectedRef.current) {
          setStatus(currentStatus);
          setDeviceState("error");
          wasConnectedRef.current = false;
        }
      } else if (!wasConnectedRef.current) {
        // Scanner was plugged back in — auto re-initialize
        await initialize();
      }
    }, POLL_INTERVAL_MS);


    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      uninitDevice();
    };
  }, [initialize]);

  return {
    status,
    deviceState,
    isInitializing: deviceState === "connecting",
    reinitialize: initialize,
    ensureConnected,
  };
}
