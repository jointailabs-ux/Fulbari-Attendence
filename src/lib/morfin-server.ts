// src/lib/morfin-server.ts
// Server-side ONLY — raw TCP communication with MorFin Auth Client Service.
//
// WHY RAW TCP?
// The MorFin service at port 8030 uses a non-standard HTTP/1.1 implementation
// that does not work reliably with Node.js fetch() or http.request().
// Raw net.Socket is the ONLY reliable method — confirmed by all test scripts.
//
// Usage:
//   import { morfinServerPost, verifyTemplates } from '@/lib/morfin-server';

import net from "net";

const MORFIN_HOST = "127.0.0.1";
const MORFIN_PORT = 8030;
const TIMEOUT_MS = 25_000; // Must be > 15s scanner timeout
const RETRY_DELAY_MS = 600;

export interface MorFinResponse {
  ok: boolean;
  data: any;
  error?: string;
}

// ─── Core raw TCP post ────────────────────────────────────────────────────────

function rawPost(endpoint: string, payload: any): Promise<MorFinResponse> {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(payload);
    const bodyBuf = Buffer.from(bodyStr, "utf8");

    const requestStr =
      `POST /morfinauth/${endpoint} HTTP/1.1\r\n` +
      `Host: ${MORFIN_HOST}:${MORFIN_PORT}\r\n` +
      `Content-Type: application/json\r\n` +
      `Content-Length: ${bodyBuf.length}\r\n` +
      `Connection: close\r\n` +
      `\r\n` +
      bodyStr;

    const socket = new net.Socket();
    let responseData = "";
    let settled = false;

    const settle = (result: MorFinResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      settle({ ok: false, data: null, error: "MorFin request timed out (25s)" });
    }, TIMEOUT_MS);

    socket.connect(MORFIN_PORT, MORFIN_HOST, () => {
      socket.write(requestStr);
    });

    socket.on("data", (chunk) => {
      responseData += chunk.toString();
    });

    socket.on("close", () => {
      // Parse HTTP response: split headers from body
      const sepIdx = responseData.indexOf("\r\n\r\n");
      const bodyRaw = sepIdx >= 0 ? responseData.slice(sepIdx + 4) : responseData;

      // Extract HTTP status code
      const statusMatch = responseData.match(/HTTP\/1\.[01] (\d+)/);
      const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : 200;

      let parsed: any;
      try {
        parsed = JSON.parse(bodyRaw);
      } catch {
        // Non-JSON body — treat as error
        settle({
          ok: false,
          data: null,
          error: `Non-JSON response (HTTP ${httpStatus}): ${bodyRaw.slice(0, 200)}`,
        });
        return;
      }

      settle({ ok: httpStatus < 400, data: parsed });
    });

    socket.on("error", (err: NodeJS.ErrnoException) => {
      settle({
        ok: false,
        data: null,
        error: `MorFin connection error: ${err.message}`,
      });
    });
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Post to a MorFin endpoint with 1 automatic retry on connection failure.
 * This is the single source of truth for all server-side MorFin communication.
 */
export async function morfinServerPost(
  endpoint: string,
  payload: any = {}
): Promise<MorFinResponse> {
  const result = await rawPost(endpoint, payload);

  // Retry once on connection-level failures (ECONNRESET, ECONNREFUSED, timeout)
  if (
    !result.ok &&
    result.data === null &&
    (result.error?.includes("connection") ||
      result.error?.includes("timed out") ||
      result.error?.includes("ECONNRESET") ||
      result.error?.includes("ECONNREFUSED"))
  ) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return rawPost(endpoint, payload);
  }

  return result;
}

/**
 * Verify two Base64-encoded ISO 19794-2 fingerprint templates against each other.
 * Returns { match, score, error }.
 *
 * The device MUST be initialized before calling this.
 * ProbeTemplate  = the live/newly captured fingerprint
 * GalleryTemplate = the stored/enrolled fingerprint
 */
export async function verifyTemplates(
  probeTemplate: string,
  galleryTemplate: string
): Promise<{ match: boolean; score: number; error?: string }> {
  const res = await morfinServerPost("verify", {
    ProbTemplate: probeTemplate,
    GalleryTemplate: galleryTemplate,
  });

  if (!res.ok || res.data === null) {
    return { match: false, score: 0, error: res.error ?? "Verify call failed" };
  }

  const d = res.data;

  // MorFin returns ErrorCode as string "0" or number 0 for success
  const errCode = String(d.ErrorCode ?? "");
  if (errCode !== "0") {
    return {
      match: false,
      score: 0,
      error: d.ErrorDescription ?? `Verify error (code ${errCode})`,
    };
  }

  // Match field can be boolean true, string "true", or string "True"
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

  return { match, score };
}

/**
 * Extract the template string from a MorFin gettemplate response.
 * MorFin returns the template in one of several field names depending on SDK version.
 */
export function extractTemplate(data: any): string | null {
  if (!data) return null;
  return (
    data.TemplateBase64 ||
    data.TemplateData ||
    data.ImgData ||
    data.Template ||
    null
  );
}
