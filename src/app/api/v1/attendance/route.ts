import { NextResponse } from 'next/server';


import prisma from '../../../../lib/prisma';

const INCLUDE_BREAKS = { breaks: true } as const;

export async function POST(req: Request) {
  try {
    const { staffId, action } = await req.json();
    
    // Calculate current time in IST (UTC + 5:30)
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const istHour = istNow.getUTCHours();
    
    // Restrict punches to between 12 PM (noon) and 12 AM (midnight) IST
    // Commented out temporarily at user's request for full 24-hour testing
    /*
    if (istHour < 12) {
      return NextResponse.json({ 
        error: 'Attendance can only be punched between 12 PM and 12 AM (IST).' 
      }, { status: 400 });
    }
    */

    // Auto-close any open shifts from previous days
    try {
      const nowTmp = new Date();
      const istTimeTmp = new Date(nowTmp.getTime() + 5.5 * 60 * 60 * 1000);
      const todayTmp = new Date(Date.UTC(istTimeTmp.getUTCFullYear(), istTimeTmp.getUTCMonth(), istTimeTmp.getUTCDate(), 0, 0, 0, 0));

      const openRecords = await prisma.attendanceRecord.findMany({
        where: {
          shiftDate: { lt: todayTmp },
          state: { in: ["SHIFT_STARTED", "ON_BREAK"] }
        }
      });

      for (const record of openRecords) {
        const autoEndTime = new Date(record.shiftDate.getTime() + 18.5 * 60 * 60 * 1000);
        
        await prisma.breakLog.updateMany({
          where: { attendanceId: record.id, endTime: null },
          data: { endTime: autoEndTime }
        });

        await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            state: "SHIFT_ENDED",
            endTime: autoEndTime
          }
        });
      }
    } catch (err) {
      console.error("Auto-close pending shifts error:", err);
    }

    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const today = new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current status
      let attendance = await tx.attendanceRecord.findFirst({
        where: { staffId, shiftDate: today },
        include: INCLUDE_BREAKS
      });

      const currentState = attendance?.state || 'NOT_STARTED';

      // 2. Validate Transitions
      switch (action) {
        case 'START_SHIFT':
          if (currentState !== 'NOT_STARTED') {
            return NextResponse.json({ error: 'Shift already started or ended' }, { status: 400 });
          }
          if (istHour < 12) {
            return NextResponse.json({ error: 'Clock-in is only allowed after 12:00 PM (noon).' }, { status: 400 });
          }
          attendance = await tx.attendanceRecord.create({
            data: {
              staffId,
              shiftDate: today,
              state: 'SHIFT_STARTED',
              startTime: new Date()
            },
            include: INCLUDE_BREAKS
          });
          break;

        case 'START_BREAK':
          if (currentState !== 'SHIFT_STARTED') {
            return NextResponse.json({ error: 'Cannot start break in current state' }, { status: 400 });
          }
          await tx.breakLog.create({
            data: { attendanceId: attendance!.id, startTime: new Date() }
          });
          attendance = await tx.attendanceRecord.update({
            where: { id: attendance!.id },
            data: { state: 'ON_BREAK' },
            include: INCLUDE_BREAKS
          });
          break;

        case 'END_BREAK':
          if (currentState !== 'ON_BREAK') {
            return NextResponse.json({ error: 'Not on break' }, { status: 400 });
          }
          const activeBreak = await tx.breakLog.findFirst({
            where: { attendanceId: attendance!.id, endTime: null },
            orderBy: { startTime: 'desc' }
          });
          if (activeBreak) {
            await tx.breakLog.update({
              where: { id: activeBreak.id },
              data: { endTime: new Date() }
            });
          }
          attendance = await tx.attendanceRecord.update({
            where: { id: attendance!.id },
            data: { state: 'SHIFT_STARTED' },
            include: INCLUDE_BREAKS
          });
          break;

        case 'END_SHIFT':
          if (currentState !== 'SHIFT_STARTED') {
            return NextResponse.json({ error: 'Cannot end shift in current state' }, { status: 400 });
          }
          attendance = await tx.attendanceRecord.update({
            where: { id: attendance!.id },
            data: { state: 'SHIFT_ENDED', endTime: new Date() },
            include: INCLUDE_BREAKS
          });
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      return NextResponse.json({ success: true, newState: attendance.state, todayRecord: attendance });
    });
  } catch (error) {
    console.error('API /attendance Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
