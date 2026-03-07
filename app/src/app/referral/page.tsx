"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  fetchReferralStats,
  fetchReferralEarnings,
  lamportsToSol,
  type ReferralStats,
  type ReferralEarning,
} from "@/lib/referral";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="glass-card flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#56566A]">{label}</span>
      <span className={`text-[22px] font-display font-bold leading-tight ${accent ? "text-[#A9FF00]" : "text-[#F1F1F4]"}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-[#8B8FA3] font-mono">{sub}</span>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 text-[11px] font-mono rounded-lg transition-all bg-[#A9FF00]/10 border border-[#A9FF00]/20 text-[#A9FF00] hover:bg-[#A9FF00]/20 active:scale-95"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function ReferralPage() {
  const { connected, publicKey } = useWallet();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [earnings, setEarnings] = useState<ReferralEarning[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) return;

    const wallet = publicKey.toBase58();
    setLoading(true);

    Promise.all([
      fetchReferralStats(wallet),
      fetchReferralEarnings(wallet),
    ]).then(([s, e]) => {
      setStats(s);
      setEarnings(e?.earnings ?? []);
    }).finally(() => setLoading(false));
  }, [connected, publicKey]);

  // Not connected state
  if (!connected || !publicKey) {
    return (
      <div className="max-w-[900px] mx-auto px-6 lg:px-8 py-12">
        <div className="glass-card glass-card-glow text-center py-16">
          <div className="text-[40px] mb-4">🔗</div>
          <h1 className="font-display text-[24px] font-bold text-[#F1F1F4] mb-3">Referral Program</h1>
          <p className="text-[13px] text-[#8B8FA3] max-w-md mx-auto mb-6">
            Connect your wallet to get your unique referral link. Earn <strong className="text-[#A9FF00]">10% of trading fees</strong> from
            everyone you refer — plus <strong className="text-[#A9FF00]">second-degree rewards</strong> when your referrals refer others.
          </p>
          <div className="glass !rounded-xl inline-flex flex-col gap-3 px-6 py-4 text-left text-[12px] text-[#8B8FA3]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#A9FF00]/10 border border-[#A9FF00]/30 flex items-center justify-center text-[10px] text-[#A9FF00] font-bold">1</span>
              Connect your wallet above
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#A9FF00]/10 border border-[#A9FF00]/30 flex items-center justify-center text-[10px] text-[#A9FF00] font-bold">2</span>
              Share your unique referral link
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#A9FF00]/10 border border-[#A9FF00]/30 flex items-center justify-center text-[10px] text-[#A9FF00] font-bold">3</span>
              Earn from every trade your referrals make
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card">
            <div className="text-[20px] mb-2">💰</div>
            <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-1">Direct Rewards</h3>
            <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
              Earn <strong className="text-[#A9FF00]">50%</strong> of the referral pool (10% of fees) from every trade your direct referrals make. That&apos;s 5% of all trading fees.
            </p>
          </div>
          <div className="glass-card">
            <div className="text-[20px] mb-2">🔗</div>
            <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-1">2nd-Degree</h3>
            <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
              When your referrals refer others, you earn <strong className="text-[#A9FF00]">15%</strong> of the referral pool from those users&apos; trades too. Passive income.
            </p>
          </div>
          <div className="glass-card">
            <div className="text-[20px] mb-2">🎁</div>
            <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-1">Airdrop Pool</h3>
            <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
              The remaining <strong className="text-[#A9FF00]">35%</strong> of unclaimed referral fees go into a platform-wide airdrop pool for all active participants.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-6 lg:px-8 py-12">
        <div className="glass-card glass-card-glow text-center py-16">
          <div className="w-8 h-8 border-2 border-[#A9FF00]/30 border-t-[#A9FF00] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-[#8B8FA3]">Loading your referral dashboard...</p>
        </div>
      </div>
    );
  }

  const code = stats?.code ?? "—";
  const link = stats?.referral_link ?? `https://bondit.lol?ref=${code}`;
  const pendingSol = lamportsToSol(stats?.pending_balance_lamports ?? "0", 4);
  const totalSol = lamportsToSol(stats?.total_earned_lamports ?? "0", 4);
  const earned24h = lamportsToSol(stats?.earned_24h_lamports ?? "0", 4);
  const earned7d = lamportsToSol(stats?.earned_7d_lamports ?? "0", 4);

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="font-display text-[22px] font-bold text-[#F1F1F4]">Referral Dashboard</h1>
        <span className="badge badge-green">Active</span>
      </div>

      {/* Referral Link Section */}
      <div className="glass-card glass-card-glow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
          <h2 className="text-[14px] font-semibold text-[#F1F1F4]">Your Referral Link</h2>
        </div>

        {/* Link display */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] font-mono text-[13px] text-[#A9FF00] truncate">
            {link}
          </div>
          <CopyButton text={link} />
        </div>

        {/* Code display */}
        <div className="flex items-center gap-4 text-[11px] text-[#8B8FA3]">
          <span>Code: <strong className="text-[#F1F1F4] font-mono">{code}</strong></span>
          <span className="h-3 w-px bg-white/[0.06]" />
          <span>Share via: <strong className="text-[#F1F1F4]">bondit.lol?ref={code}</strong></span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Pending Balance"
          value={`${pendingSol} SOL`}
          sub="Available for payout"
          accent
        />
        <StatCard
          label="Total Earned"
          value={`${totalSol} SOL`}
          sub="All time"
        />
        <StatCard
          label="Referrals"
          value={String(stats?.total_referrals ?? 0)}
          sub={`${stats?.active_referees ?? 0} active traders`}
        />
        <StatCard
          label="Trades Referred"
          value={String(stats?.total_trades_referred ?? 0)}
          sub={`${earned24h} SOL (24h)`}
        />
      </div>

      {/* Timeframe earnings */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#56566A]">24h Earnings</span>
          <div className="text-[18px] font-display font-bold text-[#A9FF00] mt-1">{earned24h} SOL</div>
        </div>
        <div className="glass-card">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#56566A]">7d Earnings</span>
          <div className="text-[18px] font-display font-bold text-[#F1F1F4] mt-1">{earned7d} SOL</div>
        </div>
      </div>

      {/* Fee Split Explainer */}
      <div className="glass-card mb-6">
        <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-3">How Your Earnings Work</h3>
        <div className="space-y-2">
          {[
            { label: "Total Protocol Fee", value: "2% on every trade", color: "#F1F1F4" },
            { label: "Referral Pool", value: "10% of fees → referral vault", color: "#A9FF00" },
            { label: "Your Direct Cut", value: "50% of pool (5% of fees)", color: "#A9FF00" },
            { label: "2nd-Degree Cut", value: "15% of pool (1.5% of fees)", color: "#06B6D4" },
            { label: "Airdrop Pool", value: "35% of unclaimed", color: "#A78BFA" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between text-[11px]">
              <span className="text-[#8B8FA3]">{r.label}</span>
              <span className="font-mono" style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings History */}
      <div className="glass-card">
        <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-4">Recent Earnings</h3>
        {earnings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-[#8B8FA3]">No earnings yet. Share your referral link to start earning!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px] text-[9px] font-mono uppercase tracking-wider text-[#56566A] px-2 pb-2 border-b border-white/[0.04]">
              <span>Referee</span>
              <span className="text-right">Tier</span>
              <span className="text-right">Fee</span>
              <span className="text-right">Earned</span>
            </div>
            {earnings.map((e, i) => (
              <div
                key={`${e.trade_tx}-${i}`}
                className={`grid grid-cols-[1fr_80px_80px_80px] text-[11px] items-center px-2 py-1.5 rounded-md ${
                  i % 2 === 0 ? "bg-white/[0.01]" : ""
                }`}
              >
                <span className="font-mono text-[#8B8FA3] truncate pr-2">
                  {e.referee_wallet.slice(0, 4)}...{e.referee_wallet.slice(-4)}
                </span>
                <span className={`text-right font-mono ${e.tier === 1 ? "text-[#A9FF00]" : "text-[#06B6D4]"}`}>
                  {e.tier === 1 ? "Direct" : "2nd°"}
                </span>
                <span className="text-right font-mono text-[#8B8FA3]">
                  {lamportsToSol(e.fee_lamports, 4)}
                </span>
                <span className="text-right font-mono text-[#A9FF00] font-semibold">
                  +{lamportsToSol(e.earned_lamports, 4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
