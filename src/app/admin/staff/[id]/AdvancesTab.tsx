"use client";

import React, { useState, useEffect } from "react";

export default function AdvancesTab({ staffId }: { staffId: string }) {
  const [advances, setAdvances] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdvances = async () => {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}/advances`);
      const data = await res.json();
      setAdvances(data.advances);
      setSummary(data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, [staffId]);

  const [issueAmount, setIssueAmount] = useState("");
  const [issuing, setIssuing] = useState(false);

  const handleIssueAdvance = async () => {
    if (!issueAmount || isNaN(Number(issueAmount))) return;
    setIssuing(true);
    try {
      const res = await fetch("/api/v1/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, amount: issueAmount }),
      });
      if (res.ok) {
        setIssueAmount("");
        fetchAdvances(); // refresh
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIssuing(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Retrieving financial history...</div>;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass" style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CURRENT DEBT EXPOSURE</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800' }} className="text-gradient">₹{summary?.totalBalance || 0}</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
             <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
             <input 
               type="number"
               className="input-modern"
               placeholder="Amount"
               value={issueAmount}
               onChange={(e) => setIssueAmount(e.target.value)}
               style={{ width: '120px', paddingLeft: '2rem', borderRadius: '12px' }}
             />
          </div>
          <button 
            className="btn-modern btn-primary" 
            onClick={handleIssueAdvance} 
            disabled={issuing || !issueAmount}
            style={{ borderRadius: '12px' }}
          >
            {issuing ? '⏳' : 'Issue Advance'}
          </button>
        </div>
      </div>

      <section>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Transaction History</h3>
        </div>
        <div className="table-container glass">
          <table>
            <thead>
              <tr>
                <th>Disbursement Date</th>
                <th>Principal Amount</th>
                <th>Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((adv: any) => (
                <tr key={adv.id}>
                  <td>{new Date(adv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td style={{ fontWeight: '700' }}>₹{adv.amount}</td>
                  <td>
                    <span style={{ 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '100px', 
                      fontSize: '0.7rem', 
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: adv.status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                      color: adv.status === 'PENDING' ? '#f59e0b' : '#10b981',
                      border: `1px solid ${adv.status === 'PENDING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                      {adv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {advances.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🍃</div>
                    No financial liabilities found for this profile.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
