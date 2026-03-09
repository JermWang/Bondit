"use client";

import { useState, useEffect } from "react";

/* ─── Slide data ─────────────────────────────────────────────────── */
type ComparisonRow = { label: string; pump: string; bondit: string; highlight?: boolean };
type Slide = {
  id: string;
  subtitle: string;
  title: string;
  body: string;
  comparison?: ComparisonRow[];
};

const SLIDES: Slide[] = [
  {
    id: "infra",
    subtitle: "Same speed. Way more infrastructure.",
    title: "PumpFun + Guardrails",
    body: "Every BondIt launch routes through PumpFun — then wraps it with on-chain rules that protect your token after day one.",
    comparison: [
      { label: "LP Depth",          pump: "5%",          bondit: "15% (3×)",    highlight: true },
      { label: "Fee → back to LP",  pump: "0%",          bondit: "70% compound", highlight: true },
      { label: "Referral Rewards",  pump: "None",        bondit: "10% of fees",  highlight: true },
      { label: "Treasury Controls", pump: "Manual",      bondit: "0.20%/day locked" },
      { label: "On-Chain Charter",  pump: "None",        bondit: "Immutable" },
      { label: "Auto Flight Mode", pump: "None",        bondit: "15K holders" },
    ],
  },
  {
    id: "vs",
    subtitle: "BondIt vs pump.fun",
    title: "Your Token Gets Its Own Agency",
    body: "pump.fun launches your token and walks away. BondIt assigns every single token its own dedicated Agency — an autonomous on-chain agent that manages LP, compounds fees, controls treasury releases, and guides the token to community independence. Not a shared service. Not a team. A per-token program that runs 24/7 with zero human discretion.",
  },
  {
    id: "agency",
    subtitle: "One token. One Agency. One mission.",
    title: "The Per-Token Agency Model",
    body: "This is what makes BondIt fundamentally different. Every launch creates a dedicated Agency instance bound to that token alone. The Agency manages a Meteora LP position, compounds 70% of trading fees back into liquidity, releases treasury at a fixed 0.20%/day decay rate, and monitors flight-readiness conditions — all autonomously, all on-chain, all verifiable. When the community is ready, the Agency dissolves and hands over full control. No other launchpad does this.",
  },
  {
    id: "cli",
    subtitle: "Built for Agents",
    title: "Headless CLI Orchestration",
    body: "Spin up a launch in seconds. BondIt provides a headless CLI with Phantom wallet integration built-in. Define your parameters in a local config file, validate the rules, and simulate your launch before sending a single transaction.",
  },
  {
    id: "charter",
    subtitle: "The Agency's operating system.",
    title: "Immutable On-Chain Charter",
    body: "Every Agency runs on a charter written at genesis and locked forever. It defines everything: 70% bonding curve, 15% LP reserve, 10% Agency treasury, 5% ecosystem fund. Fee split: 70% compounded into LP, 20% house, 10% referral pool. The charter is the Agency's DNA — no admin keys can alter it, no multisig can override it. The rules your token launched with are the rules it lives by.",
  },
  {
    id: "distribution",
    subtitle: "Your Agency drips, never dumps.",
    title: "Agency Treasury Distribution",
    body: "The Agency controls 10% of total supply in its treasury. It releases tokens at exactly 0.20% of remaining per day — hard-capped at 1M daily and 5M weekly. No dev can accelerate this. No whale can negotiate a deal. The Agency follows the same math for every token, every day, logged on-chain. Distribution progress is visible on every token card.",
  },
  {
    id: "flight",
    subtitle: "The Agency's final act.",
    title: "Flight Mode",
    body: "The Agency's entire purpose is to make itself unnecessary. When a token hits 15K holders, top-10 concentration drops below 18%, and treasury falls under 5% — the Agency transfers full LP control to the community and dissolves. If conditions aren't met within 180 days, a forced sunset triggers. The Agency never overstays. Every token either graduates to independence or gets a clean exit.",
  },
  {
    id: "transparency",
    subtitle: "Every action. Auditable.",
    title: "Fully On-Chain Logs",
    body: "Every policy action — LP rebalances, fee compounding, treasury releases, flight checks — is appended to an immutable on-chain log with a monotonic index. Publicly verifiable forever. Nothing is hidden, nothing is discretionary.",
  },
];

