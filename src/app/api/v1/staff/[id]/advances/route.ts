import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [advances, total] = await Promise.all([
      prisma.advance.findMany({
        where: { staffId: id },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.advance.count({
        where: { staffId: id }
      })
    ]);

    // Calculate running balance (optional, if we want to show it)
    // For a true running balance, we'd need to sum all previous advances
    const allAdvances = await prisma.advance.findMany({
      where: { staffId: id, isActive: true },
      select: { amount: true }
    });
    const totalBalance = allAdvances.reduce((sum, adv) => sum + adv.amount, 0);

    return NextResponse.json({
      advances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        totalBalance
      }
    });
  } catch (error) {
    console.error('Error fetching advance history:', error);
    return NextResponse.json({ error: 'Failed to fetch advance history' }, { status: 500 });
  }
}
