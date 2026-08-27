// src/app/api/v1/admin/occasions/route.ts
import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/v1/admin/occasions?month=2026-08 or ?year=2026
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // e.g. "2026-08"
    const year = searchParams.get('year');   // e.g. "2026"

    const whereClause: Prisma.OccasionDayWhereInput = {};

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const startDate = new Date(Date.UTC(y, m - 1, 1));
      const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const y = Number(year);
      const startDate = new Date(Date.UTC(y, 0, 1));
      const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const occasions = await prisma.occasionDay.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(occasions);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching occasion days:', error);
    return NextResponse.json({ error: 'Failed to fetch occasion days', details: msg }, { status: 500 });
  }
}

// POST /api/v1/admin/occasions
// Body: { date: "2026-08-15", name: "Independence Day / Festival Rush", multiplier: 1.5, description?: "..." }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, name, multiplier = 1.5, description } = body;

    if (!date || !name) {
      return NextResponse.json({ error: 'Date and Name are required' }, { status: 400 });
    }

    // Normalize date string (YYYY-MM-DD) to midnight UTC
    const dateOnlyStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const [y, m, d] = dateOnlyStr.split('-').map(Number);
    const normalizedDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    // Upsert occasion day for this date
    const occasion = await prisma.occasionDay.upsert({
      where: { date: normalizedDate },
      update: {
        name: name.trim(),
        multiplier: Number(multiplier) || 1.5,
        description: description ? description.trim() : null,
        updatedAt: new Date(),
      },
      create: {
        date: normalizedDate,
        name: name.trim(),
        multiplier: Number(multiplier) || 1.5,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json(occasion);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating/updating occasion day:', error);
    return NextResponse.json({ error: 'Failed to save occasion day', details: msg }, { status: 500 });
  }
}

// DELETE /api/v1/admin/occasions?id=... or ?date=YYYY-MM-DD
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (id) {
      await prisma.occasionDay.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: 'Occasion day removed' });
    }

    if (date) {
      const dateOnlyStr = date.split('T')[0];
      const [y, m, d] = dateOnlyStr.split('-').map(Number);
      const normalizedDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

      await prisma.occasionDay.deleteMany({
        where: {
          date: {
            gte: normalizedDate,
            lte: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000 - 1),
          },
        },
      });
      return NextResponse.json({ success: true, message: 'Occasion day removed' });
    }

    return NextResponse.json({ error: 'Missing id or date parameter' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting occasion day:', error);
    return NextResponse.json({ error: 'Failed to delete occasion day', details: msg }, { status: 500 });
  }
}
