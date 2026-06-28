import { NextResponse } from 'next/server';


import prisma from '../../../../../lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { amount, isActive } = body;

    const data: any = {};
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.advance.update({
      where: { id },
      data,
      include: { staff: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('API /advance/[id] PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update advance' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.advance.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('API /advance/[id] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete advance' }, { status: 500 });
  }
}