/* ─── Animated SVG illustrations ────────────────────────────────── */
function VsSVG() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="vgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(169,255,0,0.07)" strokeWidth="0.5"/>
        </pattern>
        <linearGradient id="redFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF3B5C" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#FF3B5C" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="greenFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A9FF00" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#A9FF00" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill="url(#vgrid)"/>

      {/* LEFT — pump.fun chart */}
      <text x="72" y="24" textAnchor="middle" fontSize="11" fill="#FF3B5C" fontFamily="monospace" opacity="0.85">pump.fun</text>
      <line x1="18" y1="40" x2="18" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <line x1="18" y1="165" x2="140" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>

      {/* Pump-and-dump chart */}
      <path d="M22 155 C32 150 42 140 55 95 C62 68 68 48 75 42 C82 48 90 80 100 130 C108 155 118 162 140 163 L140 165 L22 165Z"
        fill="url(#redFade)" style={{animation:"chartDraw 1.5s ease-out 0.2s both"}}/>
      <path d="M22 155 C32 150 42 140 55 95 C62 68 68 48 75 42 C82 48 90 80 100 130 C108 155 118 162 140 163"
        stroke="#FF3B5C" strokeWidth="2" strokeLinecap="round" fill="none"
        style={{animation:"chartDraw 1.5s ease-out 0.2s both"}}/>

      {/* Peak label */}
      <g style={{animation:"fadeIn 0.5s ease-out 1s both"}}>
        <text x="75" y="36" textAnchor="middle" fontSize="7" fill="#FF3B5C" fontFamily="monospace" opacity="0.7">ATH</text>
        <line x1="75" y1="38" x2="75" y2="42" stroke="#FF3B5C" strokeWidth="0.5" opacity="0.5"/>
      </g>

      {/* Crash X markers */}
      {[[95,115],[110,145],[125,158]].map(([cx,cy],i)=>(
        <g key={i} style={{animation:`fadeIn 0.3s ease-out ${1.2+i*0.2}s both`}}>
          <text x={cx} y={cy} textAnchor="middle" fontSize="10" fill="#FF3B5C" opacity="0.6">✕</text>
        </g>
      ))}

      {/* Problem labels */}
      {[
        {text:"no LP mgmt",y:178},
        {text:"dev dumps",y:190},
        {text:"abandoned",y:202},
      ].map(({text,y},i)=>(
        <g key={text} style={{animation:`fadeIn 0.4s ease-out ${1.5+i*0.15}s both`}}>
          <text x="12" y={y} fontSize="7.5" fill="#FF3B5C" fontFamily="monospace" opacity="0.55">✕ {text}</text>
        </g>
      ))}

      <line x1="125" y1="163" x2="142" y2="163" stroke="#FF3B5C" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"
        style={{animation:"fadeIn 0.5s ease-out 1.8s both"}}/>

      {/* DIVIDER */}
      <line x1="160" y1="16" x2="160" y2="228" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <text x="160" y="122" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.12)" fontFamily="monospace">VS</text>

      {/* RIGHT — BondIt chart */}
      <text x="248" y="24" textAnchor="middle" fontSize="11" fill="#A9FF00" fontFamily="monospace" opacity="0.9">bondit.lol</text>
      <line x1="178" y1="40" x2="178" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <line x1="178" y1="165" x2="305" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>

      {/* Guardrail zone */}
      <path d="M182 135 C200 128 225 110 250 95 C270 84 290 75 305 68 L305 90 C290 97 270 106 250 115 C225 128 200 142 182 150Z"
        fill="rgba(169,255,0,0.06)" stroke="none" style={{animation:"fadeIn 0.8s ease-out 0.5s both"}}/>
      <path d="M182 135 C200 128 225 110 250 95 C270 84 290 75 305 68"
        stroke="rgba(169,255,0,0.2)" strokeWidth="1" strokeDasharray="3 3" fill="none"
        style={{animation:"chartDraw 1.5s ease-out 0.5s both"}}/>
      <path d="M182 150 C200 142 225 128 250 115 C270 106 290 97 305 90"
        stroke="rgba(169,255,0,0.2)" strokeWidth="1" strokeDasharray="3 3" fill="none"
        style={{animation:"chartDraw 1.5s ease-out 0.5s both"}}/>

      {/* Steady growth chart */}
      <path d="M182 155 C195 148 210 138 230 120 C245 108 265 97 280 88 C290 82 298 78 305 75 L305 165 L182 165Z"
        fill="url(#greenFade)" style={{animation:"chartDraw 1.8s ease-out 0.3s both"}}/>
      <path d="M182 155 C195 148 210 138 230 120 C245 108 265 97 280 88 C290 82 298 78 305 75"
        stroke="#A9FF00" strokeWidth="2" strokeLinecap="round" fill="none"
        style={{animation:"chartDraw 1.8s ease-out 0.3s both"}}/>

      <g style={{animation:"fadeIn 0.5s ease-out 1.2s both"}}>
        <text x="308" y="65" fontSize="6.5" fill="rgba(169,255,0,0.45)" fontFamily="monospace">guardrails</text>
      </g>

      {/* Stewardship event dots */}
      {[
        {cx:210,cy:138,label:"LP add"},
        {cx:245,cy:108,label:"dist"},
        {cx:280,cy:88,label:"compound"},
      ].map(({cx,cy,label},i)=>(
        <g key={label} style={{animation:`fadeIn 0.4s ease-out ${1.4+i*0.25}s both`}}>
          <circle cx={cx} cy={cy} r="3" fill="#A9FF00" opacity="0.8">
            <animate attributeName="r" values="3;4;3" dur="2s" begin={`${i*0.5}s`} repeatCount="indefinite"/>
          </circle>
          <text x={cx} y={cy-7} textAnchor="middle" fontSize="6" fill="rgba(169,255,0,0.6)" fontFamily="monospace">{label}</text>
        </g>
      ))}

      {/* Benefit labels */}
      {[
        {text:"managed LP",y:178},
        {text:"treasury decay",y:190},
        {text:"fee compounding",y:202},
      ].map(({text,y},i)=>(
        <g key={text} style={{animation:`fadeIn 0.4s ease-out ${1.8+i*0.15}s both`}}>
          <text x="178" y={y} fontSize="7.5" fill="#A9FF00" fontFamily="monospace" opacity="0.6">✔ {text}</text>
        </g>
      ))}

      {/* Flight mode badge */}
      <g style={{animation:"fadeIn 0.5s ease-out 2.3s both"}}>
        <rect x="178" y="210" width="74" height="16" rx="4" fill="rgba(0,255,178,0.1)" stroke="rgba(0,255,178,0.3)" strokeWidth="1"/>
        <text x="215" y="221" textAnchor="middle" fontSize="7" fill="#00FFB2" fontFamily="monospace">✈ flight mode</text>
      </g>

      <style>{`
        @keyframes chartDraw{from{opacity:0;stroke-dashoffset:400;stroke-dasharray:400}to{opacity:1;stroke-dashoffset:0;stroke-dasharray:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>
    </svg>
  );
}

function AgencySVG() {
  const nodes = [
    { cx: 160, cy: 60, label: "LP Mgmt", color: "#A9FF00", delay: 0.2 },
    { cx: 270, cy: 120, label: "Compound", color: "#00FFB2", delay: 0.4 },
    { cx: 230, cy: 210, label: "Dist", color: "#3B82F6", delay: 0.6 },
    { cx: 90, cy: 210, label: "Flight", color: "#F59E0B", delay: 0.8 },
    { cx: 50, cy: 120, label: "Charter", color: "#A78BFA", delay: 1.0 },
  ];

  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="agcygrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(169,255,0,0.05)" strokeWidth="0.5"/>
        </pattern>
        <radialGradient id="agcyGlow">
          <stop offset="0%" stopColor="#A9FF00" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#A9FF00" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="320" height="240" fill="url(#agcygrid)"/>

      {/* Central Agency node */}
      <g style={{animation:"agcyPulse 3s ease-in-out infinite"}}>
        <circle cx="160" cy="135" r="38" fill="url(#agcyGlow)" stroke="#A9FF00" strokeWidth="2"/>
        <circle cx="160" cy="135" r="28" fill="rgba(169,255,0,0.08)" stroke="#A9FF00" strokeWidth="1.5"/>
        <text x="160" y="130" textAnchor="middle" fontSize="9" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">AGENCY</text>
        <text x="160" y="143" textAnchor="middle" fontSize="7" fill="rgba(169,255,0,0.6)" fontFamily="monospace">per-token</text>
      </g>

      {/* Outer ring — dashed orbit */}
      <circle cx="160" cy="135" r="80" fill="none" stroke="rgba(169,255,0,0.08)" strokeWidth="1" strokeDasharray="4 6"
        style={{animation:"agcySpin 30s linear infinite"}}/>

      {/* Connection lines + function nodes */}
      {nodes.map(({ cx, cy, label, color, delay }) => (
        <g key={label} style={{animation:`fadeIn 0.5s ease-out ${delay}s both`}}>
          {/* Connection line */}
          <line x1="160" y1="135" x2={cx} y2={cy} stroke={color} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4">
            <animate attributeName="stroke-dashoffset" values="8;0" dur="1.5s" repeatCount="indefinite"/>
          </line>
          {/* Node circle */}
          <circle cx={cx} cy={cy} r="22" fill={`${color}10`} stroke={color} strokeWidth="1.5"/>
          <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace" fontWeight="bold">{label}</text>
          {/* Pulse dot */}
          <circle cx={cx} cy={cy - 22} r="3" fill={color}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.5 + delay * 0.5}s`} repeatCount="indefinite"/>
          </circle>
        </g>
      ))}

      {/* "1 token = 1 agency" label */}
      <g style={{animation:"fadeIn 0.6s ease-out 1.4s both"}}>
        <rect x="105" y="4" width="110" height="18" rx="4" fill="rgba(169,255,0,0.08)" stroke="rgba(169,255,0,0.25)" strokeWidth="1"/>
        <text x="160" y="16" textAnchor="middle" fontSize="8" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">1 TOKEN = 1 AGENCY</text>
      </g>

      {/* Bottom label */}
      <text x="160" y="236" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="monospace">autonomous · deterministic · per-token</text>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes agcyPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes agcySpin{from{transform:rotate(0deg);transform-origin:160px 135px}to{transform:rotate(360deg);transform-origin:160px 135px}}
      `}</style>
    </svg>
  );
}

function InfraSVG() {
  const rows = [
    { label: "LP Depth",      pump: "5%",     bondit: "15%",  y: 68 },
    { label: "Fees → LP",     pump: "0%",     bondit: "70%",  y: 98 },
    { label: "Referrals",     pump: "—",      bondit: "10%",  y: 128 },
    { label: "Charter",       pump: "—",      bondit: "Locked", y: 158 },
    { label: "Flight Mode",   pump: "—",      bondit: "Auto",  y: 188 },
  ];

  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="igrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(169,255,0,0.04)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#igrid)"/>

      {/* Column headers */}
      <g style={{animation:"fadeIn 0.4s ease-out 0.1s both"}}>
        <rect x="10" y="20" width="145" height="26" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
        <text x="82" y="37" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)" fontFamily="monospace" fontWeight="bold">pump.fun</text>
      </g>
      <g style={{animation:"fadeIn 0.4s ease-out 0.2s both"}}>
        <rect x="165" y="20" width="145" height="26" rx="6" fill="rgba(169,255,0,0.06)" stroke="rgba(169,255,0,0.25)" strokeWidth="1.5"/>
        <text x="237" y="37" textAnchor="middle" fontSize="10" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">BondIt</text>
      </g>

      {/* Center divider */}
      <line x1="160" y1="52" x2="160" y2="210" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3"/>

      {/* Comparison rows */}
      {rows.map(({ label, pump, bondit, y }, i) => (
        <g key={label} style={{animation:`rowSlide 0.4s ease-out ${0.3 + i * 0.12}s both`}}>
          {/* Row background on BondIt side */}
          <rect x="165" y={y - 11} width="145" height="24" rx="4" fill="rgba(169,255,0,0.03)"/>

          {/* Label (center) */}
          <text x="160" y={y + 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="monospace">{label}</text>

          {/* PumpFun value — dim with ✗ */}
          <circle cx="48" cy={y} r="6" fill="rgba(255,60,90,0.08)" stroke="rgba(255,60,90,0.25)" strokeWidth="1"/>
          <path d={`M45 ${y-3} L51 ${y+3} M51 ${y-3} L45 ${y+3}`} stroke="rgba(255,60,90,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
          <text x="82" y={y + 3.5} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.25)" fontFamily="monospace">{pump}</text>

          {/* BondIt value — bright with ✓ */}
          <circle cx="203" cy={y} r="6" fill="rgba(169,255,0,0.12)" stroke="#A9FF00" strokeWidth="1"/>
          <path d={`M200 ${y} L202 ${y+2.5} L206 ${y-3}`} stroke="#A9FF00" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <text x="250" y={y + 3.5} textAnchor="middle" fontSize="10" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">{bondit}</text>
        </g>
      ))}

      {/* Bottom tagline */}
      <g style={{animation:"fadeIn 0.5s ease-out 1.2s both"}}>
        <text x="160" y="228" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.18)" fontFamily="monospace">same speed · way more infrastructure</text>
      </g>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes rowSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </svg>
  );
}

function CliSVG() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="cligrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(169,255,0,0.04)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#cligrid)"/>

      {/* Terminal Window */}
      <g style={{animation:"fadeIn 0.5s ease-out both"}}>
        <rect x="20" y="30" width="280" height="180" rx="6" fill="rgba(10,10,15,0.8)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        {/* Window Chrome */}
        <rect x="20" y="30" width="280" height="24" rx="6" fill="rgba(255,255,255,0.03)"/>
        <path d="M20 54 L300 54" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        <circle cx="34" cy="42" r="3" fill="#FF3B5C" opacity="0.6"/>
        <circle cx="46" cy="42" r="3" fill="#F59E0B" opacity="0.6"/>
        <circle cx="58" cy="42" r="3" fill="#00FFB2" opacity="0.6"/>
        <text x="160" y="45" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)" fontFamily="monospace">agent@bondit: ~</text>
      </g>

      {/* Terminal Content */}
      <g fontFamily="monospace" fontSize="10" transform="translate(35, 75)">
        {/* Command 1 */}
        <g style={{animation:"typeLine1 0.1s steps(20) 0.5s both, hideCursor 0.1s 1.5s both"}}>
          <text x="0" y="0" fill="#A9FF00">$</text>
          <text x="12" y="0" fill="#F1F1F4" className="type-text1">bondit launch init --yes</text>
          <rect x="156" y="-8" width="6" height="10" fill="#A9FF00" className="cursor1"/>
        </g>
        
        {/* Output 1 */}
        <g style={{animation:"fadeIn 0.2s ease-out 1.5s both"}}>
          <text x="0" y="16" fill="#8B8FA3" fontSize="9">✔ Created bondit-launch.json</text>
        </g>

        {/* Command 2 */}
        <g style={{animation:"typeLine2 0.1s steps(20) 2.2s both, hideCursor 0.1s 3.2s both"}}>
          <text x="0" y="36" fill="#A9FF00">$</text>
          <text x="12" y="36" fill="#F1F1F4" className="type-text2">bondit launch simulate</text>
          <rect x="144" y="28" width="6" height="10" fill="#A9FF00" className="cursor2"/>
        </g>

        {/* Output 2 */}
        <g style={{animation:"fadeIn 0.2s ease-out 3.2s both"}}>
          <text x="0" y="52" fill="#8B8FA3" fontSize="9">⠋ Resolving Phantom wallet...</text>
        </g>
        <g style={{animation:"fadeIn 0.2s ease-out 4.0s both"}}>
          <rect x="-2" y="43" width="160" height="12" fill="rgba(10,10,15,1)"/>
          <text x="0" y="52" fill="#A9FF00" fontSize="9">✔ Simulation passed</text>
          <text x="0" y="66" fill="#8B8FA3" fontSize="9">  Compute units: 142,500</text>
        </g>

        {/* Command 3 */}
        <g style={{animation:"typeLine3 0.1s steps(20) 4.8s both"}}>
          <text x="0" y="86" fill="#A9FF00">$</text>
          <text x="12" y="86" fill="#F1F1F4" className="type-text3">bondit launch create --vanity</text>
          <rect x="186" y="78" width="6" height="10" fill="#A9FF00" className="cursor3">
            <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite"/>
          </rect>
        </g>

        {/* Output 3 (Success Block) */}
        <g style={{animation:"slideUpFade 0.4s ease-out 6.0s both"}}>
          <rect x="-5" y="96" width="240" height="36" rx="4" fill="rgba(169,255,0,0.05)" stroke="rgba(169,255,0,0.2)" strokeWidth="1"/>
          <text x="5" y="109" fill="#A9FF00" fontSize="9" fontWeight="bold">SUCCESS: Token is live on curve</text>
          <text x="5" y="122" fill="#8B8FA3" fontSize="8.5">Mint: 7xK...LoL</text>
          <text x="230" y="122" fill="#00FFB2" fontSize="8.5" textAnchor="end">copy</text>
        </g>
      </g>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUpFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes typeLine1{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
        @keyframes typeLine2{from{clip-path:inset(0 100% 0 0);opacity:0}1%{opacity:1}to{clip-path:inset(0 0 0 0);opacity:1}}
        @keyframes typeLine3{from{clip-path:inset(0 100% 0 0);opacity:0}1%{opacity:1}to{clip-path:inset(0 0 0 0);opacity:1}}
        @keyframes hideCursor{to{opacity:0;visibility:hidden}}
        .type-text1,.type-text2,.type-text3{clip-path:inset(0 0 0 0)}
      `}</style>
    </svg>
  );
}

