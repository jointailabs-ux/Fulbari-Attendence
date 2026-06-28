// src/app/api/v1/proxy/morfin/route.ts
// Proxy for browser → MorFin communication.
// The browser cannot talk to 127.0.0.1:8030 directly due to CORS/mixed-content rules,
// so all client-side calls go through this Next.js route which uses raw TCP.

import { NextResponse } from "next/server";
import { morfinServerPost } from "../../../../../lib/morfin-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, payload } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        { ErrorCode: 400, ErrorDescription: "Missing or invalid endpoint" },
        { status: 400 }
      );
    }

    const result = await morfinServerPost(endpoint, payload ?? {});

    if (result.ok) {
      return NextResponse.json(result.data);
    } else {
      // Return MorFin-shaped error so client code can handle it uniformly
      const errPayload = result.data ?? {
        ErrorCode: 503,
        ErrorDescription: result.error ?? "MorFin proxy error",
      };
      // Use 200 so client can parse the JSON body — client checks ErrorCode, not HTTP status
      return NextResponse.json(errPayload);
    }
  } catch (error: any) {
    console.error("[morfin-proxy] Unhandled error:", error.message);
    return NextResponse.json(
      {
        ErrorCode: 500,
        ErrorDescription: "Proxy internal error: " + error.message,
      },
      { status: 500 }
    );
  }
}
