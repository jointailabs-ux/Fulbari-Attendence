import { NextResponse } from 'next/server';


import prisma from '../../../../../lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    const staff = await prisma.staffProfile.findUnique({
      where: { id },
      include: {
        slot: { include: { outlet: true } },
        fingerprints: {
          orderBy: { enrolledAt: 'desc' }
        },
        attendances: {
          where: {
            shiftDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        leaves: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        advances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    // Performance Metrics Calculations
    const totalDaysInMonth = endDate.getDate();
    // Assuming working days are all days for simplicity, or we could filter by active days
    const workingDays = totalDaysInMonth; 

    const presentDays = staff.attendances.filter(a => a.state === 'SHIFT_ENDED').length;
    const fullLeaves = staff.leaves.filter(l => l.type === 'FULL').length;
    const halfLeaves = staff.leaves.filter(l => l.type === 'HALF').length;
    
    const attendanceRate = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(2) : "0";
    const totalAdvance = staff.advances.reduce((sum, adv) => sum + adv.amount, 0);

    return NextResponse.json({
      ...staff,
      metrics: {
        attendanceRate: parseFloat(attendanceRate),
        totalDaysWorked: presentDays,
        totalLeaves: {
          full: fullLeaves,
          half: halfLeaves,
          total: fullLeaves + (halfLeaves * 0.5)
        },
        totalAdvanceTaken: totalAdvance
      },
      status: (() => {
        const now = new Date();
        const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        const todayStr = istTime.toISOString().slice(0, 10);
        const todayRecord = staff.attendances.find(a => a.shiftDate.toISOString().slice(0, 10) === todayStr);
        return todayRecord ? todayRecord.state : 'NOT_STARTED';
      })()
    });
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return NextResponse.json({ error: 'Failed to fetch staff profile' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, pin, monthlySalary, slotId, isActive, dateOfBirth, bloodGroup } = body;

    const updateData: any = {
      name,
      phone,
      monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
      isActive,
      dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
      bloodGroup: bloodGroup !== undefined ? bloodGroup : undefined
    };

    if (slotId) {
      updateData.slot = { connect: { id: slotId } };
    }

    if (pin) {
      updateData.hashedPin = Buffer.from(pin).toString('base64');
    }

    const updatedStaff = await prisma.staffProfile.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'Failed to update staff profile' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Perform manual cascade delete of all related records in a transaction to bypass DB constraint limits
    await prisma.$transaction(async (tx) => {
      // 1. Delete break logs related to this staff's attendances
      await tx.breakLog.deleteMany({
        where: {
          attendance: {
            staffId: id
          }
        }
      });

      // 2. Delete attendance records
      await tx.attendanceRecord.deleteMany({
        where: { staffId: id }
      });

      // 3. Delete payroll records
      await tx.payrollRecord.deleteMany({
        where: { staffId: id }
      });

      // 4. Delete advances
      await tx.advance.deleteMany({
        where: { staffId: id }
      });

      // 5. Delete leave records
      await tx.leaveRecord.deleteMany({
        where: { staffId: id }
      });

      // 6. Delete leave requests
      await tx.leaveRequest.deleteMany({
        where: { staffId: id }
      });

      // 7. Delete employee documents
      await tx.employeeDocument.deleteMany({
        where: { staffId: id }
      });

      // 8. Delete fingerprint templates
      await tx.fingerprintTemplate.deleteMany({
        where: { staffId: id }
      });

      // 9. Finally, delete the staff profile
      await tx.staffProfile.delete({
        where: { id }
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: 'Failed to delete staff profile', details: error.message }, { status: 500 });
  }
}

