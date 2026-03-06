"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function LaunchPage() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-12">
      {/* ═══ HEADER ═══ */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A9FF00] to-[#88CC00] flex items-center justify-center shadow-[0_0_20px_rgba(169,255,0,0.3)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-[#F1F1F4] mb-2">Launch Token</h1>
        <p className="text-sm text-[#8B8FA3]">Configure your Agency-stewarded token launch</p>
      </div>

      {/* ═══ WALLET READINESS ═══ */}
      <div className="max-w-6xl mx-auto mb-8 glass-card glass-card-glow !p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B8FA3] mb-2">Wallet readiness</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`badge ${connected ? "badge-lime" : "badge-yellow"}`}>{connected ? "Connected" : "Wallet Required"}</span>
              {connected && publicKey ? <span className="text-[12px] font-mono text-[#8B8FA3]">{shortenAddress(publicKey.toBase58())}</span> : null}
            </div>
            <p className="text-[13px] text-[#8B8FA3] leading-relaxed max-w-2xl">
              {connected
                ? "Your wallet is connected. Review your token metadata and charter parameters, then proceed to the launch confirmation flow."
                : "Connect a Solana wallet before you create a launch. BondIt uses wallet state to anchor creator identity, launch transactions, and on-chain stewardship registration."}
            </p>
          </div>

          {!connected ? <WalletMultiButton className="bondit-wallet-button" /> : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
        {/* ═══ LEFT: Launch form ═══ */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card">
            <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
              Token Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#8B8FA3] mb-1.5 font-medium uppercase tracking-wider">Token Name</label>
                <input type="text" placeholder="e.g. My Token" className="glass-input w-full px-4 py-3 text-[14px]" />
              </div>
              <div>
                <label className="block text-[12px] text-[#8B8FA3] mb-1.5 font-medium uppercase tracking-wider">Ticker</label>
                <input type="text" placeholder="e.g. GIGA" className="glass-input w-full px-4 py-3 text-[14px]" />
              </div>
              <div>
                <label className="block text-[12px] text-[#8B8FA3] mb-1.5 font-medium uppercase tracking-wider">Description</label>
                <textarea placeholder="Brief description of your token..." rows={3} className="glass-input w-full px-4 py-3 text-[14px] resize-none" />
              </div>
              <div>
                <label className="block text-[12px] text-[#8B8FA3] mb-1.5 font-medium uppercase tracking-wider">Token Image</label>
                <div className="glass-input flex items-center justify-center py-8 cursor-pointer hover:bg-[#F7D2C4]/[0.05] transition-colors group">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto text-[#8B8FA3] group-hover:text-[#754975] transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="#754975" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[12px] text-[#8B8FA3] group-hover:text-[#754975]">Click to upload or drag & drop</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
              Launch Type
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card-interactive !p-4 !border-[#A9FF00]/20 !bg-[#A9FF00]/[0.06]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#A9FF00]/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#A9FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-semibold text-[#F1F1F4]">Native Launch</span>
                </div>
                <p className="text-[12px] text-[#8B8FA3] leading-relaxed">
                  Launch through BondIt.lol bonding curve with full Agency stewardship.
                </p>
              </div>
              <div className="glass-card-interactive !p-4 opacity-40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#8B8FA3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-semibold text-[#8B8FA3]">Pump Route</span>
                </div>
                <p className="text-[12px] text-[#8B8FA3] leading-relaxed">
                  Route through external pump-style rail with Agency overlay.
                </p>
              </div>
            </div>
          </div>

          <button
            className="btn-glow w-full !py-4 text-[15px] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            disabled={!connected}
          >
            {connected ? "Continue to Launch Confirmation" : "Connect Wallet to Launch"}
          </button>

          {/* CLI link */}
          <div className="mt-2 text-center">
            <a href="/cli" className="text-[11px] text-[#8B8FA3] hover:text-[#A9FF00] transition-colors">
              Prefer the terminal? <span className="underline">Use the CLI instead →</span>
            </a>
          </div>
        </div>

        {/* ═══ RIGHT: Charter Preview ═══ */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card glass-card-glow animate-float-slow">
            <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              Agency Charter Preview
            </h2>
            <div className="space-y-4">
              {[
                { label: "Total Supply", value: "1,000,000,000", accent: false },
                { label: "Curve Supply", value: "800M (80%)", accent: false },
                { label: "Treasury", value: "150M (15%)", accent: true },
                { label: "LP Reserve", value: "50M (5%)", accent: false },
                { label: "Graduation Target", value: "85 SOL", accent: true },
                { label: "Protocol Fee", value: "1% (100 bps)", accent: false },
                { label: "Fee Split", value: "99% LP / 1% House", accent: true },
                { label: "Daily Release", value: "0.20% remaining", accent: false },
                { label: "Max Daily", value: "1,000,000 tokens", accent: false },
                { label: "Max Weekly", value: "5,000,000 tokens", accent: false },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-[12px] text-[#8B8FA3]">{row.label}</span>
                  <span className={`text-[12px] font-mono ${row.accent ? 'accent-lime font-semibold' : 'text-[#F1F1F4]'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <h3 className="text-[12px] text-[#8B8FA3] font-medium uppercase tracking-wider mb-3">Flight Mode Triggers</h3>
              <div className="space-y-2.5">
                <FlightRow label="Holders" target="≥ 15,000" />
                <FlightRow label="Top-10 Concentration" target="≤ 18%" />
                <FlightRow label="Treasury Remaining" target="≤ 5%" />
                <FlightRow label="Max Duration" target="180 days" />
              </div>
            </div>

            <div className="mt-5 px-3 py-2.5 rounded-xl bg-[#A9FF00]/[0.06] border border-[#A9FF00]/[0.12]">
              <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
                Charter parameters are immutable after genesis. All policy actions are deterministic and logged on-chain.
              </p>
            </div>
          </div>

          {/* Predicted Timeline */}
          <div className="glass-card">
            <h2 className="font-display text-sm font-semibold text-[#8B8FA3] mb-4 uppercase tracking-wider">Predicted Timeline</h2>
            <div className="space-y-3">
              {[
                { phase: "Curve Phase", time: "~2-14 days", color: "bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.4)]" },
                { phase: "Graduation", time: "At 85 SOL", color: "bg-[#3B82F6] shadow-[0_0_6px_rgba(59,130,246,0.4)]" },
                { phase: "Stewardship", time: "Up to 180 days", color: "bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.4)]" },
                { phase: "Flight Mode", time: "When thresholds met", color: "bg-[#00FFB2] shadow-[0_0_6px_rgba(0,255,178,0.4)]" },
              ].map((p) => (
                <div key={p.phase} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                  <span className="text-[12px] text-[#8B8FA3] flex-1">{p.phase}</span>
                  <span className="text-[11px] font-mono text-[#8B8FA3]">{p.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlightRow({ label, target }: { label: string; target: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-[#8B8FA3]">{label}</span>
      <span className="text-[11px] font-mono accent-red font-semibold">{target}</span>
    </div>
  );
}
