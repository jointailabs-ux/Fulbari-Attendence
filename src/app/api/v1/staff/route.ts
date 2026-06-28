import { NextResponse } from 'next/server';


import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    const staff = await prisma.staffProfile.findMany({
      include: {
        slot: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, pin, monthlySalary, slotId, location } = body;

    // VERY BASIC HASHING for MVP: In production, use bcrypt or similar
    const hashedPin = Buffer.from(pin).toString('base64'); // Mock hash

    const newStaff = await prisma.staffProfile.create({
      data: {
        name,
        phone,
        hashedPin,
        monthlySalary: Number(monthlySalary) || 0,
        joiningDate: new Date(),
        location: location || "Restaurant",
        slot: {
          connect: { id: slotId }
        }
      }
    });

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ error: 'Failed to create staff profile', details: error.message }, { status: 500 });
  }
}
