import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { portal, pin } = await req.json();
    
    // Fetch system config from DB, creating default if it doesn't exist
    let config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          id: "default",
          adminPin: process.env.ADMIN_PIN || "999999",
          kioskPin: process.env.KIOSK_PIN || "888888"
        }
      });
    }

    const managerPin = process.env.MANAGER_PIN || "777777";
    
    // If the frontend explicitly requested a portal (e.g. from /admin login page)
    if (portal === "admin" && pin === config.adminPin) return NextResponse.json({ success: true, role: "admin" });
    if (portal === "kiosk" && pin === config.kioskPin) return NextResponse.json({ success: true, role: "kiosk" });
    if (portal === "manager" && pin === managerPin) return NextResponse.json({ success: true, role: "manager" });

    // If no portal was specified, dynamically determine it
    if (!portal) {
      if (pin === config.adminPin) return NextResponse.json({ success: true, role: "admin" });
      if (pin === managerPin) return NextResponse.json({ success: true, role: "manager" });
      if (pin === config.kioskPin) return NextResponse.json({ success: true, role: "kiosk" });
    }
    
    return NextResponse.json({ error: "Access Denied: Invalid PIN" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
