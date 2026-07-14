"use client";

import React, { useState, useEffect } from "react";

export default function PayrollCalculationPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [results, setResults] = useState<any[]>([]);
  const [releasedRecords, setReleasedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, 'strict' | 'simple'>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [calcRes, releaseRes] = await Promise.all([
        fetch(`/api/v1/payroll/calculate?month=${month}`),
        fetch(`/api/v1/payroll/release?month=${month}`)
      ]);
      const calcData = await calcRes.json();
      const releaseData = await releaseRes.json();
      
      setResults(calcData);
      setReleasedRecords(releaseData);
      
      // Initialize selections
      const initialSelections: Record<string, 'strict' | 'simple'> = {};
      calcData.forEach((r: any) => {
        initialSelections[r.staffId] = 'simple';
      });
      setSelections(initialSelections);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month]);

  const handleModeChange = (staffId: string, mode: 'strict' | 'simple') => {
    setSelections(prev => ({ ...prev, [staffId]: mode }));
  };

  const handleRelease = async (staffResult: any) => {
    const mode = selections[staffResult.staffId];
    const finalPayable = mode === 'strict' ? staffResult.strictFinal : staffResult.simpleFinal;
    
    const confirmRelease = confirm(`Release ₹${finalPayable} to ${staffResult.name} for ${month}?`);
    if (!confirmRelease) return;

    try {
      const res = await fetch('/api/v1/payroll/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffResult.staffId,
          monthYear: month,
          strictSalary: staffResult.strictRaw,
          simpleSalary: staffResult.simpleRaw,
          selectedMode: mode.toUpperCase(),
          finalPayable: parseFloat(finalPayable),
          advancesDeducted: parseFloat(staffResult.totalAdvance)
        })
      });

      if (res.ok) {
        alert('Salary released successfully!');
        fetchData(); // Refresh data
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to release salary');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while releasing salary');
    }
  };

  const totalReleased = releasedRecords.reduce((acc, curr) => acc + curr.finalPayable, 0);
  const pendingCount = results.filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId)).length;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Financial Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Comprehensive payroll management and expense tracking.</p>
        </div>
      </header>

      {/* Monthly Summary Cards */}
      <div className="grid-auto">
        <div 
          className="glass" 
          style={{
            position: "relative", overflow: "hidden", borderRadius: "18px",
            background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)", padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total Salary Expense ({month})
            </span>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <h3 style={{ fontSize: "1.75rem", fontWeight: 900, fontFamily: "var(--font-heading)", background: "linear-gradient(to right, #10b981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ₹{totalReleased.toLocaleString()}
          </h3>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
            From {releasedRecords.length} completed payouts
          </div>
        </div>

        <div 
          className="glass" 
          style={{
            position: "relative", overflow: "hidden", borderRadius: "18px",
            background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)", padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #fb923c, #fcd34d)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Pending Payouts
            </span>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.25)", color: "#fb923c",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
            </div>
          </div>
          <h3 style={{ fontSize: "1.75rem", fontWeight: 900, fontFamily: "var(--font-heading)", background: "linear-gradient(to right, #fb923c, #fcd34d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {pendingCount}
          </h3>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Personnel awaiting authorization
          </div>
        </div>

        <div 
          className="glass" 
          style={{
            position: "relative", overflow: "hidden", borderRadius: "18px",
            background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)", padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem",
            justifyContent: "space-between"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.25rem" }}>
            Select Cycle
          </span>
          <input 
            type="month" 
            className="input-modern" 
            style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.9rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", marginTop: "0.3rem" }} 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
          />
        </div>
      </div>


      {/* Action Area: Calculate/Pending */}
      <section className="animate-slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Draft Payroll Matrix</h2>
          <button className="btn-modern btn-secondary" onClick={fetchData} disabled={loading}>
            {loading ? 'Processing...' : 'Recalculate Metrics'}
          </button>
        </div>
        
        <div className="table-container glass">
          <table>
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Base Salary</th>
                <th>Deductions (PF)</th>
                <th>In-Hand Base</th>
                <th>Strict Mode</th>
                <th>Simple Mode</th>
                <th>Debt (Advances)</th>
                <th>Mode Choice</th>
                <th style={{ textAlign: 'right' }}>Authorization</th>
              </tr>
            </thead>
            <tbody>
              {results.filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId)).map((r: any) => (
                <tr key={r.staffId}>
                  <td>
                    <div style={{ fontWeight: '700' }}>{r.name}</div>
                    {r.warnings.highAdvance && <span style={{ fontSize: '0.7rem', color: 'var(--brand-secondary)', fontWeight: '800' }}>⚠️ HIGH DEBT</span>}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>₹{r.monthlySalary}</td>
                  <td style={{ color: 'var(--brand-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>-₹{r.pfAmount}</td>
                  <td style={{ fontWeight: '800', color: 'var(--brand-accent)' }}>₹{r.inHandBase}</td>
                  <td>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Raw: ₹{r.strictRaw}</div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Net: ₹{r.strictFinal}</div>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Raw: ₹{r.simpleRaw}</div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Net: ₹{r.simpleFinal}</div>
                  </td>
                  <td style={{ color: 'var(--brand-secondary)', fontWeight: '700' }}>-₹{r.totalAdvance}</td>
                  <td>
                    <select 
                      className="input-modern" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minWidth: '120px' }}
                      value={selections[r.staffId] || 'simple'}
                      onChange={(e) => handleModeChange(r.staffId, e.target.value as any)}
                    >
                      <option value="strict">Strict Mode</option>
                      <option value="simple">Simple Mode</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn-modern btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                      onClick={() => handleRelease(r)}
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
              {results.filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId)).length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</div>
                    No pending payrolls for this cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* History Area: Released Salaries */}
      {releasedRecords.length > 0 && (
        <section className="animate-slide-up">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Disbursement History ({month})</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Permanent records of released funds.</p>
          </div>
          
          <div className="table-container glass" style={{ background: 'rgba(16, 185, 129, 0.02)', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
            <table>
              <thead>
                <tr>
                  <th>Personnel Member</th>
                  <th>Released Date</th>
                  <th>Calculation Mode</th>
                  <th>Debt Deducted</th>
                  <th>Final Payout</th>
                  <th style={{ textAlign: 'right' }}>Identity</th>
                </tr>
              </thead>
              <tbody>
                {releasedRecords.map((rec: any) => (
                  <tr key={rec.id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{rec.staff?.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {rec.staffId.slice(0,8)}...</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary-light)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                        {rec.selectedMode}
                      </span>
                    </td>
                    <td style={{ color: 'var(--brand-secondary)', fontWeight: '600' }}>-₹{rec.advancesDeducted}</td>
                    <td style={{ fontWeight: '800', color: 'var(--brand-accent)', fontSize: '1.1rem' }}>₹{rec.finalPayable}</td>
                    <td style={{ textAlign: 'right' }}>
                       <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.id.slice(0,12)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
