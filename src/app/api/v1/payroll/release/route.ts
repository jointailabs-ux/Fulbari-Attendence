import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, monthYear, strictSalary, simpleSalary, selectedMode, finalPayable, advancesDeducted } = body;

    if (!staffId || !monthYear || !selectedMode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use a transaction to ensure both records are updated correctly
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Payroll Record
      const payroll = await tx.payrollRecord.create({
        data: {
          staffId,
          monthYear,
          strictSalary: parseFloat(strictSalary),
          simpleSalary: parseFloat(simpleSalary),
          selectedMode,
          finalPayable: parseFloat(finalPayable),
          advancesDeducted: parseFloat(advancesDeducted),
        }
      });

      // 2. Mark pending advances as deducted
      await tx.advance.updateMany({
        where: {
          staffId,
          status: 'PENDING',
          isActive: true
        },
        data: {
          status: 'DEDUCTED'
        }
      });

      // 3. Create an Audit Log
      await tx.auditLog.create({
        data: {
          action: 'PAYROLL_RELEASED',
          entityType: 'PayrollRecord',
          entityId: payroll.id,
          newValue: JSON.stringify(payroll),
          performedBy: 'Admin'
        }
      });

      return payroll;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Salary Release Error:', error);
    return NextResponse.json({ error: 'Failed to release salary' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  try {
    const where = month ? { monthYear: month } : {};
    const records = await prisma.payrollRecord.findMany({
      where,
      include: { staff: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payroll records' }, { status: 500 });
  }
}
