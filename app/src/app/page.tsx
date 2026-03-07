"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { loadDiscoveryFeed } from "@/lib/discovery-service";
import {
  TABS,
  filterDiscoveryTokens,
  getAvatarStyle,
  type DiscoveryToken,
  type DiscoveryTab,
  type TrendingToken,
} from "@/lib/discovery";

/* ─── Helpers ───────────────────────────────────────────────────── */
function getBadge(type: string | null) {
  switch (type) {
    case "graduated":
      return <span className="badge badge-green">Graduated</span>;
    case "graduating":
      return <span className="badge badge-violet">Graduating</span>;
    case "flight":
      return <span className="badge badge-blue">Flight Mode</span>;
    default:
      return null;
  }
}

/* ─── Component ─────────────────────────────────────────────────── */
function HomeContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("Trending");
  const [tokens, setTokens] = useState<DiscoveryToken[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [feedSource, setFeedSource] = useState<"live" | "empty">("empty");
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  /* auto-scroll trending carousel */
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 240, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncDiscoveryFeed() {
      setIsFeedLoading(true);
      const result = await loadDiscoveryFeed();

      if (cancelled) return;

      setTokens(result.tokens);
      setTrendingTokens(result.trending);
      setFeedSource(result.source);
      setFeedNotice(result.error);
      setIsFeedLoading(false);
    }

    void syncDiscoveryFeed();

    return () => {
      cancelled = true;
    };
  }, []);

  const searchQuery = searchParams.get("q") ?? "";
  const filtered = filterDiscoveryTokens(tokens, searchQuery, activeTab);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 flex flex-col w-full">

      {/* ═══ TRENDING TICKER BAR ═══ */}
      <div className="mt-4 mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#00FFB2] shadow-[0_0_8px_rgba(0,255,178,0.5)] animate-pulse-dot" />
          <span className="text-[12px] font-semibold text-[#8B8FA3] uppercase tracking-widest">Trending Now</span>
          <span className={`badge ${isFeedLoading ? "badge-blue" : feedSource === "live" ? "badge-green" : "badge-yellow"}`}>
            {isFeedLoading ? "Syncing" : feedSource === "live" ? "Live" : "Waiting on Indexer"}
          </span>
        </div>
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {trendingTokens.map((t, idx) => (
            <a
              key={t.ticker}
              href={`/token/${t.ticker.toLowerCase()}`}
              className="flex-shrink-0 glass !rounded-xl !p-0 overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(169,255,0,0.08)] cursor-pointer group w-[160px]"
            >
              {/* Visual thumbnail */}
              <div className="relative h-[90px] overflow-hidden">
                <div className="absolute inset-0" style={getAvatarStyle(t.avatar)} />
                {t.img ? (
                  <img src={t.img} alt={t.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[24px] font-display font-extrabold text-[#F1F1F4] drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)] select-none">{t.ticker.slice(0, 3)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold text-[#A9FF00] bg-black/50 backdrop-blur-sm px-1 py-0.5 rounded shadow-[0_0_6px_rgba(169,255,0,0.4)]">#{idx + 1}</span>
                <span className={`absolute top-1.5 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-sm ${t.up ? "text-[#A9FF00] bg-[#A9FF00]/15" : "text-[#FF3B5C] bg-[#FF3B5C]/15"}`}>{t.change}</span>
              </div>
              {/* Compact label */}
              <div className="px-2.5 py-2">
                <div className="text-[12px] font-semibold text-[#F1F1F4] truncate">${t.ticker}</div>
                <div className="text-[10px] text-[#8B8FA3] font-mono">{t.mcap}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {feedNotice && (
        <div className="mb-4 glass !rounded-xl px-4 py-3 text-[12px] text-[#8B8FA3]">
          {feedNotice}
        </div>
      )}

      {/* ═══ TAB FILTERS ═══ */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide p-1 glass !rounded-xl">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[12px] font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#A9FF00] text-[#0A0A0F] font-semibold shadow-[0_0_12px_rgba(169,255,0,0.3)]"
                  : "text-[#8B8FA3] hover:text-[#F1F1F4] hover:bg-white/[0.06]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-shrink-0 ml-auto">
          <button className="px-3 py-2 text-[#4E5168] hover:text-[#F1F1F4] hover:bg-white/[0.06] rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M9 17h6" /></svg>
          </button>
          <button className="px-3 py-2 text-[#4E5168] hover:text-[#F1F1F4] hover:bg-white/[0.06] rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {/* ═══ TOKEN CARD GRID ═══ */}
      {filtered.length === 0 ? (
        <div className="glass-card glass-card-glow text-center py-16 mb-8">
          <div className="text-[15px] font-semibold text-[#F1F1F4] mb-2">No launches match your filters</div>
          <p className="text-[12px] text-[#8B8FA3] max-w-md mx-auto">
            Try a different ticker, token name, or tab. BondIt will surface matching launches here as the indexed discovery feed grows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 pb-8">
          {filtered.map((t) => (
            <a
              key={t.ticker}
              href={`/token/${t.ticker.toLowerCase()}`}
              className="glass-card-interactive group !p-0 !rounded-xl overflow-hidden flex flex-col"
            >
              {/* ═══ IMAGE THUMBNAIL ═══ */}
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <div className="absolute inset-0" style={getAvatarStyle(t.avatar)} />
                {t.img ? (
                  <img
                    src={t.img}
                    alt={t.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[22px] font-display font-extrabold text-[#F1F1F4] drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)] select-none">
                      {t.ticker.slice(0, 3)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-[#F1F1F4]">{t.age}</span>
                <div className="absolute top-1 right-1 scale-75 origin-top-right">{getBadge(t.badgeType)}</div>
              </div>

              {/* ═══ INFO PANEL ═══ */}
              <div className="flex flex-col px-2 pt-1.5 pb-2 gap-1">

                {/* Name + change */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-[#F1F1F4] leading-tight truncate">{t.name}</span>
                  <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${t.up ? "text-[#A9FF00]" : "text-[#FF3B5C]"}`}>{t.change}</span>
                </div>

                {/* Description */}
                <p className="text-[9px] text-[#8B8FA3] leading-[1.4] line-clamp-2">
                  {t.desc.replace(/^Created by \S+\.\s*/, "")}
                </p>

                {/* Ticker + mcap */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[13px] font-mono font-bold text-[#A9FF00] drop-shadow-[0_0_6px_rgba(169,255,0,0.5)]">${t.ticker}</span>
                  <span className="text-[11px] font-mono font-bold text-[#F1F1F4]">{t.mcap}</span>
                </div>

                {/* Distribution bars */}
                <div className="space-y-[3px] mt-0.5">
                  {/* Bonding curve */}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-[#4C5D84] w-[22px] flex-shrink-0">Bond</span>
                    <div className="flex-1 progress-glass !h-[3px]">
                      <div
                        className={`h-full rounded-full ${t.grad >= 100 ? "progress-fill-green" : "progress-fill-gradient"}`}
                        style={{ width: `${Math.min(t.grad, 100)}%` }}
                      />
                    </div>
                    <span className={`text-[8px] font-mono w-[20px] text-right flex-shrink-0 ${t.grad >= 100 ? "text-[#A9FF00]" : "text-[#4C5D84]"}`}>{Math.min(t.grad, 100)}%</span>
                  </div>
                  {/* Agency distribution */}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-[#4C5D84] w-[22px] flex-shrink-0">Dist</span>
                    <div className="flex-1 progress-glass !h-[3px]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${t.distPct}%`, background: t.distPct >= 75 ? "#A9FF00" : t.distPct > 0 ? "white" : "transparent" }}
                      />
                    </div>
                    <span className={`text-[8px] font-mono w-[20px] text-right flex-shrink-0 ${t.distPct >= 75 ? "text-[#A9FF00]" : t.distPct > 0 ? "text-white" : "text-[#4C5D84]"}`}>
                      {t.distPct > 0 ? `${t.distPct}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 mt-4 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8" />
        <p className="text-[12px] text-[#4C5D84]">BondIt.lol — Agency-Based Token Launches on Solana</p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="mx-auto px-4 sm:px-6 lg:px-8 flex flex-col w-full" />}>
      <HomeContent />
    </Suspense>
  );
}
