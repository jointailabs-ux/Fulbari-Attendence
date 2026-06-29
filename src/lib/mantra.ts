// src/lib/mantra.ts
// Client-side MorFin communication
// 
// Architecture:
//   Browser → POST to local MorFinAuthClientService (https://127.0.0.1:8031 or http://127.0.0.1:8030) → MFS500
//   (We must try HTTPS first to avoid Mixed Content restrictions when hosted on Vercel)

const PROXY_URL = "/api/v1/proxy/morfin";
const PROXY_TIMEOUT_MS = 30_000; // 30s — above scanner's 15s + server's 25s overhead

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MantraServiceStatus {
  connected: boolean;
  deviceName: string | null;
  error: string | null;
}

export interface CaptureResult {
  success: boolean;
  quality: number;
  template: string | null;
  error: string | null;
}

export interface VerifyResult {
  match: boolean;
  score: number;
  error: string | null;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function morfinPost(
  endpoint: string,
  payload: any = {}
): Promise<{ ok: boolean; data: any; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  // The local Mantra MorFin service uses 8030 for HTTP and 8031 for HTTPS.
  // For Vercel (HTTPS), we must try HTTPS first to avoid Mixed Content blocks.
  const urlsToTry = [
    `https://127.0.0.1:8031/morfinauth/${endpoint}`,
    `https://localhost:8031/morfinauth/${endpoint}`,
    `http://127.0.0.1:8030/morfinauth/${endpoint}`,
    `http://localhost:8030/morfinauth/${endpoint}`,
  ];

  let lastErrorMsg = "";

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        clearTimeout(timeoutId);
        return { ok: true, data };
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        clearTimeout(timeoutId);
        return {
          ok: false,
          data: null,
          error: "Request timed out — scanner may be busy. Please try again.",
        };
      }
      lastErrorMsg = err.message;
      console.warn(`Connection to ${url} failed: ${err.message}. Trying next...`);
    }
  }

  clearTimeout(timeoutId);
  return {
    ok: false,
    data: null,
    error: `Could not connect to local MorFin service. Please ensure the MorFinAuthClientSvc is running. (Last error: ${lastErrorMsg})`,
  };
}

/** Check whether MorFin returned a successful ErrorCode (0 or "0") */
function isSuccess(data: any): boolean {
  return data?.ErrorCode === 0 || data?.ErrorCode === "0";
}

