"use client";

import { useState } from "react";

const CONTRACT_ADDRESS = "LFac1111111111111111111111111111111111111111";

export function CopyContractButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="ca-btn relative flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all duration-300 overflow-hidden"
      data-copied={copied ? "true" : "false"}
      title={CONTRACT_ADDRESS}
    >
      {/* Animated border trace — sits behind content */}
      <span className="ca-border-trace" />

      {/* Inner background */}
      <span
        className="absolute inset-[1px] rounded-[7px] transition-all duration-300 z-[1]"
        style={{
          background: copied ? "rgba(169,255,0,0.15)" : "rgba(10,10,15,0.95)",
        }}
      />

      {/* Content */}
      <span className="relative z-[2] flex items-center gap-1.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-300"
          style={{ transform: copied ? "scale(1.2)" : "scale(1)" }}
        >
          {copied ? (
            <path d="M20 6L9 17l-5-5" />
          ) : (
            <>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </>
          )}
        </svg>
        <span
          className="transition-all duration-300"
          style={{ letterSpacing: copied ? "0.06em" : "0.03em" }}
        >
          {copied ? "Copied!" : "CA"}
        </span>
      </span>

      <style>{`
        .ca-btn {
          color: #A9FF00;
          text-shadow: 0 0 8px rgba(169,255,0,0.4);
        }
        .ca-btn:hover {
          text-shadow: 0 0 12px rgba(169,255,0,0.6);
        }

        /* Border trace: conic gradient that spins on hover */
        .ca-border-trace {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          z-index: 0;
          background: rgba(169,255,0,0.15);
          transition: opacity 0.3s;
        }
        .ca-btn:hover .ca-border-trace {
          background: conic-gradient(
            from var(--ca-angle, 0deg),
            transparent 0%,
            #A9FF00 12%,
            transparent 24%,
            transparent 100%
          );
          animation: caTrace 1.8s linear infinite;
          opacity: 1;
        }

        @property --ca-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes caTrace {
          from { --ca-angle: 0deg; }
          to   { --ca-angle: 360deg; }
        }

        /* Copied state glow burst */
        .ca-btn[data-copied="true"] .ca-border-trace {
          background: rgba(169,255,0,0.4) !important;
          animation: caPulse 0.5s ease-out forwards !important;
        }
        @keyframes caPulse {
          0%   { opacity: 1; }
          100% { opacity: 0.15; }
        }
      `}</style>
    </button>
  );
}
