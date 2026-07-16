import React from "react";

export const dynamic = 'force-dynamic';

import prisma from '../../lib/prisma';
import DashboardStats from "./DashboardStats";
import EmergencyPopup from "./EmergencyPopup";
import BirthdayPopup from "./BirthdayPopup";
import DailyRosterMonitor from "./DailyRosterMonitor";

export default async function AdminDashboard() {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const today = new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));

  try {
    // Calculate dates first
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const currentMonthYear = today.toISOString().slice(0, 7);

    // Fetch all data in parallel to reduce sequential database round-trips
    const [
      activeStaffProfiles,
      todayRecords,
      activeStaffRecords,
      onBreakStaffRecords,
      pendingAdvancesRecords,
      recentActivity,
      releasedSalaries,
      advancesThisMonth,
      activeStaffProfilesFull
    ] = await Promise.all([
      prisma.staffProfile.findMany({
        where: { isActive: true },
        include: { slot: { include: { outlet: true } } }
      }),
      prisma.attendanceRecord.findMany({
        where: { shiftDate: { gte: today } },
        include: { breaks: true }
      }),
      prisma.attendanceRecord.findMany({
        where: {
          shiftDate: { gte: today },
          state: 'SHIFT_STARTED'
        },
        include: { staff: true }
      }),
      prisma.attendanceRecord.findMany({
        where: {
          shiftDate: { gte: today },
          state: 'ON_BREAK'
        },
        include: { 
          staff: true,
          breaks: {
            orderBy: { startTime: 'desc' },
            take: 1
          }
        }
      }),
      prisma.advance.findMany({
        where: {
          status: 'PENDING',
          isActive: true
        },
        include: { staff: true }
      }),
      prisma.attendanceRecord.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          staff: {
            include: {
              slot: true
            }
          }
        }
      }),
      prisma.payrollRecord.findMany({
        where: { monthYear: currentMonthYear }
      }),
      prisma.advance.findMany({
        where: {
          date: { gte: currentMonthStart, lte: currentMonthEnd },
          isActive: true
        }
      }),
      prisma.staffProfile.findMany({
        where: { isActive: true }
      })
    ]);

    // 3. Map to Combined Daily Roster array
    const dailyRoster = activeStaffProfiles.map(staff => {
      const record = todayRecords.find(r => r.staffId === staff.id);
      
      let totalBreakMs = 0;
      let netWorkMs = 0;

      if (record) {
        // Calculate break duration
        record.breaks.forEach(b => {
          const start = new Date(b.startTime).getTime();
          const end = b.endTime ? new Date(b.endTime).getTime() : Date.now();
          totalBreakMs += (end - start);
        });

        // Calculate work duration
        if (record.startTime) {
          const start = new Date(record.startTime).getTime();
          const end = record.endTime ? new Date(record.endTime).getTime() : Date.now();
          
          let totalDuration = end - start;
          // Subtract breaks
          netWorkMs = totalDuration - totalBreakMs;
          if (netWorkMs < 0) netWorkMs = 0;
        }
      }

      const breakTimeStr = totalBreakMs > 0 
        ? `${Math.round(totalBreakMs / 60000)} mins` 
        : '--';

      const workTimeStr = record?.startTime 
        ? `${(netWorkMs / 3600000).toFixed(2)} hrs` 
        : '--';

      return {
        id: staff.id,
        name: staff.name,
        slotName: staff.slot?.name || 'Standard Slot',
        location: staff.slot?.outlet?.name || 'Unknown',
        state: (record?.state || 'NOT_STARTED') as any,
        startTime: record?.startTime ? new Date(record.startTime).toISOString() : null,
        endTime: record?.endTime ? new Date(record.endTime).toISOString() : null,
        breakTimeStr,
        workTimeStr
      };
    });

    const timeOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'Asia/Kolkata', 
      hour: '2-digit', 
      minute: '2-digit' 
    };

    const activeStaff = activeStaffRecords.map(r => ({ 
      id: r.staff?.id || r.id, 
      name: r.staff?.name || 'Unknown',
      extra: r.startTime ? `Shift started: ${new Date(r.startTime).toLocaleTimeString('en-IN', timeOptions)}` : ''
    }));
    
    const onBreakStaff = onBreakStaffRecords.map(r => {
      const latestBreak = r.breaks?.[0];
      return { 
        id: r.staff?.id || r.id, 
        name: r.staff?.name || 'Unknown',
        extra: latestBreak?.startTime ? `Break started: ${new Date(latestBreak.startTime).toLocaleTimeString('en-IN', timeOptions)}` : ''
      };
    });
    
    const staffAdvancesMap = new Map<string, { name: string, total: number, salary: number }>();
    pendingAdvancesRecords.forEach(a => {
      if (!a.staff) return;
      const existing = staffAdvancesMap.get(a.staffId) || { name: a.staff.name, total: 0, salary: a.staff.monthlySalary || 0 };
      existing.total += a.amount || 0;
      staffAdvancesMap.set(a.staffId, existing);
    });

    const highAdvanceAlerts: { name: string, percent: number }[] = [];
    staffAdvancesMap.forEach(data => {
      if (data.total > data.salary * 0.5 && data.salary > 0) {
        highAdvanceAlerts.push({ name: data.name, percent: Math.round((data.total / data.salary) * 100) });
      }
    });

    const pendingAdvances = pendingAdvancesRecords.map(a => ({ 
      id: a.id, 
      name: a.staff?.name || 'Unknown', 
      extra: `₹${a.amount || 0}` 
    }));

    // Calculate birthday notifications (2 days prior or today)
    const birthdayAlerts: { id: string; name: string; daysRemaining: number }[] = [];
    activeStaffProfiles.forEach(staff => {
      if (staff.dateOfBirth) {
        const dob = new Date(staff.dateOfBirth);
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        
        const currentYear = istTime.getFullYear();
        let bday = new Date(currentYear, dobMonth, dobDate);
        const todayReset = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
        
        let diffTime = bday.getTime() - todayReset.getTime();
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          bday = new Date(currentYear + 1, dobMonth, dobDate);
          diffTime = bday.getTime() - todayReset.getTime();
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        if (diffDays >= 0 && diffDays <= 2) {
          birthdayAlerts.push({
            id: staff.id,
            name: staff.name,
            daysRemaining: diffDays
          });
        }
      }
    });
    birthdayAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const totalMonthlyExpense = releasedSalaries.reduce((acc, curr) => acc + (curr.finalPayable || 0), 0);
    const totalAdvancesThisMonth = advancesThisMonth.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalExpectedSalary = activeStaffProfilesFull.reduce((acc, curr) => acc + (curr.monthlySalary || 0), 0);
    const totalPendingAdvancesAmount = pendingAdvancesRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Executive Overview</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Welcome to the Fulbari Restora intelligence hub.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-modern btn-secondary">
               Sync Data
            </button>
            <button className="btn-modern btn-primary">
              Export Report
            </button>
          </div>
        </header>
        
        <BirthdayPopup alerts={birthdayAlerts} />

        <EmergencyPopup alerts={highAdvanceAlerts} />

        <DashboardStats 
          activeStaff={activeStaff}
          onBreakStaff={onBreakStaff}
          pendingAdvances={pendingAdvances}
          totalMonthlyExpense={totalMonthlyExpense || 0}
          totalAdvancesThisMonth={totalAdvancesThisMonth || 0}
          totalExpectedSalary={totalExpectedSalary || 0}
          totalPendingAdvancesAmount={totalPendingAdvancesAmount || 0}
        />

        <DailyRosterMonitor roster={dailyRoster} />
      </div>
    );
  } catch (error: any) {
    console.error("ADMIN DASHBOARD LOAD ERROR:", error);
    return (
      <div className="glass animate-slide-up" style={{ padding: '4rem', margin: '2rem auto', maxWidth: '600px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
        <h1 style={{ color: 'var(--brand-secondary)', fontSize: '2rem', marginBottom: '1.5rem' }}>⚠️ Database Connection Error</h1>
        <p style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
          The server could not establish a connection to your Supabase PostgreSQL database.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', textAlign: 'left', margin: '1.5rem 0', border: '1px solid var(--glass-border)' }}>
          <p style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Error details:</p>
          <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#fb7185', fontFamily: 'monospace' }}>
            {error.message || String(error)}
          </code>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Please make sure the <strong>DATABASE_URL</strong> environment variable is set correctly in your Vercel Project Settings and that your Supabase database is active.
        </p>
      </div>
    );
  }
}