/** Extract template from gettemplate response — field name varies by SDK version */
function extractTemplate(data: any): string | null {
  if (!data) return null;
  return (
    data.TemplateBase64 ??
    data.TemplateData ??
    data.ImgData ??
    data.Template ??
    null
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Discover connected Mantra devices and initialize the first one.
 * Always uninits first to clear any stale state.
 */
export async function discoverAndInitDevice(): Promise<MantraServiceStatus> {
  // Step 1: List connected devices
  const listRes = await morfinPost("connecteddevicelist", {});

  if (!listRes.ok || !listRes.data) {
    return {
      connected: false,
      deviceName: null,
      error:
        listRes.error ??
        "Cannot reach the MorFin service. Make sure MorFinAuthClientSvc is running.",
    };
  }

  if (!isSuccess(listRes.data)) {
    return {
      connected: false,
      deviceName: null,
      error:
        listRes.data.ErrorDescription ??
        "No device found. Please plug in your MFS500 scanner.",
    };
  }

  // Parse device name from DeviceList array or ErrorDescription string
  let deviceName: string | null = null;

  if (Array.isArray(listRes.data.DeviceList) && listRes.data.DeviceList.length > 0) {
    deviceName = listRes.data.DeviceList[0];
  } else if (typeof listRes.data.ErrorDescription === "string") {
    // Format: "Connected Device :MFS500" or "Connected Device :MFS500,MFS100"
    const colonIdx = listRes.data.ErrorDescription.indexOf(":");
    if (colonIdx >= 0) {
      const first = listRes.data.ErrorDescription
        .slice(colonIdx + 1)
        .split(",")[0]
        .trim();
      if (first) deviceName = first;
    }
  }

  if (!deviceName) {
    return {
      connected: false,
      deviceName: null,
      error: "No MFS500 detected. Please plug in the scanner and try again.",
    };
  }

  // Step 2: Uninit any previous session before initializing
  await uninitDevice();

  // Step 3: Initialize device
  const initRes = await morfinPost("initdevice", {
    ConnectedDvc: deviceName,
    ClientKey: "",
  });

  if (!initRes.ok || !initRes.data) {
    return {
      connected: false,
      deviceName,
      error:
        initRes.error ??
        `Failed to initialise ${deviceName}. Try unplugging and replugging the scanner.`,
    };
  }

  if (!isSuccess(initRes.data)) {
    return {
      connected: false,
      deviceName,
      error:
        initRes.data.ErrorDescription ??
        `Device initialisation failed (code ${initRes.data.ErrorCode}). Try unplugging and replugging the scanner.`,
    };
  }

  return { connected: true, deviceName, error: null };
}

/**
 * Capture a fingerprint from the scanner and return the ISO 19794-2 template.
 * If capture fails because the device is not initialized, automatically attempts
 * to re-initialize and retries once.
 */
export async function captureFingerprint(): Promise<CaptureResult> {
  const result = await _doCaptureOnce();

  // Auto-recover: if the error looks like a device-not-initialized issue, re-init and retry
  if (
    !result.success &&
    result.error &&
    (result.error.includes("not initializ") ||
      result.error.includes("not initialized") ||
      result.error.includes("740") ||
      result.error.includes("-1001"))
  ) {
    console.warn("[mantra] Capture failed with init error, attempting auto-recover...");
    const reinit = await discoverAndInitDevice();
    if (!reinit.connected) {
      return {
        success: false,
        quality: 0,
        template: null,
        error: `Scanner error: ${reinit.error}`,
      };
    }
    // Retry after successful reinit
    return _doCaptureOnce();
  }

  return result;
}

async function _doCaptureOnce(): Promise<CaptureResult> {
  // Step 1: Trigger hardware capture
  const capRes = await morfinPost("capture", { Quality: 40, TimeOut: 15 });

  if (!capRes.ok || !capRes.data) {
    return {
      success: false,
      quality: 0,
      template: null,
      error:
        capRes.error ?? "Capture failed — scanner may be disconnected or busy.",
    };
  }

  const cap = capRes.data;

  if (!isSuccess(cap)) {
    const errDesc = cap.ErrorDescription ?? cap.Status ?? "";
    if (errDesc.toLowerCase().includes("timeout") || cap.ErrorCode === "-2019") {
      return {
        success: false,
        quality: 0,
        template: null,
        error: "Scan timed out — please place your finger firmly on the scanner and try again.",
      };
    }
    return {
      success: false,
      quality: 0,
      template: null,
      error: errDesc || `Capture error (code ${cap.ErrorCode})`,
    };
  }

  // Some firmware returns Status field separately
  if (cap.Status && cap.Status !== "CAPTURE SUCCESS" && cap.Status !== "SUCCESS") {
    return {
      success: false,
      quality: 0,
      template: null,
      error: cap.Status,
    };
  }

  const quality =
    typeof cap.Quality === "string"
      ? parseInt(cap.Quality, 10) || 0
      : (cap.Quality ?? 0);

  if (quality < 40) {
    return {
      success: false,
      quality,
      template: null,
      error: `Poor scan quality (${quality}%). Place your finger flat and press firmly, then try again.`,
    };
  }

  // Step 2: Retrieve template from last capture
  const tplRes = await morfinPost("gettemplate", { TmpFormat: 0 });

  if (!tplRes.ok || !tplRes.data) {
    return {
      success: false,
      quality,
      template: null,
      error: tplRes.error ?? "Failed to retrieve fingerprint template from scanner.",
    };
  }

  const tpl = tplRes.data;

  if (!isSuccess(tpl)) {
    return {
      success: false,
      quality,
      template: null,
      error: tpl.ErrorDescription ?? `Template retrieval error (code ${tpl.ErrorCode})`,
    };
  }

  const template = extractTemplate(tpl);

  if (!template) {
    return {
      success: false,
      quality,
      template: null,
      error: "Scanner returned an empty template. Please try scanning again.",
    };
  }

  return { success: true, quality, template, error: null };
}

/**
 * Verify two ISO 19794-2 templates against each other via the MorFin service.
 * ProbeTemplate  = newly captured fingerprint
 * GalleryTemplate = stored/enrolled fingerprint
 */
export async function verifyFingerprint(
  probeTemplate: string,
  galleryTemplate: string
): Promise<VerifyResult> {
  const res = await morfinPost("verify", {
    GalleryTemplate: galleryTemplate,
    ProbTemplate: probeTemplate,
  });

  if (!res.ok || !res.data) {
    return {
      match: false,
      score: 0,
      error: res.error ?? "Verify call failed.",
    };
  }

  const d = res.data;

  if (!isSuccess(d)) {
    return {
      match: false,
      score: 0,
      error: d.ErrorDescription ?? `Verification error (code ${d.ErrorCode})`,
    };
  }

  const match =
    d.Match === true ||
    d.Match === "true" ||
    d.Match === "True" ||
    d.Status === true ||
    d.Status === "True";

  const score =
    typeof d.MatchScore === "number"
      ? d.MatchScore
      : typeof d.MatchScore === "string"
      ? parseInt(d.MatchScore, 10) || 0
      : 0;

  return { match, score, error: null };
}

/**
 * Get the current scanner and service status.
 */
export async function getDeviceStatus(): Promise<MantraServiceStatus> {
  const res = await morfinPost("connecteddevicelist", {});

  if (!res.ok || !res.data) {
    return {
      connected: false,
      deviceName: null,
      error: "Scanner service is unreachable. Make sure MorFinAuthClientSvc is running.",
    };
  }

  // ErrorCode is 0 or "0" only if the service responded AND a device list/description is present.
  // If no device is connected, the service returns success but with an empty description.
  let deviceName: string | null = null;

  if (Array.isArray(res.data.DeviceList) && res.data.DeviceList.length > 0) {
    deviceName = res.data.DeviceList[0];
  } else if (typeof res.data.ErrorDescription === "string" && res.data.ErrorDescription.trim() !== "") {
    const colonIdx = res.data.ErrorDescription.indexOf(":");
    if (colonIdx >= 0) {
      const first = res.data.ErrorDescription
        .slice(colonIdx + 1)
        .split(",")[0]
        .trim();
      if (first) deviceName = first;
    }
  }

  if (!deviceName) {
    return {
      connected: false,
      deviceName: null,
      error: "Scanner disconnected.",
    };
  }

  return { connected: true, deviceName, error: null };
}

/**
 * Uninitialize the device. Call on cleanup / unmount.
 * Silently ignores errors — uninit failure is never fatal.
 */
export async function uninitDevice(): Promise<void> {
  await morfinPost("uninitdevice", {}).catch(() => {});
}

/**
 * Lightweight connectivity check for polling.
 * Returns true if the MorFin service responds (regardless of device state).
 */
export async function checkServiceRunning(): Promise<boolean> {
  const res = await morfinPost("connecteddevicelist", {});
  return res.ok && res.data !== null;
}

