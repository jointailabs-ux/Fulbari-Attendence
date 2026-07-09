import React from "react";

export const dynamic = 'force-dynamic';

import prisma from '../../lib/prisma';
import DailyRosterMonitor from "../admin/DailyRosterMonitor";

export default async function ManagerDashboard() {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const today = new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));

  try {
    const [
      activeStaffProfiles,
      todayRecords,
    ] = await Promise.all([
      prisma.staffProfile.findMany({
        where: { isActive: true },
        include: { slot: { include: { outlet: true } } }
      }),
      prisma.attendanceRecord.findMany({
        where: { shiftDate: { gte: today } },
        include: { breaks: true }
      }),
    ]);

    const dailyRoster = activeStaffProfiles.map(staff => {
      const record = todayRecords.find(r => r.staffId === staff.id);
      
      let totalBreakMs = 0;
      let netWorkMs = 0;

      if (record) {
        record.breaks.forEach(b => {
          const start = new Date(b.startTime).getTime();
          const end = b.endTime ? new Date(b.endTime).getTime() : Date.now();
          totalBreakMs += (end - start);
        });

        if (record.startTime) {
          const start = new Date(record.startTime).getTime();
          const end = record.endTime ? new Date(record.endTime).getTime() : Date.now();
          
          let totalDuration = end - start;
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

    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Manager Overview</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Monitor today's staff attendance.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="/kiosk?from=manager" className="btn-modern btn-primary">
              Launch Kiosk
            </a>
          </div>
        </header>

        <DailyRosterMonitor roster={dailyRoster} />
      </div>
    );
  } catch (error: any) {
    console.error("MANAGER DASHBOARD LOAD ERROR:", error);
    return (
      <div className="glass animate-slide-up" style={{ padding: '4rem', margin: '2rem auto', maxWidth: '600px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
        <h1 style={{ color: 'var(--brand-secondary)', fontSize: '2rem', marginBottom: '1.5rem' }}>⚠️ Database Error</h1>
        <p style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
          Failed to load attendance data.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', textAlign: 'left', margin: '1.5rem 0', border: '1px solid var(--glass-border)' }}>
          <p style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Error details:</p>
          <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#fb7185', fontFamily: 'monospace' }}>
            {error.message || String(error)}
          </code>
        </div>
      </div>
    );
  }
}
