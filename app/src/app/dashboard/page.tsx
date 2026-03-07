import {
  getLaunchCharter,
  getLaunchDashboard,
  getLaunchLiquidity,
  getLaunchTreasury,
  getLaunches,
} from "@/lib/api";
import type {
  LaunchCharterResponse,
  LaunchDashboardResponse,
  LaunchLiquidityStatsResponse,
  LaunchListItem,
  LaunchStatusLabel,
  LaunchTreasuryResponse,
  PolicyActionLog,
} from "@bondit/sdk/api";

function getLoadFailureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatCount(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString();
}

function formatBpsPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${(value / 100).toFixed(2)}%`;
}

function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatRelativeTime(timestamp?: number | null): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) return "—";

  const normalized = timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
  const deltaMs = Math.max(0, Date.now() - normalized);
  const deltaHours = Math.floor(deltaMs / 3_600_000);

  if (deltaHours < 1) {
    const deltaMinutes = Math.max(1, Math.floor(deltaMs / 60_000));
    return `${deltaMinutes}m ago`;
  }

  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  return `${Math.floor(deltaHours / 24)}d ago`;
}

function shortenSignature(value?: string | null): string {
  if (!value) return "—";
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getStatusAccent(status?: LaunchStatusLabel | null): string {
  if (status === "FlightMode") return "accent-blue";
  if (status === "Stewarding") return "accent-violet";
  if (status === "CurveActive") return "accent-green";
  return "text-[#1A1D2E]";
}

function getStatusBadgeClass(status?: LaunchStatusLabel | null): string {
  if (status === "FlightMode") return "badge badge-blue";
  if (status === "Stewarding") return "badge badge-violet";
  if (status === "CurveActive") return "badge badge-green";
  return "badge";
}

async function loadDashboardState(): Promise<{
  activeLaunch: LaunchListItem | null;
  dashboard: LaunchDashboardResponse | null;
  charter: LaunchCharterResponse | null;
  treasury: LaunchTreasuryResponse | null;
  liquidity: LaunchLiquidityStatsResponse | null;
  notices: string[];
  launchError: string | null;
}> {
  let activeLaunch: LaunchListItem | null = null;
  let dashboard: LaunchDashboardResponse | null = null;
  let charter: LaunchCharterResponse | null = null;
  let treasury: LaunchTreasuryResponse | null = null;
  let liquidity: LaunchLiquidityStatsResponse | null = null;
  const notices: string[] = [];
  let launchError: string | null = null;

  try {
    const response = await getLaunches();
    activeLaunch = [...response.launches].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;

    if (!activeLaunch) {
      notices.push("No indexed launches are available yet.");
      return { activeLaunch, dashboard, charter, treasury, liquidity, notices, launchError };
    }
  } catch (error) {
    launchError = getLoadFailureMessage(error, "Unable to load indexed launches.");
    return { activeLaunch, dashboard, charter, treasury, liquidity, notices, launchError };
  }

  const [dashboardResult, charterResult, treasuryResult, liquidityResult] = await Promise.allSettled([
    getLaunchDashboard(activeLaunch.launchId),
    getLaunchCharter(activeLaunch.launchId),
    getLaunchTreasury(activeLaunch.launchId),
    getLaunchLiquidity(activeLaunch.launchId),
  ]);

  if (dashboardResult.status === "fulfilled") {
    dashboard = dashboardResult.value;
  } else {
    notices.push(getLoadFailureMessage(dashboardResult.reason, "Dashboard metrics are temporarily unavailable."));
  }

  if (charterResult.status === "fulfilled") {
    charter = charterResult.value;
  } else {
    notices.push(getLoadFailureMessage(charterResult.reason, "Charter snapshot is temporarily unavailable."));
  }

  if (treasuryResult.status === "fulfilled") {
    treasury = treasuryResult.value;
  } else {
    notices.push(getLoadFailureMessage(treasuryResult.reason, "Treasury snapshot is temporarily unavailable."));
  }

  if (liquidityResult.status === "fulfilled") {
    liquidity = liquidityResult.value;
  } else {
    notices.push(getLoadFailureMessage(liquidityResult.reason, "Liquidity metrics are temporarily unavailable."));
  }

  return { activeLaunch, dashboard, charter, treasury, liquidity, notices, launchError };
}

export default async function Dashboard() {
  const { activeLaunch, dashboard, charter, treasury, liquidity, notices, launchError } = await loadDashboardState();

  if (!activeLaunch) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1A1D2E]">Agency Dashboard</h1>
            <p className="text-[13px] text-[#9DA3C0] mt-1">Waiting on indexed stewardship data</p>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-3">No indexed launch available</h2>
          <p className="text-[13px] text-[#5A607F]">The dashboard now renders live indexer data only. Once a launch is indexed, this page will show its stewardship metrics here.</p>
          {launchError ? <div className="mt-4 text-[12px] text-[#C65F65] font-medium">{launchError}</div> : null}
        </div>

        <footer className="py-8 mt-10 border-t border-black/[0.04] text-center">
          <p className="text-[11px] text-[#9DA3C0]">All actions on-chain · Charter immutable · Independently verifiable</p>
        </footer>
      </div>
    );
  }

  const status = dashboard?.status ?? activeLaunch.status;
  const curve = dashboard?.curve ?? null;
  const stewardship = dashboard?.stewardship ?? null;
  const flight = dashboard?.flight ?? null;
  const fees = dashboard?.fees ?? null;
  const recentActions = dashboard?.recentActions ?? [];
  const holdersCount = stewardship?.holdersCount ?? activeLaunch.holdersCount ?? null;
  const top10ConcentrationBps = stewardship?.top10ConcentrationBps ?? activeLaunch.top10ConcentrationBps ?? null;
  const treasuryRemainingPct = treasury?.remainingPct ?? stewardship?.treasuryRemainingPct ?? null;
  const dayNumber = stewardship?.dayNumber ?? null;
  const graduationProgress = curve?.graduationProgress ?? (status === "CurveActive" ? 0 : 100);
  const daysRemaining = flight ? Math.max(0, flight.conditions.maxDays - flight.conditions.daysSinceGraduation) : null;

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1D2E]">Agency Dashboard</h1>
          <p className="text-[13px] text-[#9DA3C0] mt-1">${activeLaunch.symbol} — Live stewardship transparency for the latest indexed launch</p>
        </div>
        <div className="flex gap-2">
          <span className="glass-input px-3 py-1.5 text-[12px] text-[#5A607F]">{dayNumber ? `Day ${dayNumber}` : "Day —"}</span>
          <span className={`${getStatusBadgeClass(status)} !px-3 !py-1.5 !text-[12px]`}>{status}</span>
        </div>
      </div>

      {launchError || notices.length ? (
        <div className="glass-card mb-6 !py-4">
          {launchError ? <div className="text-[12px] text-[#C65F65] font-medium mb-2">{launchError}</div> : null}
          {notices.map((notice) => (
            <div key={notice} className="text-[12px] text-[#5A607F] leading-relaxed">{notice}</div>
          ))}
        </div>
      ) : null}

      {/* ═══ Stat row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Status", value: status, accent: getStatusAccent(status) },
          { label: "Day", value: dayNumber ? String(dayNumber) : "—", accent: "" },
          { label: "Holders", value: formatCount(holdersCount), accent: "accent-blue" },
          { label: "Top-10", value: formatBpsPercent(top10ConcentrationBps), accent: "" },
          { label: "Treasury", value: formatPercent(treasuryRemainingPct), accent: treasuryRemainingPct !== null && treasuryRemainingPct > 5 ? "accent-red" : "accent-green" },
        ].map((s) => (
          <div key={s.label} className="glass-card text-center !py-4">
            <div className="stat-label mb-1">{s.label}</div>
            <div className={`text-xl font-bold font-mono ${s.accent || "text-[#1A1D2E]"}`}>{s.value}</div>
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
              <span className="text-[13px] font-mono text-[#1A1D2E]">{curve ? `${curve.raisedSol} raised` : "—"}</span>
            </div>
            <div className="progress-glass !h-3">
              <div className={curve?.isGraduated ? "progress-fill-green" : "progress-fill-gradient"} style={{ width: `${Math.min(graduationProgress, 100)}%`, height: "100%", borderRadius: "100px" }} />
            </div>
            <div className="text-right mt-1.5">
              <span className="text-[11px] accent-violet font-mono font-semibold">{curve?.isGraduated ? "Graduated" : `${graduationProgress.toFixed(1)}% to graduation`}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 pt-5 mt-5 border-t border-black/[0.06]">
            <div>
              <div className="stat-label">Tokens Sold</div>
              <div className="text-lg font-mono font-bold text-[#1A1D2E] mt-1">{curve?.tokensSold ?? "—"}</div>
            </div>
            <div>
              <div className="stat-label">Current Price</div>
              <div className="text-lg font-mono font-bold accent-blue mt-1">{curve?.currentPrice ?? activeLaunch.priceUsd ?? "—"}</div>
            </div>
            <div>
              <div className="stat-label">Indexed Actions</div>
              <div className="text-lg font-mono font-bold text-[#1A1D2E] mt-1">{recentActions.length.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Charter */}
        <div className="glass-card">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E] mb-4">Agency Charter</h2>
          <div className="space-y-2.5">
            {[
              { l: "Daily Release", v: charter ? formatBpsPercent(charter.charter.dailyReleaseRateBps) : "—" },
              { l: "Max Daily", v: charter?.charter.maxDailyRelease ?? "—" },
              { l: "Max Weekly", v: charter?.charter.maxWeeklyRelease ?? "—" },
              { l: "Fee Split", v: charter ? `${charter.charter.feeSplitLpBps / 100}% LP / ${charter.charter.feeSplitHouseBps / 100}% House / ${charter.charter.feeSplitReferralBps / 100}% Ref` : "—" },
              { l: "Flight Holders", v: charter ? charter.charter.flightHoldersThreshold.toLocaleString() : "—" },
              { l: "Flight Top-10", v: charter ? `≤ ${formatBpsPercent(charter.charter.flightTop10ConcentrationBps)}` : "—" },
              { l: "Flight Treasury", v: charter ? `≤ ${formatBpsPercent(charter.charter.flightTreasuryRemainingBps)}` : "—" },
              { l: "Max Duration", v: charter ? `${Math.round(charter.charter.maxStewardshipDuration / 86400)} days` : "—" },
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
            <div className="text-4xl font-bold font-mono accent-red">{formatPercent(treasury?.remainingPct ?? null)}</div>
            <div className="text-[12px] text-[#9DA3C0] mt-1">{treasury ? `${treasury.remaining} remaining` : "Awaiting treasury snapshot"}</div>
          </div>
          <div className="space-y-2.5">
            {[
              { l: "Released Today", v: treasury?.releasedToday ?? "—" },
              { l: "This Week", v: treasury?.releasedThisWeek ?? "—" },
              { l: "Total Released", v: treasury?.totalReleased ?? "—" },
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
            <div className="text-4xl font-bold font-mono accent-blue">{liquidity?.lpDepthUsd ?? stewardship?.lpDepthUsd ?? activeLaunch.lpDepthUsd ?? "—"}</div>
            <div className="text-[12px] text-[#9DA3C0] mt-1">{liquidity ? `active on ${liquidity.venue}` : "Awaiting liquidity snapshot"}</div>
          </div>
          <div className="space-y-2.5">
            {[
              { l: "Fees Harvested", v: liquidity?.totalFeesHarvested ?? fees?.totalFeesCollected ?? "—" },
              { l: "LP Compounded", v: fees ? `${fees.lpFeesCompounded} (${fees.feeSplitLp}% )` : liquidity?.totalCompounded ?? "—" },
              { l: "House Collected", v: fees ? `${fees.houseFeesCollected} (${fees.feeSplitHouse}% )` : "—" },
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
            <FlightBar
              label="Holders"
              current={flight?.conditions.holdersCount ?? 0}
              target={flight?.conditions.holdersTarget ?? 1}
              display={flight ? `${formatCount(flight.conditions.holdersCount)} / ${formatCount(flight.conditions.holdersTarget)}` : "—"}
            />
            <FlightBar
              label="Top-10"
              current={flight?.conditions.top10ConcentrationBps ?? 0}
              target={flight?.conditions.top10Target ?? 1}
              display={flight ? `${formatBpsPercent(flight.conditions.top10ConcentrationBps)} → ≤ ${formatBpsPercent(flight.conditions.top10Target)}` : "—"}
              inverted
            />
            <FlightBar
              label="Treasury"
              current={flight?.conditions.treasuryRemainingBps ?? 0}
              target={flight?.conditions.treasuryTarget ?? 1}
              display={flight ? `${formatBpsPercent(flight.conditions.treasuryRemainingBps)} → ≤ ${formatBpsPercent(flight.conditions.treasuryTarget)}` : "—"}
              inverted
            />
          </div>
          <div className="mt-4 pt-3 border-t border-black/[0.06] flex justify-between text-[12px]">
            <span className="text-[#9DA3C0]">Failsafe</span>
            <span className="font-mono accent-violet font-semibold">{flight?.conditions.forcedSunset ? "Forced sunset" : daysRemaining !== null ? `${daysRemaining} days` : "—"}</span>
          </div>
        </div>
      </div>

      {/* ═══ Policy Actions Log ═══ */}
      <div className="glass-card mt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[15px] font-semibold text-[#1A1D2E]">Policy Actions</h2>
          <span className="text-[11px] text-[#9DA3C0] font-mono">{recentActions.length.toLocaleString()} indexed actions</span>
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
              {recentActions.length ? recentActions.map((row: PolicyActionLog) => (
                <tr key={row.index} className="border-b border-black/[0.03] hover:bg-black/[0.015] transition-colors">
                  <td className="py-3 font-mono text-[#9DA3C0]">{row.index}</td>
                  <td className="py-3 font-medium text-[#1A1D2E]">{row.type}</td>
                  <td className="py-3 text-[#5A607F]">{row.description}</td>
                  <td className="py-3 text-[#9DA3C0]">{formatRelativeTime(row.timestamp)}</td>
                  <td className="py-3 text-right">
                    <span className="font-mono accent-violet text-[11px] cursor-pointer hover:underline">{shortenSignature(row.txSignature)}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#9DA3C0]">No policy actions have been indexed for this launch yet.</td>
                </tr>
              )}
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
  const pct = Math.min(
    100,
    Math.max(
      0,
      inverted
        ? current <= 0
          ? 100
          : (target / current) * 100
        : target <= 0
          ? 0
          : (current / target) * 100,
    ),
  );
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[12px] text-[#9DA3C0]">{label}</span>
        <span className="text-[11px] font-mono text-[#5A607F]">{display}</span>
      </div>
      <div className="progress-glass">
        <div
          className={`progress-fill-gradient ${inverted ? "progress-fill-warn" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
