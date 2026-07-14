import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// POST /api/v1/staff-login — verifies staffId + 4-digit PIN
export async function POST(req: Request) {
  try {
    const { staffId, pin } = await req.json();

    if (!staffId || !pin) {
      return NextResponse.json({ error: 'Staff ID and PIN are required' }, { status: 400 });
    }

    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId },
      include: {
        slot: { include: { outlet: true } }
      }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (!staff.isActive) {
      return NextResponse.json({ error: 'Account is inactive. Please contact your manager.' }, { status: 403 });
    }

    // BASE64 matching (same as existing system)
    const hashedPin = Buffer.from(pin).toString('base64');
    if (staff.hashedPin !== hashedPin) {
      return NextResponse.json({ error: 'Incorrect PIN. Please try again.' }, { status: 401 });
    }

    // Return safe profile data (no hashed PIN)
    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        monthlySalary: staff.monthlySalary,
        joiningDate: staff.joiningDate,
        isActive: staff.isActive,
        slot: staff.slot,
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/v1/staff-login?list=true — returns all active staff for the selector
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const list = searchParams.get('list');

    if (list === 'true') {
      const staffList = await prisma.staffProfile.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slot: {
            select: {
              name: true,
              outlet: { select: { name: true } }
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(staffList);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Staff list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
