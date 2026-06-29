import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { currentAdminPin, newAdminPin, newKioskPin } = await req.json();
    
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

    if (config.adminPin !== currentAdminPin) {
      return NextResponse.json({ error: "Access Denied: Incorrect current admin PIN." }, { status: 401 });
    }

    const updatedConfig = await prisma.systemConfig.update({
      where: { id: "default" },
      data: {
        ...(newAdminPin && { adminPin: newAdminPin }),
        ...(newKioskPin && { kioskPin: newKioskPin })
      }
    });

    return NextResponse.json({ success: true, message: "PINs updated successfully." });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
