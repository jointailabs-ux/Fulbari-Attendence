import { NextResponse } from 'next/server';


import prisma from '../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const { staffId, amount } = await req.json();

    const advance = await prisma.advance.create({
      data: {
        staffId,
        amount: parseFloat(amount),
        date: new Date()
      }
    });

    return NextResponse.json(advance, { status: 201 });
  } catch (error) {
    console.error('API /advance Error:', error);
    return NextResponse.json({ error: 'Failed to log advance' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const advances = await prisma.advance.findMany({
      include: { staff: true },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(advances);
  } catch (error) {
    console.error('API /advance GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch advances' }, { status: 500 });
  }
}
