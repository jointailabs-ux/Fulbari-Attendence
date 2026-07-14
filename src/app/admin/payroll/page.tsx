"use client";

import React, { useState, useEffect } from "react";

const GRAD_PALETTES = [
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#fb923c", "#fcd34d"],
  ["#10b981", "#06b6d4"],
  ["#f43f5e", "#fb7185"],
  ["#a855f7", "#6366f1"],
];

function Avatar({ name, index }: { name: string; index: number }) {
  const [c1, c2] = GRAD_PALETTES[index % GRAD_PALETTES.length];
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: "0.95rem", color: "white",
      boxShadow: `0 4px 10px ${c1}40`,
    }}>
      {initials}
    </div>
  );
}

export default function PayrollCalculationPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [results, setResults] = useState<any[]>([]);
  const [releasedRecords, setReleasedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, 'strict' | 'simple'>>({});
  const [searchQuery, setSearchQuery] = useState("");

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
  
  // Filter drafts by search query
  const pendingDrafts = results
    .filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId))
    .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
  const pendingCount = results.filter(r => !releasedRecords.some(rr => rr.staffId === r.staffId)).length;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* ── Header ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Financial Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprehensive monthly payroll generation and disbursement history.</p>
        </div>
      </header>


      {/* ── Monthly Summary Cards ── */}
      <div className="grid-auto">
        <div 
          className="glass" 
          style={{
            position: "relative", overflow: "hidden", borderRadius: "18px",
            background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total Salary Expense
            </span>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <h3 style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "var(--font-heading)", background: "linear-gradient(to right, #10b981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ₹{totalReleased.toLocaleString("en-IN")}
          </h3>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
            From {releasedRecords.length} completed payouts ({month})
          </div>
        </div>

        <div 
          className="glass" 
          style={{
            position: "relative", overflow: "hidden", borderRadius: "18px",
            background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #fb923c, #fcd34d)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Pending Payouts
            </span>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
            </div>
          </div>
          <h3 style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "var(--font-heading)", background: "linear-gradient(to right, #fb923c, #fcd34d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {pendingCount}
          </h3>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Awaiting authorization ({month})
          </div>
        </div>

        <div 
          className="glass" 
          style={{
            position: "relative", overflow: "hidden", borderRadius: "18px",
            background: "rgba(12,12,18,0.7)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem",
            justifyContent: "space-between"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.25rem" }}>
            Select Cycle
          </span>
          <input 
            type="month" 
            className="input-modern" 
            style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", marginTop: "0.2rem" }} 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
          />
        </div>
      </div>

      {/* Search Filter Bar */}
      <div style={{ position: "relative", width: "100%", maxWidth: "450px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="input-modern"
          placeholder="Search personnel by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: "2.3rem", paddingTop: "0.55rem", paddingBottom: "0.55rem", fontSize: "0.85rem" }}
        />
      </div>

      {/* ── Draft Payroll Matrix (Beautiful Card List) ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Draft Payroll Matrix</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select calculation mode and release payouts for active personnel.</p>
          </div>
          <button className="btn-modern btn-secondary" onClick={fetchData} disabled={loading} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {loading ? 'Processing...' : 'Recalculate Metrics'}
          </button>
        </div>

        {pendingDrafts.length === 0 ? (
          <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              {searchQuery ? `No drafts matching "${searchQuery}"` : `All payouts released for the month of ${month}!`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pendingDrafts.map((r: any, idx: number) => {
              const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
              const mode = selections[r.staffId] || 'simple';
              const netToPay = mode === 'strict' ? r.strictFinal : r.simpleFinal;
              const grossEarned = mode === 'strict' ? r.strictRaw : r.simpleRaw;

              return (
                <div
                  key={r.staffId}
                  style={{
                    borderRadius: "18px", overflow: "hidden",
                    background: "rgba(12,12,18,0.75)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backdropFilter: "blur(20px)",
                    padding: "1.25rem 1.4rem",
                    display: "flex", flexDirection: "column", gap: "1rem",
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 10px 25px ${c1}12, 0 4px 15px rgba(0,0,0,0.4)`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c1}, ${c2})` }} />

                  {/* Header Row: Profile + Alerts */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Avatar name={r.name} index={idx} />
                      <div>
                        <p style={{ fontWeight: 800, fontSize: "1rem" }}>{r.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Base salary: <strong style={{ color: "#fff" }}>₹{r.monthlySalary.toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                    </div>
                    {/* Alerts/Badges */}
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {r.warnings.highAdvance && (
                        <span style={{ fontSize: "0.65rem", color: "#fb7185", background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", padding: "0.2rem 0.55rem", borderRadius: "6px", fontWeight: 800, letterSpacing: "0.02em" }}>
                          ⚠️ HIGH ADVANCE DEBT
                        </span>
                      )}
                      {r.warnings.lowWork && (
                        <span style={{ fontSize: "0.65rem", color: "#fb923c", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)", padding: "0.2rem 0.55rem", borderRadius: "6px", fontWeight: 800, letterSpacing: "0.02em" }}>
                          ⚠️ NO DAYS WORKED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calculation Mode Comparison Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
                    
                    {/* Simple Mode Box */}
                    <div style={{
                      padding: "0.85rem 1rem", borderRadius: "12px",
                      background: mode === "simple" ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${mode === "simple" ? "rgba(16,185,129,0.25)" : "var(--glass-border)"}`,
                      transition: "all 0.2s"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: mode === "simple" ? "#10b981" : "var(--text-muted)" }}>SIMPLE PAYOUT</span>
                        {mode === "simple" && <span style={{ fontSize: "0.65rem", background: "#10b981", color: "#000", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 800 }}>SELECTED</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>Earned base:</span>
                        <span>₹{r.simpleRaw}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <span>Advance Debt:</span>
                        <span style={{ color: "#fb7185" }}>-₹{r.totalAdvance}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.95rem" }}>
                        <span>Net Payable:</span>
                        <span style={{ color: "#10b981" }}>₹{r.simpleFinal}</span>
                      </div>
                    </div>

                    {/* Strict Mode Box */}
                    <div style={{
                      padding: "0.85rem 1rem", borderRadius: "12px",
                      background: mode === "strict" ? "rgba(6,182,212,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${mode === "strict" ? "rgba(6,182,212,0.25)" : "var(--glass-border)"}`,
                      transition: "all 0.2s"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: mode === "strict" ? "#06b6d4" : "var(--text-muted)" }}>STRICT TIMINGS</span>
                        {mode === "strict" && <span style={{ fontSize: "0.65rem", background: "#06b6d4", color: "#000", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 800 }}>SELECTED</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>Earned base:</span>
                        <span>₹{r.strictRaw}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>Late/Early penalties:</span>
                        <span style={{ color: "#fb7185" }}>-₹{(r.metrics.penaltyLate + r.metrics.penaltyEarly).toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <span>Advance Debt:</span>
                        <span style={{ color: "#fb7185" }}>-₹{r.totalAdvance}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.95rem" }}>
                        <span>Net Payable:</span>
                        <span style={{ color: "#06b6d4" }}>₹{r.strictFinal}</span>
                      </div>
                    </div>

                  </div>

                  {/* Actions & Selector Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Disburse Mode:</span>
                      <select 
                        className="input-modern" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minWidth: '130px', width: "auto" }}
                        value={mode}
                        onChange={(e) => handleModeChange(r.staffId, e.target.value as any)}
                      >
                        <option value="simple">Simple Mode</option>
                        <option value="strict">Strict Mode</option>
                      </select>
                    </div>

                    <button 
                      className="btn-modern btn-primary" 
                      style={{ padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}
                      onClick={() => handleRelease(r)}
                    >
                      Authorize Release (₹{netToPay})
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Disbursement History Area (Released Receipts) ── */}
      {releasedRecords.filter(rec => rec.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
        <section>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Disbursement History ({month})</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audit archive of finalized payouts and deductions.</p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {releasedRecords
              .filter(rec => rec.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((rec: any, idx: number) => {
                const [c1, c2] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
                return (
                  <div
                    key={rec.id}
                    style={{
                      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem",
                      padding: "0.85rem 1.1rem", borderRadius: "14px",
                      background: "rgba(16, 185, 129, 0.02)", border: "1px solid rgba(16, 185, 129, 0.15)"
                    }}
                  >
                    <Avatar name={rec.staff?.name || "Unknown"} index={idx} />
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <p style={{ fontWeight: 800, fontSize: "0.95rem" }}>{rec.staff?.name}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Released: {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.5rem" }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Calculation Mode</p>
                        <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary-light)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700' }}>
                          {rec.selectedMode}
                        </span>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Debt Settled</p>
                        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--brand-secondary)" }}>-₹{rec.advancesDeducted}</p>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Net Paid</p>
                        <p style={{ fontWeight: 900, fontSize: "1.2rem", color: "#10b981" }}>₹{rec.finalPayable.toLocaleString("en-IN")}</p>
                      </div>

                      <div style={{ textAlign: "right", minWidth: "80px" }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Receipt ID</p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.id.slice(0,8).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