function CharterSVG() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="cgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(169,255,0,0.06)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#cgrid)"/>
      {/* Document */}
      <rect x="80" y="25" width="160" height="175" rx="9" fill="rgba(213,216,236,0.1)" stroke="rgba(169,255,0,0.2)" strokeWidth="1.5"/>
      <rect x="80" y="25" width="160" height="34" rx="9" fill="rgba(169,255,0,0.14)"/>
      <text x="160" y="46" textAnchor="middle" fontSize="11.5" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">ON-CHAIN CHARTER</text>
      {[
        {l:"Curve Supply",v:"70%",y:80},
        {l:"LP Reserve",v:"15%",y:101},
        {l:"Treasury",v:"10%",y:122},
        {l:"Ecosystem Fund",v:"5%",y:143},
        {l:"Protocol Fee",v:"2%",y:164},
        {l:"Fee → LP / House / Ref",v:"70/20/10",y:185},
      ].map(({l,v,y},i)=>(
        <g key={l} style={{animation:`rowIn 0.4s ease-out ${0.2+i*0.14}s both`}}>
          <text x="98" y={y} fontSize="10.5" fill="rgba(255,255,255,0.45)" fontFamily="monospace">{l}</text>
          <text x="220" y={y} textAnchor="end" fontSize="10.5" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">{v}</text>
          <circle cx="228" cy={y-3.5} r="5" fill="rgba(0,255,178,0.12)" stroke="#00FFB2" strokeWidth="1"
            style={{animation:`popIn 0.3s ease-out ${0.35+i*0.14}s both`}}/>
          <path d={`M225 ${y-3.5} L227 ${y-1} L231 ${y-7}`} stroke="#00FFB2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
            style={{animation:`popIn 0.3s ease-out ${0.35+i*0.14}s both`}}/>
        </g>
      ))}
      {/* Padlock */}
      <g style={{animation:"floatLock 2s ease-in-out infinite", transformOrigin: "160px 215px", transform: "scale(0.85)"}}>
        <rect x="140" y="206" width="40" height="26" rx="5" fill="rgba(169,255,0,0.15)" stroke="#A9FF00" strokeWidth="1.5"/>
        <path d="M148 206 L148 200 Q160 190 172 200 L172 206" stroke="#A9FF00" strokeWidth="1.5" fill="none"/>
        <circle cx="160" cy="219" r="4.5" fill="#A9FF00"/>
        <line x1="160" y1="219" x2="160" y2="225" stroke="#A9FF00" strokeWidth="1.5"/>
      </g>
      <style>{`
        @keyframes rowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
        @keyframes floatLock{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      `}</style>
    </svg>
  );
}

