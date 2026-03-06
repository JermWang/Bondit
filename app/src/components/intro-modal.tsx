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
    id: "charter",
    subtitle: "Every token. Every time.",
    title: "Immutable On-Chain Charter",
    body: "At genesis, a charter is written on-chain and locked forever: 80% bonding curve, 15% treasury, 5% LP reserve, 99/1 LP-to-house fee split, and a 1% protocol fee. No admin keys. No parameter changes after mint. Verifiable by anyone.",
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
      </defs>
      <rect width="320" height="240" fill="url(#igrid)"/>

      {/* LEFT — pump.fun */}
      <text x="72" y="32" textAnchor="middle" fontSize="12" fill="#FF3B5C" fontFamily="monospace" opacity="0.8">pump.fun</text>
      <text x="72" y="48" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="monospace">launches → leaves</text>
      {/* Downward path */}
      <path d="M72 65 C72 100 60 140 55 195" stroke="#FF3B5C" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.5"/>
      {/* Falling rocket */}
      <g style={{animation:"sinkDown 2.5s ease-in-out infinite alternate"}}>
        <path d="M68 98 L72 74 L76 98 L74 106 L70 106Z" fill="#FF3B5C" opacity="0.8"/>
        <path d="M68 106 L63 118 L72 110Z" fill="#FF3B5C" opacity="0.5"/>
        <path d="M76 106 L81 118 L72 110Z" fill="#FF3B5C" opacity="0.5"/>
      </g>
      {/* Falling $ */}
      <text x="45" y="140" fontSize="14" fill="#FF3B5C" opacity="0" style={{animation:"fallDollar 2s ease-in 0.4s infinite"}}>$</text>
      <text x="85" y="155" fontSize="12" fill="#FF3B5C" opacity="0" style={{animation:"fallDollar 2s ease-in 1.1s infinite"}}>$</text>
      <text x="55" y="170" fontSize="10" fill="#FF3B5C" opacity="0" style={{animation:"fallDollar 2s ease-in 0.8s infinite"}}>$</text>
      {/* Abandoned label */}
      <rect x="36" y="200" width="72" height="18" rx="4" fill="rgba(255,59,92,0.1)" stroke="rgba(255,59,92,0.3)" strokeWidth="1"/>
      <text x="72" y="212" textAnchor="middle" fontSize="9" fill="#FF3B5C" fontFamily="monospace">abandoned</text>

      {/* DIVIDER */}
      <line x1="160" y1="20" x2="160" y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <text x="160" y="125" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.15)" fontFamily="monospace">VS</text>

      {/* RIGHT — BondIt */}
      <text x="248" y="32" textAnchor="middle" fontSize="12" fill="#A9FF00" fontFamily="monospace" opacity="0.9">bondit.lol</text>
      <text x="248" y="48" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="monospace">launches → stewards</text>
      {/* Upward path */}
      <path d="M248 195 C248 150 240 100 238 65" stroke="#A9FF00" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.4"/>
      {/* Rising rocket */}
      <g style={{animation:"riseUp 2.5s ease-in-out infinite alternate"}}>
        <path d="M242 128 L248 104 L254 128 L251 136 L245 136Z" fill="#A9FF00"/>
        <path d="M242 136 L235 148 L248 140Z" fill="#88CC00"/>
        <path d="M254 136 L261 148 L248 140Z" fill="#88CC00"/>
        <ellipse cx="248" cy="142" rx="4" ry="7" fill="#A9FF00" opacity="0.7" style={{animation:"flicker 0.25s ease-in-out infinite alternate"}}/>
      </g>
      {/* LP lock */}
      <rect x="223" y="175" width="50" height="20" rx="4" fill="rgba(169,255,0,0.12)" stroke="rgba(169,255,0,0.4)" strokeWidth="1"/>
      <text x="248" y="188" textAnchor="middle" fontSize="8.5" fill="#A9FF00" fontFamily="monospace">LP LOCKED</text>
      {/* Stars */}
      {[[205,75],[275,85],[215,115],[270,65],[230,65]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="2" fill="#A9FF00" style={{animation:`twink ${1.2+i*0.3}s ease-in-out ${i*0.2}s infinite`}}/>
      ))}

      <style>{`
        @keyframes sinkDown{0%{transform:translateY(0) rotate(0deg)}100%{transform:translateY(40px) rotate(15deg)}}
        @keyframes riseUp{0%{transform:translateY(0)}100%{transform:translateY(-30px)}}
        @keyframes fallDollar{0%{opacity:.7;transform:translateY(0)}100%{opacity:0;transform:translateY(45px)}}
        @keyframes flicker{0%{transform:scaleY(1)}100%{transform:scaleY(1.5)}}
        @keyframes twink{0%,100%{opacity:.2}50%{opacity:1}}
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
        {l:"Fee Split",v:"99 / 1",y:143},
        {l:"Protocol Fee",v:"1%",y:164},
        {l:"Max Duration",v:"180 days",y:185},
      ].map(({l,v,y},i)=>(
        <g key={l} style={{animation:`rowIn 0.4s ease-out ${0.2+i*0.14}s both`}}>
          <text x="98" y={y} fontSize="10.5" fill="rgba(255,255,255,0.45)" fontFamily="monospace">{l}</text>
          <text x="220" y={y} textAnchor="end" fontSize="10.5" fill="#A9FF00" fontFamily="monospace" fontWeight="bold">{v}</text>
          <circle cx="228" cy={y-3.5} r="6.5" fill="rgba(0,255,178,0.12)" stroke="#00FFB2" strokeWidth="1"
            style={{animation:`popIn 0.3s ease-out ${0.35+i*0.14}s both`}}/>
          <path d={`M224.5 ${y-3.5} L226.5 ${y-1} L231.5 ${y-7}`} stroke="#00FFB2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{animation:`popIn 0.3s ease-out ${0.35+i*0.14}s both`}}/>
        </g>
      ))}
      {/* Padlock */}
      <g style={{animation:"floatLock 2s ease-in-out infinite"}}>
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
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="fgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(0,255,178,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="url(#fgrid)"/>
      {/* Three conditions */}
      {[
        {label:"≥ 15K Holders",sub:"community depth",color:"#A9FF00",x:55},
        {label:"Top-10 < 18%",sub:"low concentration",color:"white",x:160},
        {label:"Treasury ≤ 5%",sub:"supply distributed",color:"#F59E0B",x:265},
      ].map(({label,sub,color,x},i)=>(
        <g key={label} style={{animation:`popUp 0.5s ease-out ${i*0.2}s both`}}>
          <circle cx={x} cy="85" r="40" fill={`${color}12`} stroke={color} strokeWidth="2"/>
          <text x={x} y="77" textAnchor="middle" fontSize="10.5" fill={color} fontFamily="monospace" fontWeight="bold">{label}</text>
          <text x={x} y="93" textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.4)">{sub}</text>
          <circle cx={x+26} cy={55} r="10" fill={`${color}25`} stroke={color} strokeWidth="1.5" style={{animation:`pulse 1.8s ease-in-out ${i*0.3}s infinite`}}/>
          <text x={x+26} y={60} textAnchor="middle" fontSize="11" fill={color}>✓</text>
        </g>
      ))}
      {/* Converging arrows */}
      <path d="M55 130 Q55 165 160 180" stroke="rgba(169,255,0,0.5)" strokeWidth="2" fill="none"/>
      <path d="M160 130 L160 180" stroke="rgba(6,182,212,0.5)" strokeWidth="2"/>
      <path d="M265 130 Q265 165 160 180" stroke="rgba(245,158,11,0.5)" strokeWidth="2" fill="none"/>
      {/* Flight mode box */}
      <rect x="80" y="180" width="160" height="42" rx="10" fill="rgba(0,255,178,0.1)" stroke="#00FFB2" strokeWidth="2.5">
        <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
      </rect>
      <text x="160" y="200" textAnchor="middle" fontSize="13" fill="#00FFB2" fontFamily="monospace" fontWeight="bold">FLIGHT MODE</text>
      <text x="160" y="214" textAnchor="middle" fontSize="9" fill="rgba(0,255,178,0.55)" fontFamily="monospace">guardrails off · community owns LP</text>
      <style>{`
        @keyframes popUp{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
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
