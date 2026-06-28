import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [staffList, slots, availableSlots] = await Promise.all([
      prisma.staffProfile.findMany({
        include: {
          slot: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.staffSlot.findMany({
        include: {
          outlet: true,
        }
      }),
      prisma.staffSlot.findMany({
        where: {
          profiles: {
            none: { isActive: true }
          }
        },
        include: {
          outlet: true,
        }
      })
    ]);

    return NextResponse.json({
      staffList,
      slots,
      availableSlots
    });
  } catch (error: any) {
    console.error('Error fetching onboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch onboard data', details: error.message }, { status: 500 });
  }
}
