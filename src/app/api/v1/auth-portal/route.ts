import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { portal, pin } = await req.json();
    
    if (portal === "admin") {
      const adminPin = process.env.ADMIN_PIN || "999999";
      if (pin === adminPin) return NextResponse.json({ success: true });
    } else if (portal === "kiosk") {
      const kioskPin = process.env.KIOSK_PIN || "888888";
      if (pin === kioskPin) return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Access Denied: Invalid PIN" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
