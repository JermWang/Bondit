"use client";

import { useState, useRef, useEffect } from "react";
import { TOKENS } from "@/lib/discovery";
import { getAvatarStyle } from "@/lib/discovery";

/* ─── Types ──────────────────────────────────────────────────────── */
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

/* ─── Static mock responses keyed by intent ─────────────────────── */
function getMockResponse(input: string, tokenName: string): string {
  const q = input.toLowerCase();
  if (q.includes("treasury"))
    return `**Treasury Status for ${tokenName}**\n\nThe treasury currently holds approximately 12.4% of total supply remaining in the stewardship reserve. Daily release rate is capped at 0.20% of remaining supply (hard-coded in the charter, immutable post-genesis).\n\n- Released today: 284,210 tokens\n- Released this week: 1.8M tokens\n- Max weekly cap: 5,000,000 tokens\n- All releases go to LP compounding (99%) and house fee (1%)\n\n*Advisory only — no discretionary action taken.*`;
  if (q.includes("graduation") || q.includes("graduate"))
    return `**Graduation Status for ${tokenName}**\n\nCurrent bonding curve progress is at **${Math.floor(Math.random() * 30 + 60)}%** of the 85 SOL target.\n\n**What happens at graduation:**\n1. Curve closes — no more buys via bonding mechanism\n2. LP is seeded on Meteora DLMM with locked liquidity\n3. Agency stewardship begins — keeper runs daily compounding\n4. Token enters 180-day max stewardship window\n\nAt current velocity, graduation is estimated in ~3-6 days.`;
  if (q.includes("flight") || q.includes("flight mode"))
    return `**Flight Mode Readiness for ${tokenName}**\n\nFlight mode is the terminal phase — once triggered, the Agency steps back entirely.\n\n| Condition | Current | Target | Met? |\n|---|---|---|---|\n| Holders | 11,204 | ≥ 15,000 | ❌ |\n| Top-10 concentration | 21.3% | ≤ 18% | ❌ |\n| Treasury remaining | 8.2% | ≤ 5% | ❌ |\n| Duration | 34 days | ≤ 180 days | ✅ |\n\nAll 3 organic conditions must be met simultaneously. Estimated ~4-6 weeks at current trajectory.`;
  if (q.includes("holder") || q.includes("holders"))
    return `**Holder Analysis for ${tokenName}**\n\nCurrent holder count: **11,204**\n\n- Top 10 wallets hold **21.3%** of supply (threshold for flight mode: ≤18%)\n- Largest single wallet: 4.2%\n- Median wallet size: ~$38 USD equivalent\n- New holders (24h): +312\n- Churn rate (7d): low — 94% retention\n\nConcentration is above the flight mode threshold. Continued organic distribution will bring this down over time.`;
  if (q.includes("charter"))
    return `**Charter Summary for ${tokenName}**\n\nThis charter is **immutable** — parameters were locked at genesis.\n\n- Total supply: 1,000,000,000\n- Curve supply: 800M (80%)\n- Treasury: 150M (15%)\n- LP reserve: 50M (5%)\n- Protocol fee: 100 bps (1%)\n- Fee split: 99% LP / 1% House\n- Daily release cap: 0.20% remaining\n- Max stewardship: 180 days\n- Flight triggers: 15K holders + ≤18% top-10 + ≤5% treasury`;
  if (q.includes("price") || q.includes("mcap") || q.includes("market"))
    return `**Market Snapshot for ${tokenName}**\n\nLive data is sourced from the indexer — showing latest available snapshot:\n\n- Price: $0.00042 SOL\n- Market cap: $2.4M\n- 24h volume: $892K\n- 24h change: +18.4%\n- 7d high: $0.00061\n- 7d low: $0.00029\n\n*AI is advisory only — not financial advice. Past performance does not indicate future results.*`;
  if (q.includes("lp") || q.includes("liquidity"))
    return `**Liquidity Overview for ${tokenName}**\n\nPost-graduation, LP is managed on **Meteora DLMM**.\n\n- LP depth (±2%): $186K\n- LP depth (±5%): $412K\n- Total LP compounded: $34.2K\n- Fees collected (all-time): $41.8K\n- Next compounding: ~18h\n\nAll LP fees are automatically re-invested — no manual intervention, no discretionary decisions.`;
  return `I can help you analyze **${tokenName}** across treasury status, graduation progress, flight mode readiness, holder distribution, charter parameters, liquidity, and market metrics.\n\nTry asking:\n- *"What's the treasury status?"*\n- *"How close is it to flight mode?"*\n- *"Explain the charter parameters"*\n- *"Analyze holder concentration"*\n\n*This is an advisory interface. I do not execute trades or modify on-chain state.*`;
}

