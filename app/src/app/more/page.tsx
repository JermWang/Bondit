"use client";

import { useState, useEffect, useRef } from "react";

/* ─── Table of Contents ──────────────────────────────────────────── */
const TOC = [
  { id: "overview", label: "Overview" },
  { id: "agency-model", label: "The Per-Token Agency" },
  { id: "lifecycle", label: "Token Lifecycle" },
  { id: "charter", label: "On-Chain Charter" },
  { id: "fees", label: "Fee Structure" },
  { id: "distribution", label: "Treasury Distribution" },
  { id: "flight-mode", label: "Flight Mode" },
  { id: "referrals", label: "Referral System" },
  { id: "architecture", label: "Technical Architecture" },
  { id: "openclaw", label: "OpenClaw AI" },
  { id: "cli", label: "CLI Tools" },
  { id: "api", label: "API Reference" },
] as const;

/* ─── Reusable components ────────────────────────────────────────── */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-[22px] sm:text-[26px] font-bold text-[#F1F1F4] mb-4 mt-14 first:mt-0 scroll-mt-24 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-[#A9FF00] shadow-[0_0_8px_rgba(169,255,0,0.5)] flex-shrink-0" />
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-[16px] sm:text-[18px] font-semibold text-[#F1F1F4] mb-2 mt-8">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] sm:text-[14px] text-[#8B8FA3] leading-[1.75] mb-4">{children}</p>;
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[12px] sm:text-[13px] text-[#8B8FA3] flex-shrink-0">{label}</span>
      <span className={`text-[12px] sm:text-[13px] font-mono text-right ${accent ?? "text-[#F1F1F4]"}`}>{value}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-4">
      {title && (
        <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#56566A]">{title}</span>
        </div>
      )}
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-xl bg-[#0A0A0F] border border-white/[0.06] px-4 py-3 mb-4 overflow-x-auto text-[12px] sm:text-[13px] font-mono text-[#8B8FA3] leading-relaxed">
      {children}
    </pre>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="text-[#A9FF00] font-semibold">{children}</span>;
}

function Badge({ children, color = "lime" }: { children: React.ReactNode; color?: "lime" | "green" | "blue" | "amber" | "red" }) {
  const cls = {
    lime: "badge-lime",
    green: "badge-green",
    blue: "badge-blue",
    amber: "badge-yellow",
    red: "badge-red",
  }[color];
  return <span className={`badge ${cls} ml-2`}>{children}</span>;
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headings = TOC.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

      {/* ═══ HEADER ═══ */}
      <div className="mb-10">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#56566A] mb-2">Technical Documentation</div>
        <h1 className="font-display text-[28px] sm:text-[36px] font-bold text-[#F1F1F4] mb-3">BondIt Documentation</h1>
        <p className="text-[13px] sm:text-[14px] text-[#8B8FA3] leading-relaxed max-w-2xl">
          Complete technical reference for the BondIt protocol. Every token launched on BondIt gets its own dedicated Agency —
          an autonomous on-chain agent that manages the token from genesis to community independence.
        </p>
      </div>

      <div className="flex gap-8 relative">

        {/* ═══ SIDEBAR TOC (desktop) ═══ */}
        <nav className="hidden lg:block w-[200px] flex-shrink-0">
          <div className="sticky top-[80px]">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#56566A] mb-3">On this page</div>
            <div className="space-y-0.5">
              {TOC.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`block w-full text-left px-3 py-1.5 rounded-lg text-[12px] transition-all duration-200 ${
                    activeId === item.id
                      ? "text-[#A9FF00] bg-[#A9FF00]/[0.08] font-semibold"
                      : "text-[#8B8FA3] hover:text-[#F1F1F4] hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* ═══ MOBILE TOC ═══ */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-12 h-12 rounded-full bg-[#A9FF00] text-[#0A0A0F] shadow-[0_0_20px_rgba(169,255,0,0.3)] flex items-center justify-center"
            aria-label="Table of contents"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {tocOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setTocOpen(false)} />
              <div className="absolute bottom-14 right-0 z-50 w-[220px] rounded-xl border border-white/[0.08] bg-[#14141F]/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-3 animate-fade-in">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#56566A] mb-2 px-2">On this page</div>
                {TOC.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg text-[12px] transition-all ${
                      activeId === item.id
                        ? "text-[#A9FF00] bg-[#A9FF00]/[0.08] font-semibold"
                        : "text-[#8B8FA3]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div ref={contentRef} className="flex-1 min-w-0">

          {/* ── Overview ── */}
          <SectionHeading id="overview">Overview</SectionHeading>
          <P>
            BondIt is a token launch protocol on Solana where <Highlight>every token gets its own dedicated Agency</Highlight> — an
            autonomous on-chain agent that manages liquidity, compounds fees, controls treasury releases, and guides the token toward
            community independence. The Agency operates with zero human discretion under an immutable charter locked at genesis.
          </P>
          <P>
            Unlike pump.fun and other launchpads that deploy tokens and walk away, BondIt provides active post-launch stewardship
            through its per-token Agency model. Each Agency runs deterministically, logs every action on-chain, and eventually dissolves
            when the community is ready to take full control.
          </P>
          <InfoCard title="Protocol at a Glance">
            <InfoRow label="Network" value="Solana" />
            <InfoRow label="On-Chain Programs" value="5" />
            <InfoRow label="Per Token" value="1 Dedicated Agency" accent="text-[#A9FF00]" />
            <InfoRow label="Human Discretion" value="Zero" accent="text-[#FF3B5C]" />
            <InfoRow label="Max Stewardship" value="180 days" />
            <InfoRow label="Graduation Target" value="85 SOL" />
          </InfoCard>

          {/* ── Agency Model ── */}
          <SectionHeading id="agency-model">The Per-Token Agency</SectionHeading>
          <P>
            The Agency is BondIt's core innovation. When you launch a token on BondIt, the protocol deploys a dedicated Agency instance
            bound exclusively to that token. This is not a shared service, not a multisig, and not a team making discretionary decisions.
            It is an autonomous on-chain program with one job: steward your token from genesis to independence.
          </P>

          <SubHeading>What the Agency Does</SubHeading>
          <InfoCard>
            <InfoRow label="LP Management" value="Manages a Meteora LP position for the token" />
            <InfoRow label="Fee Compounding" value="Compounds 70% of trading fees back into liquidity" />
            <InfoRow label="Treasury Releases" value="Releases tokens at 0.20%/day exponential decay" />
            <InfoRow label="Flight Monitoring" value="Checks holder count, concentration, treasury levels" />
            <InfoRow label="Dissolution" value="Hands LP control to community and self-destructs" />
          </InfoCard>

          <SubHeading>Why Per-Token Matters</SubHeading>
          <P>
            A shared stewardship model creates conflicts of interest — one token's needs compete with another's. BondIt eliminates this
            entirely. Each Agency instance is isolated, deterministic, and accountable only to the charter of the token it manages.
            There is no cross-token resource sharing, no priority queue, and no human judgment calls about which token gets attention.
          </P>
          <P>
            The Agency's lifecycle is finite by design. Its entire purpose is to make itself unnecessary. Once the community reaches
            critical mass (15K holders, decentralized distribution, treasury under 5%), the Agency transfers control and dissolves.
            Every token either graduates to full independence or receives a clean sunset at 180 days.
          </P>

          {/* ── Lifecycle ── */}
          <SectionHeading id="lifecycle">Token Lifecycle</SectionHeading>
          <P>
            Every BondIt token follows the same deterministic lifecycle. No exceptions, no special treatment, no backroom deals.
          </P>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {[
              { phase: "1. Genesis", desc: "Charter locked, token minted with 70/15/10/5 allocation. Agency deployed.", color: "#A9FF00" },
              { phase: "2. Bonding Curve", desc: "Token trades on the bonding curve. Agency accumulates fees. Target: 85 SOL.", color: "#3B82F6" },
              { phase: "3. Graduation", desc: "Curve completes. Agency activates LP management on Meteora and begins stewardship.", color: "#F59E0B" },
              { phase: "4. Stewardship", desc: "Agency compounds fees, releases treasury, monitors flight conditions. Up to 180 days.", color: "#A9FF00" },
              { phase: "5. Flight Mode", desc: "Conditions met. Agency transfers LP to community, dissolves. Token is independent.", color: "#00FFB2" },
            ].map((p) => (
              <div key={p.phase} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}40` }} />
                  <span className="text-[13px] font-semibold text-[#F1F1F4]">{p.phase}</span>
                </div>
                <p className="text-[12px] text-[#8B8FA3] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <InfoCard title="Lifecycle Execution">
            <InfoRow label="launch-factory" value="create_launch → mints allocations" />
            <InfoRow label="bonding-curve" value="Handles curve trading until graduation" />
            <InfoRow label="record_graduation" value="Links policy engine + venue adapter" />
            <InfoRow label="keeper jobs" value="monitor → execute → compound (cron)" />
            <InfoRow label="record_flight_mode" value="Permanent agency sunset transition" />
          </InfoCard>

          {/* ── Charter ── */}
          <SectionHeading id="charter">On-Chain Charter</SectionHeading>
          <P>
            The charter is the Agency's operating system. It is written to the blockchain at genesis and can never be modified — not by
            the creator, not by the team, not by a governance vote. There are no admin keys.
          </P>

          <InfoCard title="Token Allocation">
            <InfoRow label="Bonding Curve" value="70%" accent="text-[#A9FF00]" />
            <InfoRow label="LP Reserve" value="15%" accent="text-[#A9FF00]" />
            <InfoRow label="Agency Treasury" value="10%" />
            <InfoRow label="Ecosystem Fund" value="5%" />
          </InfoCard>

          <InfoCard title="Charter Parameters">
            <InfoRow label="Graduation Target" value="85 SOL" />
            <InfoRow label="Protocol Fee" value="2% (200 bps)" />
            <InfoRow label="Treasury Decay Rate" value="0.20% of remaining / day" />
            <InfoRow label="Daily Release Cap" value="1,000,000 tokens" />
            <InfoRow label="Weekly Release Cap" value="5,000,000 tokens" />
            <InfoRow label="Max Stewardship Duration" value="180 days" />
            <InfoRow label="Admin Keys" value="None" accent="text-[#FF3B5C]" />
          </InfoCard>

          {/* ── Fees ── */}
          <SectionHeading id="fees">Fee Structure</SectionHeading>
          <P>
            BondIt charges a 2% protocol fee on all trades. This fee is split deterministically — the Agency controls the allocation,
            not a team wallet.
          </P>

          <InfoCard title="Fee Split (70 / 20 / 10)">
            <InfoRow label="LP Compounding" value="70%" accent="text-[#A9FF00]" />
            <InfoRow label="House (Protocol)" value="20%" />
            <InfoRow label="Referral Pool" value="10%" accent="text-[#00FFB2]" />
          </InfoCard>

          <P>
            The 70% LP allocation is the key innovation. Most launchpads keep 100% of fees. BondIt's Agency automatically compounds
            the majority back into the token's own liquidity pool, creating a self-reinforcing depth flywheel. The deeper the LP,
            the tighter the spreads, the more volume, the more fees, the deeper the LP.
          </P>

          {/* ── Distribution ── */}
          <SectionHeading id="distribution">Treasury Distribution</SectionHeading>
          <P>
            The Agency controls 10% of total supply in its treasury. It releases tokens using an exponential decay formula at exactly
            0.20% of the remaining balance per day. This creates a predictable, decelerating release schedule that prevents dumping.
          </P>

          <InfoCard title="Distribution Rules">
            <InfoRow label="Decay Rate" value="0.20% of remaining / day" />
            <InfoRow label="Daily Hard Cap" value="1,000,000 tokens" />
            <InfoRow label="Weekly Hard Cap" value="5,000,000 tokens" />
            <InfoRow label="Can Be Accelerated" value="No" accent="text-[#FF3B5C]" />
            <InfoRow label="Can Be Paused" value="No" accent="text-[#FF3B5C]" />
            <InfoRow label="Visible On-Chain" value="Yes — every token card shows progress" accent="text-[#A9FF00]" />
          </InfoCard>

          <P>
            No developer, whale, or team member can accelerate the release schedule. The math is the same for every token, every day,
            and every action is logged on-chain.
          </P>

          {/* ── Flight Mode ── */}
          <SectionHeading id="flight-mode">Flight Mode</SectionHeading>
          <P>
            Flight Mode is the Agency's final act — and its entire purpose. The Agency exists to make itself unnecessary. When a token's
            community is mature enough to sustain itself, the Agency transfers full LP control and dissolves permanently.
          </P>

          <InfoCard title="Flight Conditions (all must be met)">
            <InfoRow label="Holder Count" value="≥ 15,000" accent="text-[#A9FF00]" />
            <InfoRow label="Top-10 Concentration" value="≤ 18%" accent="text-[#A9FF00]" />
            <InfoRow label="Treasury Remaining" value="≤ 5%" accent="text-[#A9FF00]" />
          </InfoCard>

          <InfoCard title="Forced Sunset">
            <InfoRow label="Trigger" value="180 days without flight conditions met" />
            <InfoRow label="Action" value="Agency dissolves, LP transferred to community" />
            <InfoRow label="Override" value="Not possible — no admin keys" accent="text-[#FF3B5C]" />
          </InfoCard>

          <P>
            The forced sunset ensures no token is stuck in perpetual stewardship. Every Agency has a maximum lifespan of 180 days.
            The community either achieves independence organically or receives a clean, deterministic exit.
          </P>

          {/* ── Referrals ── */}
          <SectionHeading id="referrals">Referral System</SectionHeading>
          <P>
            10% of all trading fees flow into the referral pool. Referrers earn a share of fees generated by users they onboard.
            Payouts are processed by the keeper service and sent directly to referrer wallets in SOL.
          </P>

          <InfoCard title="Referral Mechanics">
            <InfoRow label="Fee Allocation" value="10% of protocol fees" />
            <InfoRow label="Payout Currency" value="SOL" />
            <InfoRow label="Min Payout Threshold" value="0.01 SOL" />
            <InfoRow label="Payout Frequency" value="Every 30 minutes (cron)" />
            <InfoRow label="Max Payouts Per Run" value="50" />
            <InfoRow label="Tracking" value="URL param ?ref=CODE → cookie → DB attribution" />
          </InfoCard>

          {/* ── Architecture ── */}
          <SectionHeading id="architecture">Technical Architecture</SectionHeading>
          <P>
            BondIt consists of five on-chain Solana programs and four off-chain services. The on-chain programs handle token operations
            deterministically. The off-chain services provide indexing, scheduled execution, and AI advisory.
          </P>

          <SubHeading>On-Chain Programs</SubHeading>
          <InfoCard>
            <InfoRow label="Launch Factory" value="Creates launches, mints allocations" />
            <InfoRow label="Bonding Curve" value="Handles curve trading, fee collection" />
            <InfoRow label="Agency Vaults" value="Manages LP positions, treasury, distributions" />
            <InfoRow label="Policy Engine" value="Enforces charter rules, flight conditions" />
            <InfoRow label="Fee Accumulator" value="Splits and routes protocol fees" />
          </InfoCard>

          <SubHeading>Off-Chain Services</SubHeading>
          <InfoCard>
            <InfoRow label="Indexer (port 4000)" value="Streams events, builds analytics API" />
            <InfoRow label="Keeper" value="Cron: monitor, execute, compound, flight-check, referral payout" />
            <InfoRow label="OpenClaw AI" value="Advisory: reports, anomaly scans, Q&A" />
            <InfoRow label="Vanity Worker" value="Grinds branded mint addresses (…LoL)" />
          </InfoCard>

          <SubHeading>Infrastructure</SubHeading>
          <InfoCard>
            <InfoRow label="Frontend" value="Next.js on Vercel" />
            <InfoRow label="Indexer" value="Node.js on Render" />
            <InfoRow label="Database" value="PostgreSQL on Render" />
            <InfoRow label="Cron Triggers" value="cron-jobs.org → Vercel API routes" />
            <InfoRow label="RPC" value="Solana mainnet-beta" />
          </InfoCard>

          {/* ── OpenClaw ── */}
          <SectionHeading id="openclaw">OpenClaw AI</SectionHeading>
          <P>
            OpenClaw is BondIt's intelligence layer. Every launch can optionally connect an AI agent powered by Anthropic or OpenAI
            for community engagement via Telegram or Discord. OpenClaw is <Highlight>advisory only</Highlight> — it has zero
            execution authority.
          </P>

          <InfoCard title="OpenClaw Boundaries">
            <InfoRow label="Role" value="Advisory: reports, anomaly scans, Q&A" />
            <InfoRow label="Can Execute Trades" value="No" accent="text-[#FF3B5C]" />
            <InfoRow label="Can Modify Charter" value="No" accent="text-[#FF3B5C]" />
            <InfoRow label="Can Access Private Keys" value="No" accent="text-[#FF3B5C]" />
            <InfoRow label="Data Source" value="Reads from indexer API (public data only)" />
          </InfoCard>

          <InfoCard title="API Endpoints">
            <InfoRow label="POST" value="/api/reports/daily/:launchId" />
            <InfoRow label="POST" value="/api/reports/weekly/:launchId" />
            <InfoRow label="POST" value="/api/query" />
          </InfoCard>

          {/* ── CLI ── */}
          <SectionHeading id="cli">CLI Tools</SectionHeading>
          <P>
            BondIt provides a headless CLI for launching tokens programmatically. It supports Phantom wallet integration,
            pre-launch simulation, and branded vanity mint addresses.
          </P>

          <CodeBlock>{`$ bondit launch init --yes
✔ Created bondit-launch.json

$ bondit launch simulate
✔ Simulation passed — Compute units: 142,500

$ bondit launch create --vanity
✔ Token is live on curve
  Mint: 7xK...LoL`}</CodeBlock>

          <InfoCard title="CLI Commands">
            <InfoRow label="bondit launch init" value="Scaffold a launch config file" />
            <InfoRow label="bondit launch simulate" value="Dry-run with CU estimation" />
            <InfoRow label="bondit launch create" value="Submit the on-chain launch transaction" />
            <InfoRow label="--vanity" value="Grind for branded mint address (…LoL)" />
            <InfoRow label="--yes" value="Skip confirmation prompts" />
          </InfoCard>

          {/* ── API ── */}
          <SectionHeading id="api">API Reference</SectionHeading>
          <P>
            The indexer exposes a REST API for querying launch data, analytics, and real-time token information.
            All endpoints are public and do not require authentication.
          </P>

          <SubHeading>Launch Discovery</SubHeading>
          <InfoCard>
            <InfoRow label="GET" value="/api/launches" />
            <InfoRow label="GET" value="/api/launches/:launchId/dashboard" />
            <InfoRow label="GET" value="/api/launches/:launchId/charter" />
            <InfoRow label="GET" value="/api/launches/:launchId/liquidity" />
            <InfoRow label="GET" value="/api/launches/:launchId/flight-status" />
            <InfoRow label="GET" value="/api/launches/:launchId/fees" />
          </InfoCard>

          <SubHeading>Referral System</SubHeading>
          <InfoCard>
            <InfoRow label="POST" value="/api/referral/create-code" />
            <InfoRow label="POST" value="/api/referral/attribute" />
            <InfoRow label="POST" value="/api/referral/record-earning" />
            <InfoRow label="GET" value="/api/referral/stats/:wallet" />
          </InfoCard>

          <SubHeading>Cron Endpoints (authenticated)</SubHeading>
          <InfoCard>
            <InfoRow label="GET" value="/api/cron/referral-payout" />
            <InfoRow label="GET" value="/api/cron/keeper?job=monitor" />
            <InfoRow label="GET" value="/api/cron/keeper?job=execute" />
            <InfoRow label="GET" value="/api/cron/keeper?job=compound" />
            <InfoRow label="GET" value="/api/cron/keeper?job=flight-check" />
            <InfoRow label="Auth" value="Authorization: Bearer CRON_SECRET" accent="text-[#F59E0B]" />
          </InfoCard>

          {/* ── Footer ── */}
          <div className="mt-16 pt-6 border-t border-white/[0.06]">
            <p className="text-[12px] text-[#4E5168]">
              BondIt.lol — Every Token Gets Its Own Agency. Documentation is append-only. Last updated with the protocol's current architecture.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
