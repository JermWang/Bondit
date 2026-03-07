"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  askLaunchQuestion,
  getLaunchCharter,
  getLaunchDashboard,
  getLaunchFees,
  getLaunchFlightStatus,
  getLaunchLiquidity,
  getLaunchTreasury,
  getLaunches,
} from "@/lib/api";
import { getAvatarStyle } from "@/lib/discovery";
import type {
  LaunchCharterResponse,
  LaunchDashboardResponse,
  LaunchFeeBreakdownResponse,
  LaunchFlightStatusResponse,
  LaunchLiquidityStatsResponse,
  LaunchListItem,
  LaunchTreasuryResponse,
} from "@bondit/sdk/api";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

interface LaunchDetailState {
  dashboard: LaunchDashboardResponse | null;
  charter: LaunchCharterResponse | null;
  treasury: LaunchTreasuryResponse | null;
  liquidity: LaunchLiquidityStatsResponse | null;
  flight: LaunchFlightStatusResponse | null;
  fees: LaunchFeeBreakdownResponse | null;
  notice: string | null;
}

const SUGGESTED_PROMPTS = [
  "What's the treasury status?",
  "How close to flight mode?",
  "Analyze holder concentration",
  "Explain the charter",
  "Show graduation progress",
  "Liquidity and fee breakdown",
];

function buildWelcomeMessage(tokenName?: string, tokenTicker?: string): string {
  if (!tokenName || !tokenTicker) {
    return "Welcome to the BondIt Copilot. Select an indexed launch above to inspect its charter, treasury, liquidity, and flight mode readiness.\n\nAdvisory only — I never execute trades or modify on-chain state.";
  }

  return `Switched context to **${tokenName}** ($${tokenTicker}). I'm now grounded on its indexed launch metrics, charter state, treasury snapshots, and stewardship telemetry.\n\nWhat would you like to know?`;
}

