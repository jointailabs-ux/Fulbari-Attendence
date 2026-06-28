// src/app/api/v1/scan/route.ts
//
// ⚠️  DEPRECATED — QR code scanning has been replaced by fingerprint + PIN authentication.
// This route is intentionally stubbed out and will return a 410 Gone response.
// It is kept in place to prevent 404 errors if any old QR codes are scanned.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'QR code scanning is no longer supported.',
      message:
        'This feature has been replaced by fingerprint authentication with PIN fallback. Please use the kiosk terminal to clock in/out.',
    },
    { status: 410 } // 410 Gone — resource intentionally removed
  );
}
