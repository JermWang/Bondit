export default function Dashboard() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1D2E]">Agency Dashboard</h1>
          <p className="text-[13px] text-[#9DA3C0] mt-1">$GIGA — Real-time stewardship transparency</p>
        </div>
        <div className="flex gap-2">
          <span className="glass-input px-3 py-1.5 text-[12px] text-[#5A607F]">Day 12</span>
          <span className="badge badge-violet !px-3 !py-1.5 !text-[12px]">Stewarding</span>
        </div>
      </div>

      {/* ═══ Stat row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Status", value: "Stewarding", accent: "accent-violet" },
          { label: "Day", value: "12", accent: "" },
          { label: "Holders", value: "3,247", accent: "accent-blue" },
          { label: "Top-10", value: "42.1%", accent: "" },
          { label: "Treasury", value: "14.2%", accent: "accent-red" },
        ].map((s) => (
          <div key={s.label} className="glass-card text-center !py-4">
            <div className="stat-label mb-1">{s.label}</div>
            <div className={`text-xl font-bold font-mono ${s.accent || 'text-[#1A1D2E]'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ═══ Main 2/3 + 1/3 grid ═══ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Curve progress */}
        <div className="lg:col-span-2 glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-5">Graduation Progress</h2>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-[13px] text-[#9DA3C0]">SOL Raised</span>
              <span className="text-[13px] font-mono text-[#1A1D2E]">67.3 / 85.0 SOL</span>
            </div>
            <div className="progress-glass !h-3">
              <div className="progress-fill-gradient" style={{ width: "79%", height: "100%", borderRadius: "100px" }} />
            </div>
            <div className="text-right mt-1.5">
              <span className="text-[11px] accent-violet font-mono font-semibold">79.2% to graduation</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 pt-5 mt-5 border-t border-black/[0.06]">
            <div>
              <div className="stat-label">Tokens Sold</div>
              <div className="text-lg font-mono font-bold text-[#1A1D2E] mt-1">423.1M</div>
            </div>
            <div>
              <div className="stat-label">Current Price</div>
              <div className="text-lg font-mono font-bold accent-blue mt-1">0.000084</div>
            </div>
            <div>
              <div className="stat-label">Total Trades</div>
              <div className="text-lg font-mono font-bold text-[#1A1D2E] mt-1">12,847</div>
            </div>
          </div>
        </div>

        {/* Charter */}
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-4">Agency Charter</h2>
          <div className="space-y-2.5">
            {[
              { l: "Daily Release", v: "0.20% remaining" },
              { l: "Max Daily", v: "1,000,000" },
              { l: "Max Weekly", v: "5,000,000" },
              { l: "Fee Split", v: "99% LP / 1% House" },
              { l: "Flight Holders", v: "15,000" },
              { l: "Flight Top-10", v: "≤ 18%" },
              { l: "Flight Treasury", v: "≤ 5%" },
              { l: "Max Duration", v: "180 days" },
            ].map((r) => (
              <div key={r.l} className="flex justify-between text-[12px]">
                <span className="text-[#9DA3C0]">{r.l}</span>
                <span className="font-mono text-[#1A1D2E]">{r.v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-black/[0.06]">
            <span className="text-[11px] text-[#9DA3C0]">Immutable after genesis</span>
          </div>
        </div>
      </div>

      {/* ═══ Treasury + Liquidity + Flight ═══ */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Treasury */}
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-5">Treasury</h2>
          <div className="text-center mb-5">
            <div className="text-4xl font-bold font-mono accent-red">14.2%</div>
            <div className="text-[12px] text-[#9DA3C0] mt-1">remaining of 150M</div>
          </div>
          <div className="space-y-2.5">
            {[
              { l: "Released Today", v: "284,000" },
              { l: "This Week", v: "1,892,000" },
              { l: "Total Released", v: "128.7M" },
            ].map((r) => (
              <div key={r.l} className="flex justify-between text-[12px]">
                <span className="text-[#9DA3C0]">{r.l}</span>
                <span className="font-mono text-[#1A1D2E]">{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Liquidity */}
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-5">Liquidity Depth</h2>
          <div className="text-center mb-5">
            <div className="text-4xl font-bold font-mono accent-blue">$48.2K</div>
            <div className="text-[12px] text-[#9DA3C0] mt-1">active on Meteora DLMM</div>
          </div>
          <div className="space-y-2.5">
            {[
              { l: "Fees Harvested", v: "12.4 SOL" },
              { l: "LP Compounded", v: "12.28 SOL (99%)" },
              { l: "House Collected", v: "0.12 SOL (1%)" },
            ].map((r) => (
              <div key={r.l} className="flex justify-between text-[12px]">
                <span className="text-[#9DA3C0]">{r.l}</span>
                <span className="font-mono text-[#1A1D2E]">{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flight Mode */}
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-5">Flight Mode</h2>
          <div className="space-y-4">
            <FlightBar label="Holders" current={3247} target={15000} display="3,247 / 15,000" />
            <FlightBar label="Top-10" current={57.9} target={82} display="42.1% → ≤18%" inverted />
            <FlightBar label="Treasury" current={85.8} target={95} display="14.2% → ≤5%" inverted />
          </div>
          <div className="mt-4 pt-3 border-t border-black/[0.06] flex justify-between text-[12px]">
            <span className="text-[#9DA3C0]">Failsafe</span>
            <span className="font-mono accent-violet font-semibold">168 days</span>
          </div>
        </div>
      </div>

      {/* ═══ Policy Actions Log ═══ */}
      <div className="glass-card mt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E]">Policy Actions</h2>
          <span className="text-[11px] text-[#9DA3C0] font-mono">42 total actions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[#9DA3C0] border-b border-black/[0.06]">
                <th className="pb-2.5 font-medium w-10">#</th>
                <th className="pb-2.5 font-medium">Action</th>
                <th className="pb-2.5 font-medium">Details</th>
                <th className="pb-2.5 font-medium">Time</th>
                <th className="pb-2.5 font-medium text-right">Tx</th>
              </tr>
            </thead>
            <tbody>
              {[
                { i: 42, a: "LP Compound", d: "12.28 SOL → LP, 0.12 SOL → House", t: "2h ago", tx: "5xK3...mN9p" },
                { i: 41, a: "Treasury Release", d: "284,000 tokens → LP Reserve", t: "2h ago", tx: "3jR7...pQ2w" },
                { i: 40, a: "Monitor", d: "3,247 holders · 42.1% top-10 · $48.2K depth", t: "3h ago", tx: "8mL4...vX1r" },
                { i: 39, a: "Rebalance", d: "Bins 142-168 → 148-174 (Meteora)", t: "6h ago", tx: "2nP9...hK5s" },
                { i: 38, a: "LP Compound", d: "11.95 SOL → LP, 0.12 SOL → House", t: "1d ago", tx: "7wQ2...bT8m" },
                { i: 37, a: "Treasury Release", d: "286,400 tokens → LP Reserve", t: "1d ago", tx: "4kL8...nR3v" },
                { i: 36, a: "Monitor", d: "3,189 holders · 43.2% top-10 · $46.8K depth", t: "1d ago", tx: "9pN2...jK7w" },
              ].map((row) => (
                <tr key={row.i} className="border-b border-black/[0.03] hover:bg-black/[0.015] transition-colors">
                  <td className="py-3 font-mono text-[#9DA3C0]">{row.i}</td>
                  <td className="py-3 font-medium text-[#1A1D2E]">{row.a}</td>
                  <td className="py-3 text-[#5A607F]">{row.d}</td>
                  <td className="py-3 text-[#9DA3C0]">{row.t}</td>
                  <td className="py-3 text-right">
                    <span className="font-mono accent-violet text-[11px] cursor-pointer hover:underline">{row.tx}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="py-8 mt-10 border-t border-black/[0.04] text-center">
        <p className="text-[11px] text-[#9DA3C0]">All actions on-chain · Charter immutable · Independently verifiable</p>
      </footer>
    </div>
  );
}

function FlightBar({
  label,
  current,
  target,
  display,
  inverted,
}: {
  label: string;
  current: number;
  target: number;
  display: string;
  inverted?: boolean;
}) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[12px] text-[#9DA3C0]">{label}</span>
        <span className="text-[11px] font-mono text-[#5A607F]">{display}</span>
      </div>
      <div className="progress-glass">
        <div
          className={`progress-fill-gradient ${inverted ? 'progress-fill-warn' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