function DistributionSVG() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="dgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(169,255,0,0.06)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#dgrid)"/>
      {/* Phase labels */}
      <text x="75" y="38" textAnchor="middle" fontSize="11" fill="rgba(169,255,0,0.7)" fontFamily="monospace">CURVE</text>
      <text x="218" y="38" textAnchor="middle" fontSize="11" fill="rgba(169,255,0,0.7)" fontFamily="monospace">AGENCY DIST</text>
      {/* Curve bar */}
      <rect x="15" y="55" width="120" height="18" rx="4" fill="rgba(169,255,0,0.08)" stroke="rgba(169,255,0,0.25)" strokeWidth="1"/>
      <rect x="15" y="55" width="120" height="18" rx="4" fill="rgba(169,255,0,0.35)"
        style={{animation:"barFill1 1.8s ease-out 0.1s both",transformOrigin:"15px 64px",transform:"scaleX(0)"}}/>
      <text x="75" y="90" textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">~2–14 days · 85 SOL target</text>
      {/* Arrow */}
      <path d="M142 64 L160 64" stroke="#A9FF00" strokeWidth="2" strokeLinecap="round"/>
      <path d="M156 59.5 L161.5 64 L156 68.5" stroke="#A9FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Dist bar */}
      <rect x="168" y="55" width="138" height="18" rx="4" fill="rgba(169,255,0,0.08)" stroke="rgba(169,255,0,0.25)" strokeWidth="1"/>
      <rect x="168" y="55" width="0" height="18" rx="4" fill="rgba(169,255,0,0.35)"
        style={{animation:"barFill2 5s linear 1.5s infinite"}}/>
      <text x="237" y="90" textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">0.20%/day · 1M/day · 5M/wk cap</text>
      {/* Dripping tokens */}
      {[0,1,2,3,4].map(i=>(
        <g key={i} style={{animation:`drop 1.8s ease-in ${1.8+i*0.36}s infinite`}}>
          <circle cx={182+i*25} cy="53" r="6.5" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1"/>
          <text x={182+i*25} y="56.5" textAnchor="middle" fontSize="7.5" fill="white" fontWeight="bold">T</text>
        </g>
      ))}
      {/* Completion → Flight unlock */}
      <text x="237" y="135" textAnchor="middle" fontSize="10.5" fill="rgba(169,255,0,0.6)" fontFamily="monospace">treasury ≤ 5% →</text>
      <g style={{animation:"glowPulse 1.5s ease-in-out infinite"}}>
        <rect x="175" y="150" width="124" height="40" rx="8" fill="rgba(0,255,178,0.1)" stroke="#00FFB2" strokeWidth="2"/>
        <text x="237" y="168" textAnchor="middle" fontSize="10" fill="#00FFB2" fontFamily="monospace" fontWeight="bold">FLIGHT MODE UNLOCKED</text>
        <text x="237" y="182" textAnchor="middle" fontSize="8.5" fill="rgba(0,255,178,0.45)" fontFamily="monospace">community takes control</text>
      </g>
      <style>{`
        @keyframes barFill1{to{transform:scaleX(1)}}
        @keyframes barFill2{0%{width:0}75%{width:138px}100%{width:138px}}
        @keyframes drop{0%{opacity:.9;transform:translateY(0)}70%{opacity:0;transform:translateY(30px)}100%{opacity:0;transform:translateY(30px)}}
        @keyframes glowPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.3)}}
      `}</style>
    </svg>
  );
}

