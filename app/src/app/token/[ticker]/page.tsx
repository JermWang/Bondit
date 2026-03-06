import { notFound } from "next/navigation";
import { getAvatarStyle } from "@/lib/discovery";
import { loadTokenDetail } from "@/lib/discovery-service";

function getBadge(type: string | null) {
  switch (type) {
    case "graduated":
      return <span className="badge badge-green">Graduated</span>;
    case "graduating":
      return <span className="badge badge-lime">Graduating</span>;
    case "flight":
      return <span className="badge badge-blue">Flight Mode</span>;
    default:
      return null;
  }
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass-card glass-card-glow !p-4">
      <div className="stat-label mb-1.5">{label}</div>
      <div className={`text-lg font-bold font-mono ${accent ?? "text-[#F1F1F4]"}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] gap-4">
      <span className="text-[#8B8FA3]">{label}</span>
      <span className={`font-mono text-right ${accent ?? "text-[#F1F1F4]"}`}>{value}</span>
    </div>
  );
}

export default async function TokenDetailPage({ params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker);
  const detail = await loadTokenDetail(ticker);

  if (!detail) {
    notFound();
  }

  const { token, dashboard, charter, liquidity, flight, fees, report, source, notice } = detail;

  const flightConditions = flight?.conditions;
  const charterRows = charter?.charter
    ? [
        { label: "Daily Release", value: `${(charter.charter.dailyReleaseRateBps / 100).toFixed(2)}% remaining` },
        { label: "Max Daily", value: charter.charter.maxDailyRelease },
        { label: "Max Weekly", value: charter.charter.maxWeeklyRelease },
        { label: "Fee Split", value: `${charter.charter.feeSplitLpBps / 100}% LP / ${charter.charter.feeSplitHouseBps / 100}% House` },
        { label: "Flight Holders", value: charter.charter.flightHoldersThreshold.toLocaleString() },
        { label: "Flight Top-10", value: `≤ ${charter.charter.flightTop10ConcentrationBps / 100}%` },
        { label: "Flight Treasury", value: `≤ ${charter.charter.flightTreasuryRemainingBps / 100}%` },
        { label: "Max Duration", value: `${Math.round(charter.charter.maxStewardshipDuration / 86400)} days` },
      ]
    : [
        { label: "Daily Release", value: "0.20% remaining" },
        { label: "Max Daily", value: "1,000,000" },
        { label: "Max Weekly", value: "5,000,000" },
        { label: "Fee Split", value: "99% LP / 1% House" },
        { label: "Flight Holders", value: "15,000" },
        { label: "Flight Top-10", value: "≤ 18%" },
        { label: "Flight Treasury", value: "≤ 5%" },
        { label: "Max Duration", value: "180 days" },
      ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
      {/* ═══ HERO — Image-dominant banner ═══ */}
      <div className="glass !rounded-2xl !p-0 overflow-hidden mb-6">
        {/* Large visual banner */}
        <div className="relative h-[200px] sm:h-[240px] overflow-hidden">
          <div className="absolute inset-0" style={getAvatarStyle(token.avatar)} />
          {token.img ? (
            <img src={token.img} alt={token.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[72px] sm:text-[96px] font-display font-extrabold text-[#F1F1F4]/80 drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] select-none">
                {token.ticker.slice(0, 4)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/50 to-transparent" />
          {/* Top overlays */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {getBadge(token.badgeType)}
            <span className={`badge ${source === "live" ? "badge-green" : "badge-yellow"}`}>{source === "live" ? "Live" : "Fixture"}</span>
          </div>
          <div className="absolute top-4 right-4">
            <span className={`text-[13px] font-mono font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm ${token.up ? "text-[#00FFB2] bg-[#00FFB2]/10" : "text-[#FF3B5C] bg-[#FF3B5C]/10"}`}>
              {token.change}
            </span>
          </div>
        </div>

        {/* Info strip below the banner */}
        <div className="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-[#F1F1F4]">{token.name}</h1>
              <span className="text-[13px] font-mono font-semibold text-[#A9FF00]">${token.ticker}</span>
            </div>
            <div className="flex items-center gap-2 mb-2 text-[12px]">
              <span className="text-[#8B8FA3]">by {token.creator}</span>
            </div>
            <p className="text-[12px] text-[#8B8FA3] leading-relaxed max-w-2xl line-clamp-2">{token.desc}</p>
          </div>

          <div className="min-w-[220px] flex-shrink-0">
            <div className="glass !rounded-xl px-4 py-3">
              <div className="flex items-center justify-between text-[12px] mb-2">
                <span className="text-[#8B8FA3]">Graduation</span>
                <span className="font-mono text-[#F1F1F4] font-semibold">{Math.min(token.grad, 100)}%</span>
              </div>
              <div className="progress-glass !h-[5px]">
                <div
                  className={`${token.grad >= 100 ? "progress-fill-green" : "progress-fill-gradient"} !h-[5px]`}
                  style={{ width: `${Math.min(token.grad, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="glass !rounded-xl px-4 py-3 text-[12px] text-[#8B8FA3] mb-6">
          {notice}
        </div>
      )}

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Market Cap" value={token.mcap} />
        <MetricCard label="24h Volume" value={token.vol} />
        <MetricCard label="Holders" value={token.holders.toLocaleString()} accent="accent-blue" />
        <MetricCard label="Replies" value={token.replies.toLocaleString()} accent="accent-lime" />
      </div>

      {/* ═══ THREE-PANEL DETAIL ROW ═══ */}
      <div className="grid xl:grid-cols-3 gap-5 mb-6">
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
            Launch Telemetry
          </h2>
          <div className="space-y-3">
            <DetailRow label="Status" value={dashboard?.status ?? (token.grad >= 100 ? "Stewarding" : "CurveActive")} accent="accent-lime" />
            <DetailRow label="Raised SOL" value={dashboard?.curve.raisedSol ?? "—"} />
            <DetailRow label="Current Price" value={dashboard?.curve.currentPrice ?? "—"} accent="accent-blue" />
            <DetailRow label="Treasury Remaining" value={dashboard ? `${dashboard.stewardship.treasuryRemainingPct}%` : "—"} />
            <DetailRow label="LP Depth" value={dashboard?.stewardship.lpDepthUsd ?? token.mcap} />
            <DetailRow label="Top-10 Concentration" value={dashboard ? `${dashboard.stewardship.top10ConcentrationBps / 100}%` : "—"} />
          </div>
        </div>

        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
            Charter Snapshot
          </h2>
          <div className="space-y-3">
            {charterRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
            Flight Mode Readiness
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-[#8B8FA3]">Holders</span>
                <span className="font-mono text-[#F1F1F4]">{token.holders.toLocaleString()} / {(flightConditions?.holdersTarget ?? 15000).toLocaleString()}</span>
              </div>
              <div className="progress-glass">
                <div className="progress-fill-gradient" style={{ width: `${Math.min(100, (token.holders / (flightConditions?.holdersTarget ?? 15000)) * 100)}%` }} />
              </div>
            </div>
            <DetailRow label="Eligible" value={flight?.eligible ? "Yes" : "Not yet"} accent={flight?.eligible ? "accent-green" : "accent-red"} />
            <DetailRow label="Top-10" value={flightConditions ? `${flightConditions.top10ConcentrationBps / 100}%` : "—"} />
            <DetailRow label="Treasury" value={flightConditions ? `${flightConditions.treasuryRemainingBps / 100}%` : "—"} />
            <DetailRow label="Forced Sunset" value={flightConditions?.forcedSunset ? "Active" : "Inactive"} accent={flightConditions?.forcedSunset ? "accent-red" : undefined} />
          </div>
        </div>
      </div>

      {/* ═══ TWO-PANEL ROW ═══ */}
      <div className="grid xl:grid-cols-2 gap-5 mb-6">
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
            Liquidity + Fees
          </h2>
          <div className="space-y-3">
            <DetailRow label="Venue" value={liquidity?.venue ?? "Meteora DLMM"} />
            <DetailRow label="LP Depth" value={liquidity?.lpDepthUsd ?? "—"} accent="accent-blue" />
            <DetailRow label="Depth ±2%" value={liquidity?.depth2Pct ?? "—"} />
            <DetailRow label="Depth ±5%" value={liquidity?.depth5Pct ?? "—"} />
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-1" />
            <DetailRow label="Total Fees" value={fees?.totalFeesCollected ?? "—"} />
            <DetailRow label="LP Compounded" value={fees?.lpFeesCompounded ?? liquidity?.totalCompounded ?? "—"} accent="accent-green" />
            <DetailRow label="House Fees" value={fees?.houseFeesCollected ?? "—"} />
          </div>
        </div>

        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
            AI Daily Summary
          </h2>
          {report ? (
            <div className="space-y-3">
              <DetailRow label="Status" value={report.summary.status} accent="accent-lime" />
              <DetailRow label="Day Number" value={report.summary.dayNumber.toString()} />
              <DetailRow label="Holders" value={report.summary.holdersCount.toLocaleString()} />
              <DetailRow label="24h Volume" value={report.summary.volume24h} />
              <DetailRow label="Treasury Remaining" value={`${report.treasury.remainingPct}%`} />
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-1" />
              <p className="text-[11px] text-[#8B8FA3] leading-relaxed italic">
                {report.disclaimer}
              </p>
            </div>
          ) : (
            <div className="text-[12px] text-[#8B8FA3] leading-relaxed">
              AI summary will populate here once the advisory service is connected to indexed launch data.
            </div>
          )}
        </div>
      </div>

      {/* ═══ POLICY ACTIONS ═══ */}
      <div className="glass-card glass-card-glow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
            Recent Policy Actions
          </h2>
          <span className="text-[11px] text-[#8B8FA3] font-mono">{dashboard?.recentActions.length ?? 0} events</span>
        </div>
        {dashboard?.recentActions.length ? (
          <div className="space-y-3">
            {dashboard.recentActions.map((action) => (
              <div key={`${action.index}-${action.txSignature}`} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-[13px] font-medium text-[#F1F1F4]">{action.type}</div>
                  <div className="text-[12px] text-[#8B8FA3] mt-1">{action.description}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px] font-mono text-[#8B8FA3]">#{action.index}</div>
                  <div className="text-[11px] font-mono text-[#A9FF00] mt-1">{action.txSignature}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-[#8B8FA3]">Policy actions will appear here once the indexer is decoding and persisting execution events.</div>
        )}
      </div>
    </div>
  );
}
