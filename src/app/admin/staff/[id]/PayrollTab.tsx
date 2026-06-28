"use client";

import React, { useState, useEffect } from "react";

export default function PayrollTab({ staffId }: { staffId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayroll = async () => {
    try {
      // Assuming we have an API or can filter the release API
      const res = await fetch(`/api/v1/payroll/release`);
      const data = await res.json();
      // Filter for this specific staff
      setRecords(data.filter((r: any) => r.staffId === staffId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [staffId]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Retrieving payroll archive...</div>;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Salary Disbursement History</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verified records of all finalized payments and deductions.</p>
      </div>

      <div className="table-container glass">
        <table>
          <thead>
            <tr>
              <th>Cycle (Month)</th>
              <th>Release Date</th>
              <th>Mode</th>
              <th>Debt Settled</th>
              <th>Net Payout</th>
              <th style={{ textAlign: 'right' }}>Voucher ID</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec: any) => (
              <tr key={rec.id}>
                <td style={{ fontWeight: '700' }}>{rec.monthYear}</td>
                <td style={{ fontSize: '0.85rem' }}>{new Date(rec.createdAt).toLocaleDateString()}</td>
                <td>
                  <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary-light)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                    {rec.selectedMode}
                  </span>
                </td>
                <td style={{ color: 'var(--brand-secondary)', fontWeight: '600' }}>-₹{rec.advancesDeducted}</td>
                <td style={{ fontWeight: '800', color: 'var(--brand-accent)' }}>₹{rec.finalPayable}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {rec.id.toUpperCase()}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                  No payroll records found for this personnel profile.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