function shortenAddress(value: string): string {
  if (!value || value.length < 10) return value || "unknown";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatSignedPercent(value?: number | null): string {
  const safeValue = value ?? 0;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(1)}%`;
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass !rounded-xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-[#8B8FA3] mb-1">{label}</div>
      <div className={`text-[15px] font-bold font-mono ${accent ?? "text-[#F1F1F4]"}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-[#8B8FA3]">{label}</span>
      <span className={`font-mono ${accent ?? "text-[#F1F1F4]"}`}>{value}</span>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${isUser ? "bg-[#A9FF00]/20 text-[#A9FF00]" : "bg-white/[0.05] text-[#8B8FA3]"}`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${isUser ? "bg-[#A9FF00]/15 text-[#F1F1F4] rounded-tr-sm border border-[#A9FF00]/20" : "bg-white/[0.06] text-[#F1F1F4] rounded-tl-sm border border-white/[0.08]"}`}>
        {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={index} className="text-[#A9FF00] font-semibold">{part.slice(2, -2)}</strong>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [launches, setLaunches] = useState<LaunchListItem[]>([]);
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LaunchDetailState | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: buildWelcomeMessage(),
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedIndex = useMemo(
    () => launches.findIndex((launch) => launch.launchId === selectedLaunchId),
    [launches, selectedLaunchId],
  );
  const selectedLaunch = selectedIndex >= 0 ? launches[selectedIndex] : null;
  const avatarIndex = selectedIndex >= 0 ? selectedIndex % 8 : 0;
  const graduationProgress = detail?.dashboard?.curve.graduationProgress ?? (selectedLaunch?.status === "CurveActive" ? 0 : selectedLaunch ? 100 : 0);
  const holdersCount = detail?.dashboard?.stewardship.holdersCount ?? selectedLaunch?.holdersCount ?? 0;
  const repliesCount = selectedLaunch?.repliesCount ?? 0;
  const charter = detail?.charter?.charter ?? null;
  const flightConditions = detail?.flight?.conditions ?? null;
  const treasury = detail?.treasury ?? null;
  const liquidity = detail?.liquidity ?? null;
  const fees = detail?.fees ?? null;
  const gradColor = graduationProgress >= 100 ? "text-[#00FFB2]" : graduationProgress >= 75 ? "text-[#A9FF00]" : "text-[#F59E0B]";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    let cancelled = false;

    async function syncLaunches() {
      setIsLoadingLaunches(true);
      setLaunchError(null);

      try {
        const response = await getLaunches();
        if (cancelled) return;

        setLaunches(response.launches);

        if (!response.launches.length) {
          setSelectedLaunchId(null);
          setMessages([
            {
              id: Date.now(),
              role: "assistant",
              content: "No indexed launches are available yet. Once the indexer has launch records, you can inspect them here and ask the Copilot grounded questions.",
              ts: new Date(),
            },
          ]);
          return;
        }

        setSelectedLaunchId((current) => (
          current && response.launches.some((launch) => launch.launchId === current)
            ? current
            : response.launches[0].launchId
        ));
      } catch (error) {
        if (cancelled) return;
        setLaunchError(error instanceof Error ? error.message : "Unable to load indexed launches.");
        setLaunches([]);
        setSelectedLaunchId(null);
      } finally {
        if (!cancelled) {
          setIsLoadingLaunches(false);
        }
      }
    }

    void syncLaunches();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedLaunch) {
      setDetail(null);
      return;
    }

    const activeLaunch = selectedLaunch;

    let cancelled = false;

    async function syncDetail() {
      setIsLoadingDetail(true);

      const [dashboard, charterResponse, treasuryResponse, liquidityResponse, flightResponse, feesResponse] = await Promise.allSettled([
        getLaunchDashboard(activeLaunch.launchId),
        getLaunchCharter(activeLaunch.launchId),
        getLaunchTreasury(activeLaunch.launchId),
        getLaunchLiquidity(activeLaunch.launchId),
        getLaunchFlightStatus(activeLaunch.launchId),
        getLaunchFees(activeLaunch.launchId),
      ]);

      if (cancelled) return;

      const failures = [dashboard, charterResponse, treasuryResponse, liquidityResponse, flightResponse, feesResponse].filter((result) => result.status === "rejected").length;

      setDetail({
        dashboard: dashboard.status === "fulfilled" ? dashboard.value : null,
        charter: charterResponse.status === "fulfilled" ? charterResponse.value : null,
        treasury: treasuryResponse.status === "fulfilled" ? treasuryResponse.value : null,
        liquidity: liquidityResponse.status === "fulfilled" ? liquidityResponse.value : null,
        flight: flightResponse.status === "fulfilled" ? flightResponse.value : null,
        fees: feesResponse.status === "fulfilled" ? feesResponse.value : null,
        notice: failures > 0 ? "Some indexed detail panels are temporarily unavailable." : null,
      });
      setIsLoadingDetail(false);
    }

    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content: buildWelcomeMessage(activeLaunch.name, activeLaunch.symbol),
        ts: new Date(),
      },
    ]);
    setInput("");
    void syncDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedLaunch]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !selectedLaunchId || !selectedLaunch) return;

    setInput("");
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content, ts: new Date() }]);
    setIsTyping(true);

    try {
      const response = await askLaunchQuestion(selectedLaunchId, content);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `${response.answer}\n\n${response.disclaimer}`,
          ts: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `I couldn't reach the advisory service for **${selectedLaunch.name}** right now. ${error instanceof Error ? error.message : "Please try again in a moment."}`,
          ts: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="glass !rounded-xl px-4 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] flex-shrink-0">Context</span>
          <div className="w-px h-4 bg-white/[0.05] flex-shrink-0" />
          {isLoadingLaunches ? <span className="text-[12px] text-[#8B8FA3]">Loading indexed launches…</span> : null}
          {!isLoadingLaunches && !launches.length ? <span className="text-[12px] text-[#8B8FA3]">No indexed launches available.</span> : null}
          {launches.map((launch, index) => (
            <button
              key={launch.launchId}
              onClick={() => setSelectedLaunchId(launch.launchId)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-all duration-200 ${launch.launchId === selectedLaunchId ? "bg-[#A9FF00]/15 text-[#A9FF00] border border-[#A9FF00]/25 shadow-[0_0_12px_rgba(169,255,0,0.15)]" : "text-[#8B8FA3] hover:text-[#F1F1F4] hover:bg-white/[0.05]"}`}
            >
              <div className="w-5 h-5 rounded-full" style={getAvatarStyle(index % 8)} />
              ${launch.symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide min-w-0">
          <div className="glass !rounded-xl !p-0 overflow-hidden flex-shrink-0">
            <div className="relative h-[120px] overflow-hidden">
              <div className="absolute inset-0" style={getAvatarStyle(avatarIndex)} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-end gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px] font-display font-bold text-[#F1F1F4]">{selectedLaunch?.name ?? "No Launch Selected"}</span>
                    <span className="text-[11px] font-mono text-[#A9FF00]">{selectedLaunch ? `$${selectedLaunch.symbol}` : "—"}</span>
                  </div>
                  <span className="text-[10px] text-[#8B8FA3]/70">by {selectedLaunch ? shortenAddress(selectedLaunch.creator) : "unknown"}</span>
                </div>
              </div>
              <div className="absolute bottom-3 right-4">
                <span className={`text-[12px] font-mono font-bold ${(selectedLaunch?.priceChange24hPct ?? 0) >= 0 ? "text-[#00FFB2]" : "text-[#FF3B5C]"}`}>
                  {selectedLaunch ? formatSignedPercent(selectedLaunch.priceChange24hPct) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <StatPill label="Market Cap" value={selectedLaunch?.marketCapUsd ?? "$—"} />
            <StatPill label="24h Volume" value={selectedLaunch?.volume24hUsd ?? "$—"} />
            <StatPill label="Holders" value={holdersCount.toLocaleString()} accent="text-[#3B82F6]" />
            <StatPill label="Replies" value={repliesCount.toLocaleString()} accent="text-[#A9FF00]" />
          </div>

          <div className="glass !rounded-xl p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00]">Graduation Progress</span>
              <span className={`text-[13px] font-mono font-bold ${gradColor}`}>{Math.min(graduationProgress, 100)}%</span>
            </div>
            <div className="progress-glass !h-[6px] mb-3">
              <div className={`h-full rounded-full transition-all duration-700 ${graduationProgress >= 100 ? "progress-fill-green" : "progress-fill-gradient"}`} style={{ width: `${Math.min(graduationProgress, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8B8FA3]">Target: 85 SOL</span>
              <span className="text-[#8B8FA3]">Status: <span className={`font-mono ${selectedLaunch?.status === "FlightMode" ? "text-[#3B82F6]" : selectedLaunch?.status === "Stewarding" ? "text-[#00FFB2]" : graduationProgress >= 75 ? "text-[#A9FF00]" : "text-[#F59E0B]"}`}>{selectedLaunch?.status ?? "—"}</span></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="glass !rounded-xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_4px_rgba(167,139,250,0.5)]" />
                Charter
              </div>
              <DetailRow label="Daily Release" value={charter ? `${(charter.dailyReleaseRateBps / 100).toFixed(2)}%` : "—"} />
              <DetailRow label="Fee Split" value={charter ? `${charter.feeSplitLpBps / 100}% LP / ${charter.feeSplitHouseBps / 100}% House / ${charter.feeSplitReferralBps / 100}% Ref` : "—"} />
              <DetailRow label="Max Duration" value={charter ? `${Math.round(charter.maxStewardshipDuration / 86400)} days` : "—"} />
              <DetailRow label="Daily Cap" value={charter?.maxDailyRelease ?? "—"} />
              <DetailRow label="Weekly Cap" value={charter?.maxWeeklyRelease ?? "—"} />
            </div>
            <div className="glass !rounded-xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] shadow-[0_0_4px_rgba(0,255,178,0.5)]" />
                Flight Conditions
              </div>
              <DetailRow label="Holders" value={flightConditions ? `${flightConditions.holdersCount.toLocaleString()} / ${flightConditions.holdersTarget.toLocaleString()}` : "—"} accent={flightConditions?.holdersOk ? "text-[#00FFB2]" : "text-[#F59E0B]"} />
              <DetailRow label="Top-10 Conc." value={flightConditions ? `${(flightConditions.top10ConcentrationBps / 100).toFixed(2)}%` : "—"} accent={flightConditions?.concentrationOk ? "text-[#00FFB2]" : "text-[#FF3B5C]"} />
              <DetailRow label="Treasury Left" value={flightConditions ? `${(flightConditions.treasuryRemainingBps / 100).toFixed(2)}%` : "—"} accent={flightConditions?.treasuryOk ? "text-[#00FFB2]" : "text-[#FF3B5C]"} />
              <DetailRow label="Days Active" value={flightConditions ? `${flightConditions.daysSinceGraduation} / ${flightConditions.maxDays}` : "—"} />
            </div>
          </div>

          <div className="glass !rounded-xl p-4 flex-shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
              Treasury Snapshot
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Remaining", value: treasury?.remaining ?? "—", sub: treasury ? `${treasury.remainingPct.toFixed(2)}% remaining` : "Awaiting treasury snapshot" },
                { label: "Released Today", value: treasury?.releasedToday ?? "—", sub: treasury ? `This week: ${treasury.releasedThisWeek}` : "Awaiting treasury snapshot" },
                { label: "Total Released", value: treasury?.totalReleased ?? "—", sub: treasury?.releaseSchedule.length ? `${treasury.releaseSchedule.length} recent releases` : "No recent releases indexed" },
              ].map((item) => (
                <div key={item.label} className="bg-white/[0.02] rounded-lg p-3">
                  <div className="text-[10px] text-[#8B8FA3] mb-1">{item.label}</div>
                  <div className="text-[14px] font-bold font-mono text-[#A9FF00]">{item.value}</div>
                  <div className="text-[10px] text-[#8B8FA3] mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass !rounded-xl p-4 flex-shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
              Liquidity + Fees
            </div>
            <DetailRow label="Venue" value={liquidity?.venue ?? "—"} />
            <DetailRow label="LP Depth" value={liquidity?.lpDepthUsd ?? "—"} accent="text-[#3B82F6]" />
            <DetailRow label="LP Depth ±2%" value={liquidity?.depth2Pct ?? "—"} />
            <DetailRow label="LP Depth ±5%" value={liquidity?.depth5Pct ?? "—"} />
            <DetailRow label="Fees Compounded" value={fees?.lpFeesCompounded ?? liquidity?.totalCompounded ?? "—"} accent="text-[#00FFB2]" />
            <DetailRow label="House Fees" value={fees?.houseFeesCollected ?? "—"} />
          </div>

          {launchError || detail?.notice || isLoadingDetail ? (
            <div className="glass !rounded-xl px-4 py-3 text-[12px] text-[#8B8FA3] flex-shrink-0">
              {launchError ?? detail?.notice ?? "Loading indexed launch detail…"}
            </div>
          ) : null}
        </div>

        <div className="w-[380px] flex-shrink-0 flex flex-col glass !rounded-xl !p-0 overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#A9FF00] to-[#88CC00] flex items-center justify-center shadow-[0_0_10px_rgba(169,255,0,0.3)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#F1F1F4]">BondIt Copilot</div>
                <div className="text-[10px] text-[#8B8FA3]">Advisory only · no execution rights</div>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-[#00FFB2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] shadow-[0_0_6px_rgba(0,255,178,0.5)] animate-pulse-dot" />
              Online
            </span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4 min-h-0">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping ? (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-[11px] font-bold text-[#8B8FA3] flex-shrink-0">AI</div>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA3] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA3] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA3] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 ? (
            <div className="flex-shrink-0 px-4 pb-2">
              <div className="text-[10px] text-[#8B8FA3] mb-2 uppercase tracking-widest">Suggested</div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void handleSend(prompt)}
                    className="text-[11px] text-[#8B8FA3] hover:text-[#F1F1F4] border border-white/[0.08] hover:border-[#A9FF00]/30 hover:bg-[#A9FF00]/[0.08] rounded-lg px-2.5 py-1.5 transition-all duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-end gap-2 glass !rounded-xl !p-0 overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedLaunch ? `Ask about ${selectedLaunch.name}...` : "Ask about an indexed launch..."}
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-[13px] text-[#F1F1F4] placeholder-[#4E5168] resize-none outline-none max-h-[120px] leading-relaxed"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || isTyping || !selectedLaunchId}
                className="m-2 w-8 h-8 rounded-lg bg-[#A9FF00] hover:bg-[#88CC00] disabled:bg-white/[0.05] disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-[0_0_12px_rgba(169,255,0,0.3)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <div className="text-[10px] text-[#8B8FA3] text-center mt-2">↵ send · shift+↵ newline · advisory only</div>
          </div>
        </div>
      </div>
    </div>
  );
}