function FlightSVG() {
  const gauges = [
    { label: "Holders", value: "14.8K", target: "15K", pct: 98, color: "#A9FF00", delay: 0.1 },
    { label: "Top-10 Conc.", value: "17.2%", target: "< 18%", pct: 96, color: "#06B6D4", delay: 0.3 },
    { label: "Treasury Left", value: "4.1%", target: "< 5%", pct: 92, color: "#F59E0B", delay: 0.5 },
  ];

  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="fgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(0,255,178,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#fgrid)"/>

      {/* Header */}
      <text x="160" y="20" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace">FLIGHT READINESS</text>

      {/* Three gauge rows */}
      {gauges.map(({ label, value, target, pct, color, delay }, i) => {
        const y = 38 + i * 48;
        const barW = 190;
        const fillW = (pct / 100) * barW;
        return (
          <g key={label} style={{animation:`fadeIn 0.5s ease-out ${delay}s both`}}>
            {/* Label row */}
            <text x="18" y={y} fontSize="9" fill={color} fontFamily="monospace" fontWeight="bold">{label}</text>
            <text x="302" y={y} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="monospace">{value} / {target}</text>

            {/* Track */}
            <rect x="18" y={y + 6} width={barW} height="14" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>

            {/* Fill bar */}
            <rect x="18" y={y + 6} width={fillW} height="14" rx="4" fill={`${color}30`}
              style={{animation:`barGrow 1.8s ease-out ${delay + 0.2}s both`, transformOrigin:"18px 0"}}/>

            {/* Glow edge on fill */}
            <rect x={18 + fillW - 2} y={y + 6} width="2" height="14" rx="1" fill={color} opacity="0.7"
              style={{animation:`barGrow 1.8s ease-out ${delay + 0.2}s both`}}>
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite"/>
            </rect>

            {/* Percentage */}
            <text x={18 + fillW - 8} y={y + 16} fontSize="8" fill={color} fontFamily="monospace" fontWeight="bold" opacity="0.9"
              style={{animation:`fadeIn 0.4s ease-out ${delay + 0.8}s both`}}>{pct}%</text>

            {/* Threshold marker line */}
            <line x1={18 + barW} y1={y + 4} x2={18 + barW} y2={y + 22} stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>

            {/* Checkmark (appears after bar fills) */}
            <g style={{animation:`popCheck 0.4s ease-out ${delay + 1.4}s both`}}>
              <circle cx="228" cy={y + 13} r="8" fill={`${color}18`} stroke={color} strokeWidth="1.2"/>
              <path d={`M223.5 ${y + 13} L226.5 ${y + 16} L232.5 ${y + 9}`} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </g>

            {/* Status text */}
            <text x="248" y={y + 16} fontSize="7" fill={color} fontFamily="monospace" opacity="0.6"
              style={{animation:`fadeIn 0.3s ease-out ${delay + 1.6}s both`}}>
              {pct >= 95 ? "READY" : "IN PROGRESS"}
            </text>
          </g>
        );
      })}

      {/* Runway / timeline */}
      <g style={{animation:"fadeIn 0.6s ease-out 1.2s both"}}>
        {/* Track line */}
        <line x1="30" y1="195" x2="290" y2="195" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round"/>

        {/* Filled progress */}
        <line x1="30" y1="195" x2="270" y2="195" stroke="rgba(0,255,178,0.3)" strokeWidth="2" strokeLinecap="round"
          style={{animation:"runwayFill 2s ease-out 1.4s both"}}/>

        {/* Milestone dots */}
        {[
          { x: 30, label: "Genesis", done: true },
          { x: 100, label: "Curve", done: true },
          { x: 170, label: "Stewardship", done: true },
          { x: 240, label: "Conditions", done: true },
        ].map(({ x, label, done }, i) => (
          <g key={label} style={{animation:`fadeIn 0.3s ease-out ${1.3 + i * 0.15}s both`}}>
            <circle cx={x} cy="195" r="4" fill={done ? "rgba(0,255,178,0.3)" : "rgba(255,255,255,0.08)"} stroke={done ? "#00FFB2" : "rgba(255,255,255,0.15)"} strokeWidth="1.2"/>
            <text x={x} y="208" textAnchor="middle" fontSize="6.5" fill={done ? "rgba(0,255,178,0.55)" : "rgba(255,255,255,0.2)"} fontFamily="monospace">{label}</text>
          </g>
        ))}
      </g>

      {/* Flight Mode destination */}
      <g style={{animation:"popCheck 0.5s ease-out 2.2s both"}}>
        <rect x="260" y="183" width="52" height="24" rx="6" fill="rgba(0,255,178,0.1)" stroke="#00FFB2" strokeWidth="1.5">
          <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
        </rect>
        <text x="286" y="198" textAnchor="middle" fontSize="7.5" fill="#00FFB2" fontFamily="monospace" fontWeight="bold">FLIGHT</text>
      </g>

      {/* Bottom label */}
      <text x="160" y="230" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.2)" fontFamily="monospace">
        all conditions met → guardrails off · community owns LP
      </text>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes barGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes popCheck{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
        @keyframes runwayFill{from{stroke-dashoffset:260;stroke-dasharray:260}to{stroke-dashoffset:0;stroke-dasharray:260}}
      `}</style>
    </svg>
  );
}

function TransparencySVG() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="tgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#tgrid)"/>
      {/* Block chain */}
      {[
        {label:"Genesis",color:"#A9FF00",x:20},
        {label:"LP Add",color:"white",x:100},
        {label:"Dist #1",color:"#3B82F6",x:180},
        {label:"Dist #2",color:"#A9FF00",x:260},
      ].map(({label,color,x},i)=>(
        <g key={label} style={{animation:`chainSlide 0.5s ease-out ${i*0.25}s both`}}>
          <rect x={x} y="65" width="65" height="60" rx="6" fill={`${color}12`} stroke={color} strokeWidth="1.5"/>
          <rect x={x} y="65" width="65" height="18" rx="6" fill={`${color}20`}/>
          <text x={x+32.5} y="77" textAnchor="middle" fontSize="8.5" fill={color} fontFamily="monospace" fontWeight="bold">BLOCK #{i+1}</text>
          <text x={x+32.5} y="98" textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.6)">{label}</text>
          <text x={x+32.5} y="113" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.25)" fontFamily="monospace">{color.slice(1,5)}...{i*7+4}f</text>
          {/* Hash link */}
          {i<3 && (
            <g style={{animation:`chainSlide 0.3s ease-out ${i*0.25+0.35}s both`}}>
              <line x1={x+65} y1="95" x2={x+80} y2="95" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx={x+72.5} cy="95" r="5" fill="none" stroke={color} strokeWidth="2"/>
            </g>
          )}
        </g>
      ))}
      {/* Append-only legend */}
      <text x="160" y="165" textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">append-only · immutable · publicly verifiable</text>
      {/* Eye */}
      <g style={{animation:"eyePulse 2s ease-in-out infinite"}}>
        <ellipse cx="160" cy="195" rx="22" ry="12" fill="none" stroke="rgba(169,255,0,0.4)" strokeWidth="2"/>
        <circle cx="160" cy="195" r="6" fill="rgba(169,255,0,0.2)" stroke="#A9FF00" strokeWidth="1.5"/>
        <circle cx="160" cy="195" r="3" fill="#A9FF00"/>
      </g>
      <text x="160" y="222" textAnchor="middle" fontSize="8.5" fill="rgba(169,255,0,0.5)" fontFamily="monospace">anyone can verify</text>
      <style>{`
        @keyframes chainSlide{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes eyePulse{0%,100%{opacity:.5}50%{opacity:1}}
      `}</style>
    </svg>
  );
}

function SlideSVG({ id }: { id: string }) {
  if (id === "vs") return <VsSVG />;
  if (id === "agency") return <AgencySVG />;
  if (id === "infra") return <InfraSVG />;
  if (id === "cli") return <CliSVG />;
  if (id === "charter") return <CharterSVG />;
  if (id === "distribution") return <DistributionSVG />;
  if (id === "flight") return <FlightSVG />;
  if (id === "transparency") return <TransparencySVG />;
  return null;
}

/* ─── Modal ──────────────────────────────────────────────────────── */
export function IntroModal() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    // Only show for first-time visitors
    const seen = localStorage.getItem("bondit:intro-seen");
    if (!seen) {
      setVisible(true);
    }

    function handleReplay() {
      setSlide(0);
      setVisible(true);
    }
    window.addEventListener("bondit:replay-intro", handleReplay);
    return () => window.removeEventListener("bondit:replay-intro", handleReplay);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem("bondit:intro-seen", "1");
  }

  if (!visible) return null;

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(20,24,40,0.55)", backdropFilter: "blur(10px)" }}
    >
      <div className="relative w-full max-w-[460px] glass !rounded-2xl overflow-hidden animate-fade-in shadow-[0_32px_80px_rgba(0,0,0,0.3)] flex flex-col max-h-[85vh] sm:max-h-[90vh]">

        {/* Top lime accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#A9FF00] to-transparent flex-shrink-0" style={{animation:"glowLine 3s ease-in-out infinite"}}/>

        {/* Close / Skip button — always visible */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-[#8B8FA3] hover:text-[#F1F1F4] transition-all z-10 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.15]"
          aria-label="Skip intro"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider">Skip</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* SVG illustration */}
        <div className="h-[160px] sm:h-[240px] relative overflow-hidden flex-shrink-0" style={{background:"linear-gradient(to bottom, rgba(191,198,216,0.4), rgba(202,208,224,0.15))"}}>
          <SlideSVG id={current.id} />
        </div>

        {/* Text content */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-5 pb-4 sm:pb-6 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#56566A] mb-1.5">{current.subtitle}</div>
          <h2 className="font-display text-[16px] sm:text-[21px] font-bold text-[#F1F1F4] mb-1.5 sm:mb-3 leading-tight">{current.title}</h2>
          <p className="text-[11px] sm:text-[13px] text-[#8B8FA3] leading-[1.5] sm:leading-[1.6]">{current.body}</p>

          {/* Comparison table for slide 1 */}
          {current.comparison && (
            <div className="mt-3 rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_60px_60px] sm:grid-cols-[1fr_68px_68px] text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-2 sm:px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
                <span className="text-[#56566A]"></span>
                <span className="text-center text-[#56566A]">Pump</span>
                <span className="text-center text-[#A9FF00]">BondIt</span>
              </div>
              {/* Rows */}
              {current.comparison.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1fr_60px_60px] sm:grid-cols-[1fr_68px_68px] px-2 sm:px-3 py-[5px] sm:py-[6px] text-[10px] sm:text-[11px] items-center ${
                    i % 2 === 0 ? "bg-white/[0.01]" : ""
                  } ${row.highlight ? "border-l-2 border-l-[#A9FF00]/40" : ""}`}
                >
                  <span className="text-[#8B8FA3] font-medium">{row.label}</span>
                  <span className="text-center text-[#56566A] font-mono">{row.pump}</span>
                  <span className="text-center text-[#A9FF00] font-mono font-semibold">{row.bondit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Nav row */}
          <div className="flex items-center justify-between mt-3 sm:mt-6 pt-2">
            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === slide
                      ? "w-5 bg-[#A9FF00] shadow-[0_0_8px_rgba(169,255,0,0.5)]"
                      : "w-1.5 bg-[#1A1A28]/[0.15] hover:bg-[#1A1A28]/[0.25]"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {slide > 0 && (
                <button
                  onClick={() => setSlide(slide - 1)}
                  className="text-[12px] text-[#56566A] hover:text-[#F1F1F4] px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all"
                >
                  Back
                </button>
              )}
              {slide === 0 && (
                <button
                  onClick={dismiss}
                  className="text-[12px] text-[#56566A] hover:text-[#F1F1F4] px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all"
                >
                  Skip
                </button>
              )}
              <button
                onClick={isLast ? dismiss : () => setSlide(slide + 1)}
                className="btn-glow !py-2 !px-5 !text-[13px]"
              >
                {isLast ? "Let's go →" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
