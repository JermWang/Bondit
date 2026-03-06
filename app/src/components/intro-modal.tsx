"use client";

import { useState, useEffect } from "react";

/* ─── Slide data ─────────────────────────────────────────────────── */
const SLIDES = [
  {
    id: "vs",
    subtitle: "BondIt vs pump.fun",
    title: "We Launch AND Stay",
    body: "pump.fun deploys your token and disappears. BondIt deploys and then actively stewards: managing LP on Meteora, compounding 99% of fees back into the pool, and releasing the treasury at a fixed daily rate. No dev dumps. No rug pulls. Deterministic from genesis.",
  },
  {
    id: "ai",
    subtitle: "Intelligence built-in",
    title: "OpenClaw AI Integration",
    body: "Every BondIt launch gets its own dedicated AI agent powered by your choice of Anthropic or OpenAI. Use OpenClaw as your Telegram/Discord gateway, point it to our API, and BondIt will automatically inject live on-chain stats into every response.",
  },
  {
    id: "charter",
    subtitle: "Every token. Every time.",
    title: "Immutable On-Chain Charter",
    body: "At genesis, a charter is written on-chain and locked forever: 80% bonding curve, 15% treasury, 5% LP reserve, 99% of fees redistributed into LP, and a 1% protocol fee. No admin keys. No parameter changes after mint. Verifiable by anyone.",
  },
  {
    id: "distribution",
    subtitle: "Slow. Fair. Transparent.",
    title: "Agency Distribution Curve",
    body: "Treasury releases at exactly 0.20% of remaining per day, hard-capped at 1M tokens daily and 5M weekly. Every release is an on-chain policy event. Distribution progress is visible on every token card so you always know where the guardrails stand.",
  },
  {
    id: "flight",
    subtitle: "Deterministic independence",
    title: "Flight Mode",
    body: "When a token hits 15K holders, top-10 concentration drops below 18%, and treasury remaining falls under 5% — the Agency automatically hands full LP control to the community. If conditions aren't met, a forced sunset triggers at 180 days. No human decision required.",
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
        <pattern id="igrid" width="20" height="20" patternUnits="userSpaceOnUse">
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
      <rect width="320" height="240" fill="url(#igrid)"/>

      {/* LEFT — pump.fun chart */}
      <text x="72" y="24" textAnchor="middle" fontSize="11" fill="#FF3B5C" fontFamily="monospace" opacity="0.85">pump.fun</text>

      {/* Axes */}
      <line x1="18" y1="40" x2="18" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <line x1="18" y1="165" x2="140" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>

      {/* Pump-and-dump chart area fill */}
      <path d="M22 155 C32 150 42 140 55 95 C62 68 68 48 75 42 C82 48 90 80 100 130 C108 155 118 162 140 163 L140 165 L22 165Z"
        fill="url(#redFade)" style={{animation:"chartDraw 1.5s ease-out 0.2s both"}}/>
      {/* Pump-and-dump chart line */}
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
          <text x="12" y={y} fontSize="9" fill="#FF3B5C" fontFamily="monospace" opacity="0.55">✕ {text}</text>
        </g>
      ))}

      {/* Flatline */}
      <line x1="125" y1="163" x2="142" y2="163" stroke="#FF3B5C" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"
        style={{animation:"fadeIn 0.5s ease-out 1.8s both"}}/>

      {/* DIVIDER */}
      <line x1="160" y1="16" x2="160" y2="228" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <text x="160" y="122" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.12)" fontFamily="monospace">VS</text>

      {/* RIGHT — BondIt chart */}
      <text x="248" y="24" textAnchor="middle" fontSize="11" fill="#A9FF00" fontFamily="monospace" opacity="0.9">bondit.lol</text>

      {/* Axes */}
      <line x1="178" y1="40" x2="178" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <line x1="178" y1="165" x2="305" y2="165" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>

      {/* Guardrail zone (shaded band) */}
      <path d="M182 135 C200 128 225 110 250 95 C270 84 290 75 305 68 L305 90 C290 97 270 106 250 115 C225 128 200 142 182 150Z"
        fill="rgba(169,255,0,0.06)" stroke="none"
        style={{animation:"fadeIn 0.8s ease-out 0.5s both"}}/>

      {/* Upper guardrail */}
      <path d="M182 135 C200 128 225 110 250 95 C270 84 290 75 305 68"
        stroke="rgba(169,255,0,0.2)" strokeWidth="1" strokeDasharray="3 3" fill="none"
        style={{animation:"chartDraw 1.5s ease-out 0.5s both"}}/>
      {/* Lower guardrail */}
      <path d="M182 150 C200 142 225 128 250 115 C270 106 290 97 305 90"
        stroke="rgba(169,255,0,0.2)" strokeWidth="1" strokeDasharray="3 3" fill="none"
        style={{animation:"chartDraw 1.5s ease-out 0.5s both"}}/>

      {/* Steady growth chart area fill */}
      <path d="M182 155 C195 148 210 138 230 120 C245 108 265 97 280 88 C290 82 298 78 305 75 L305 165 L182 165Z"
        fill="url(#greenFade)" style={{animation:"chartDraw 1.8s ease-out 0.3s both"}}/>
      {/* Steady growth chart line */}
      <path d="M182 155 C195 148 210 138 230 120 C245 108 265 97 280 88 C290 82 298 78 305 75"
        stroke="#A9FF00" strokeWidth="2" strokeLinecap="round" fill="none"
        style={{animation:"chartDraw 1.8s ease-out 0.3s both"}}/>

      {/* Guardrail label */}
      <g style={{animation:"fadeIn 0.5s ease-out 1.2s both"}}>
        <text x="308" y="65" fontSize="6.5" fill="rgba(169,255,0,0.45)" fontFamily="monospace">guardrails</text>
      </g>

      {/* Stewardship event dots on chart */}
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
          <text x="178" y={y} fontSize="9" fill="#A9FF00" fontFamily="monospace" opacity="0.6">✓ {text}</text>
        </g>
      ))}

      {/* Flight mode badge */}
      <g style={{animation:"fadeIn 0.5s ease-out 2.3s both"}}>
        <rect x="178" y="210" width="74" height="16" rx="4" fill="rgba(0,255,178,0.1)" stroke="rgba(0,255,178,0.3)" strokeWidth="1"/>
        <text x="215" y="221" textAnchor="middle" fontSize="7" fill="#00FFB2" fontFamily="monospace">→ flight mode</text>
      </g>

      <style>{`
        @keyframes chartDraw{from{opacity:0;stroke-dashoffset:400;stroke-dasharray:400}to{opacity:1;stroke-dashoffset:0;stroke-dasharray:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>
    </svg>
  );
}

function AiSVG() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="agrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(139,92,246,0.07)" strokeWidth="0.5"/>
        </pattern>
        <linearGradient id="aiGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill="url(#agrid)"/>

      {/* Central AI Node */}
      <g style={{animation:"floatNode 3s ease-in-out infinite"}}>
        <circle cx="160" cy="110" r="30" fill="url(#aiGlow)" stroke="#8B5CF6" strokeWidth="2"/>
        <circle cx="160" cy="110" r="22" fill="none" stroke="#A78BFA" strokeWidth="1" strokeDasharray="4 4" style={{animation:"spinSlow 10s linear infinite"}}/>
        {/* Abstract face/claw symbol */}
        <path d="M152 105 L168 105 M160 112 L160 120" stroke="#F1F1F4" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="152" cy="105" r="1.5" fill="#F1F1F4"/>
        <circle cx="168" cy="105" r="1.5" fill="#F1F1F4"/>
      </g>
      
      {/* Label */}
      <text x="160" y="155" textAnchor="middle" fontSize="10" fill="#A78BFA" fontFamily="monospace" fontWeight="bold">OPENCLAW AI</text>

      {/* Data streams (animated lines) */}
      <g stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.6">
        <path d="M80 60 Q120 60 140 90" style={{animation:"streamFlow 2s linear infinite"}}/>
        <path d="M240 60 Q200 60 180 90" style={{animation:"streamFlow 2s linear infinite reverse"}}/>
        <path d="M100 170 Q130 170 145 135" style={{animation:"streamFlow 1.5s linear infinite"}}/>
        <path d="M220 170 Q190 170 175 135" style={{animation:"streamFlow 1.5s linear infinite reverse"}}/>
      </g>

      {/* Peripheral nodes */}
      {[
        {cx:75, cy:55, label:"Telegram"},
        {cx:245, cy:55, label:"Discord"},
        {cx:95, cy:175, label:"Charter Data"},
        {cx:225, cy:175, label:"Live Dist"},
      ].map(({cx,cy,label}, i) => (
        <g key={label} style={{animation:`fadeIn 0.5s ease-out ${i*0.2}s both`}}>
          <circle cx={cx} cy={cy} r="18" fill="rgba(139,92,246,0.1)" stroke="#8B5CF6" strokeWidth="1.5"/>
          <text x={cx} y={cy+3} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)" fontFamily="monospace">{label}</text>
          <circle cx={cx} cy={cy-18} r="3" fill="#A78BFA">
            <animate attributeName="opacity" values="0.2;1;0.2" dur={`${1.5+i*0.5}s`} repeatCount="indefinite"/>
          </circle>
        </g>
      ))}

      {/* Pulse rings from center */}
      <circle cx="160" cy="110" r="30" fill="none" stroke="#A78BFA" strokeWidth="1">
        <animate attributeName="r" values="30; 80" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5; 0" dur="2s" repeatCount="indefinite"/>
      </circle>

      <style>{`
        @keyframes floatNode{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spinSlow{from{transform:rotate(0deg);transform-origin:160px 110px}to{transform:rotate(360deg);transform-origin:160px 110px}}
        @keyframes streamFlow{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}
        @keyframes fadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
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
        {l:"Curve Supply",v:"80%",y:80},
        {l:"Treasury",v:"15%",y:101},
        {l:"LP Reserve",v:"5%",y:122},
        {l:"Fee Redistribution",v:"99% to LP",y:143},
        {l:"Protocol Fee",v:"1%",y:164},
        {l:"Max Duration",v:"180 days",y:185},
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
  if (id === "ai") return <AiSVG />;
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
    try {
      if (!localStorage.getItem("bondit_intro_v2")) {
        setVisible(true);
      }
    } catch {}

    function handleReplay() {
      setSlide(0);
      setVisible(true);
    }
    window.addEventListener("bondit:replay-intro", handleReplay);
    return () => window.removeEventListener("bondit:replay-intro", handleReplay);
  }, []);

  function dismiss() {
    try { localStorage.setItem("bondit_intro_v2", "1"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(20,24,40,0.55)", backdropFilter: "blur(10px)" }}
    >
      <div className="relative w-full max-w-[460px] glass !rounded-2xl overflow-hidden animate-fade-in shadow-[0_32px_80px_rgba(0,0,0,0.3)]">

        {/* Top lime accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#A9FF00] to-transparent" style={{animation:"glowLine 3s ease-in-out infinite"}}/>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-[#56566A] hover:text-[#F1F1F4] transition-colors z-10 p-1 rounded-lg hover:bg-white/[0.06]"
          aria-label="Skip intro"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* SVG illustration */}
        <div className="h-[240px] relative overflow-hidden" style={{background:"linear-gradient(to bottom, rgba(191,198,216,0.4), rgba(202,208,224,0.15))"}}>
          <SlideSVG id={current.id} />
        </div>

        {/* Text content */}
        <div className="px-6 pt-5 pb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#56566A] mb-1.5">{current.subtitle}</div>
          <h2 className="font-display text-[21px] font-bold text-[#F1F1F4] mb-3 leading-tight">{current.title}</h2>
          <p className="text-[13px] text-[#8B8FA3] leading-[1.6]">{current.body}</p>

          {/* Nav row */}
          <div className="flex items-center justify-between mt-6">
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
