import { NextResponse } from 'next/server';


import prisma from '../../../../../lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await req.json();
    
    const updatedSlot = await prisma.staffSlot.update({
      where: { id },
      data: { name }
    });

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Error updating slot:', error);
    return NextResponse.json({ error: 'Failed to update staff slot' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Hard delete staff slot (cascade delete of profiles is handled by DB)
    await prisma.staffSlot.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting slot:', error);
    return NextResponse.json({ error: 'Failed to delete staff slot' }, { status: 500 });
  }
}