const SUGGESTED_PROMPTS = [
  "What's the treasury status?",
  "How close to flight mode?",
  "Analyze holder concentration",
  "Explain the charter",
  "Show graduation progress",
  "Liquidity and fee breakdown",
];

/* ─── Sub-components ─────────────────────────────────────────────── */
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
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${
        isUser ? "bg-[#A9FF00]/20 text-[#A9FF00]" : "bg-white/[0.05] text-[#8B8FA3]"
      }`}>
        {isUser ? "U" : "AI"}
      </div>
      {/* Bubble */}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-[#A9FF00]/15 text-[#F1F1F4] rounded-tr-sm border border-[#A9FF00]/20"
          : "bg-white/[0.06] text-[#F1F1F4] rounded-tl-sm border border-white/[0.08]"
      }`}>
        {/* Render bold markers */}
        {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={i} className="text-[#A9FF00] font-semibold">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function ChatPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: `Welcome to the BondIt Copilot. I'm grounded on indexed on-chain data, charter parameters, and stewardship metrics.\n\nSelect a token above and ask me anything about its treasury, graduation status, holders, liquidity, or flight mode readiness.\n\n*Advisory only — I never execute trades or modify on-chain state.*`,
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const token = TOKENS[selectedIdx];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");

    const userMsg: Message = { id: Date.now(), role: "user", content, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: getMockResponse(content, token.name),
        ts: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 900 + Math.random() * 600);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function switchToken(idx: number) {
    setSelectedIdx(idx);
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: `Switched context to **${TOKENS[idx].name}** ($${TOKENS[idx].ticker}). I'm now grounded on its charter, indexed metrics, and stewardship state.\n\nWhat would you like to know?`,
      ts: new Date(),
    }]);
  }

  const gradColor = token.grad >= 100 ? "text-[#00FFB2]" : token.grad >= 75 ? "text-[#A9FF00]" : "text-[#F59E0B]";

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* ─── TOKEN SELECTOR BAR ─────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="glass !rounded-xl px-4 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] flex-shrink-0">Context</span>
          <div className="w-px h-4 bg-white/[0.05] flex-shrink-0" />
          {TOKENS.map((t, i) => (
            <button
              key={t.ticker}
              onClick={() => switchToken(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-all duration-200 ${
                i === selectedIdx
                  ? "bg-[#A9FF00]/15 text-[#A9FF00] border border-[#A9FF00]/25 shadow-[0_0_12px_rgba(169,255,0,0.15)]"
                  : "text-[#8B8FA3] hover:text-[#F1F1F4] hover:bg-white/[0.05]"
              }`}
            >
              {t.img ? (
                <img src={t.img} alt={t.ticker} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full" style={getAvatarStyle(t.avatar)} />
              )}
              ${t.ticker}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MAIN SPLIT LAYOUT ──────────────────────────────────── */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

        {/* ═══ CENTER: Analytics Dashboard ═══ */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide min-w-0">

          {/* Token hero */}
          <div className="glass !rounded-xl !p-0 overflow-hidden flex-shrink-0">
            <div className="relative h-[120px] overflow-hidden">
              <div className="absolute inset-0" style={getAvatarStyle(token.avatar)} />
              {token.img && (
                <img src={token.img} alt={token.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-end gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px] font-display font-bold text-[#F1F1F4]">{token.name}</span>
                    <span className="text-[11px] font-mono text-[#A9FF00]">${token.ticker}</span>
                  </div>
                  <span className="text-[10px] text-[#8B8FA3]/70">by {token.creator}</span>
                </div>
              </div>
              <div className="absolute bottom-3 right-4">
                <span className={`text-[12px] font-mono font-bold ${token.up ? "text-[#00FFB2]" : "text-[#FF3B5C]"}`}>
                  {token.change}
                </span>
              </div>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <StatPill label="Market Cap" value={token.mcap} />
            <StatPill label="24h Volume" value={token.vol} />
            <StatPill label="Holders" value={token.holders.toLocaleString()} accent="text-[#3B82F6]" />
            <StatPill label="Replies" value={token.replies.toLocaleString()} accent="text-[#A9FF00]" />
          </div>

          {/* Graduation progress */}
          <div className="glass !rounded-xl p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00]">Graduation Progress</span>
              <span className={`text-[13px] font-mono font-bold ${gradColor}`}>{Math.min(token.grad, 100)}%</span>
            </div>
            <div className="progress-glass !h-[6px] mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${token.grad >= 100 ? "progress-fill-green" : "progress-fill-gradient"}`}
                style={{ width: `${Math.min(token.grad, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8B8FA3]">Target: 85 SOL</span>
              <span className="text-[#8B8FA3]">Status: <span className={`font-mono ${token.badgeType === "graduated" ? "text-[#00FFB2]" : token.badgeType === "graduating" ? "text-[#A9FF00]" : token.badgeType === "flight" ? "text-[#3B82F6]" : "text-[#F59E0B]"}`}>
                {token.badgeType === "graduated" ? "Graduated" : token.badgeType === "graduating" ? "Graduating" : token.badgeType === "flight" ? "Flight Mode" : "Bonding"}
              </span></span>
            </div>
          </div>

          {/* Charter + Flight in two columns */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="glass !rounded-xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_4px_rgba(167,139,250,0.5)]" />
                Charter
              </div>
              <DetailRow label="Daily Release" value="0.20%" />
              <DetailRow label="Fee Split" value="99% LP / 1% House" />
              <DetailRow label="Max Duration" value="180 days" />
              <DetailRow label="Protocol Fee" value="100 bps" />
              <DetailRow label="Curve Supply" value="80%" />
            </div>
            <div className="glass !rounded-xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] shadow-[0_0_4px_rgba(0,255,178,0.5)]" />
                Flight Conditions
              </div>
              <DetailRow label="Holders" value={`${token.holders.toLocaleString()} / 15K`} accent={token.holders >= 15000 ? "text-[#00FFB2]" : "text-[#F59E0B]"} />
              <DetailRow label="Top-10 Conc." value="21.3%" accent="text-[#FF3B5C]" />
              <DetailRow label="Treasury Left" value="8.2%" accent="text-[#FF3B5C]" />
              <DetailRow label="Days Active" value="34 / 180" />
            </div>
          </div>

          {/* Treasury snapshot */}
          <div className="glass !rounded-xl p-4 flex-shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
              Treasury Snapshot
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Remaining", value: "82M", sub: "8.2% of supply" },
                { label: "Released Today", value: "284K", sub: "0.14% of remaining" },
                { label: "Total Released", value: "68M", sub: "across 34 days" },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.02] rounded-lg p-3">
                  <div className="text-[10px] text-[#8B8FA3] mb-1">{s.label}</div>
                  <div className="text-[14px] font-bold font-mono text-[#A9FF00]">{s.value}</div>
                  <div className="text-[10px] text-[#8B8FA3] mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* LP + Fees */}
          <div className="glass !rounded-xl p-4 flex-shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#A9FF00] mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
              Liquidity + Fees
            </div>
            <DetailRow label="Venue" value="Meteora DLMM" />
            <DetailRow label="LP Depth ±2%" value="$186K" accent="text-[#3B82F6]" />
            <DetailRow label="LP Depth ±5%" value="$412K" />
            <DetailRow label="Fees Compounded" value="$34.2K" accent="text-[#00FFB2]" />
            <DetailRow label="House Fees" value="$345" />
          </div>
        </div>

        {/* ═══ RIGHT: AI Chat Panel ═══ */}
        <div className="w-[380px] flex-shrink-0 flex flex-col glass !rounded-xl !p-0 overflow-hidden">

          {/* Chat header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#A9FF00] to-[#88CC00] flex items-center justify-center shadow-[0_0_10px_rgba(169,255,0,0.3)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4 min-h-0">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-[11px] font-bold text-[#8B8FA3] flex-shrink-0">AI</div>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA3] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA3] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA3] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}
          {messages.length <= 2 && (
            <div className="flex-shrink-0 px-4 pb-2">
              <div className="text-[10px] text-[#8B8FA3] mb-2 uppercase tracking-widest">Suggested</div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="text-[11px] text-[#8B8FA3] hover:text-[#F1F1F4] border border-white/[0.08] hover:border-[#A9FF00]/30 hover:bg-[#A9FF00]/[0.08] rounded-lg px-2.5 py-1.5 transition-all duration-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-end gap-2 glass !rounded-xl !p-0 overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${token.name}...`}
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-[13px] text-[#F1F1F4] placeholder-[#4E5168] resize-none outline-none max-h-[120px] leading-relaxed"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
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
