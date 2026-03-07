"use client";

export default function CLIPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
      {/* ═══ HEADER ═══ */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A9FF00] to-[#88CC00] flex items-center justify-center shadow-[0_0_20px_rgba(169,255,0,0.3)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-[#F1F1F4] mb-2">CLI Tools</h1>
        <p className="text-sm text-[#8B8FA3]">Launch and manage tokens from your terminal or agent pipeline</p>
      </div>

      {/* ═══ INSTALL ═══ */}
      <div className="glass-card glass-card-glow mb-6">
        <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
          Quick Install
        </h2>
        <div className="bg-white/[0.04] rounded-lg px-4 py-3 font-mono text-[13px] text-[#F1F1F4] flex items-center justify-between">
          <code>npm install -g @bondit/cli</code>
          <button
            onClick={() => navigator.clipboard.writeText("npm install -g @bondit/cli")}
            className="text-[10px] text-[#8B8FA3] hover:text-[#A9FF00] transition-colors px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08]"
          >
            Copy
          </button>
        </div>
        <p className="text-[11px] text-[#8B8FA3] mt-2">Or run commands directly with <code className="text-[#F1F1F4]">npx @bondit/cli</code> — no global install needed.</p>
      </div>

      {/* ═══ LAUNCH FLOW ═══ */}
      <div className="glass-card mb-6">
        <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
          Launch Flow
        </h2>
        <p className="text-[12px] text-[#8B8FA3] leading-relaxed mb-4">
          Four steps to deploy a fully Agency-stewarded token from your terminal. Powered by <span className="font-semibold text-[#F1F1F4]">Phantom Server SDK</span> for secure managed wallet signing — agents never touch raw private keys.
        </p>
        <div className="space-y-2">
          {[
            { step: "1", cmd: "npx @bondit/cli launch init", desc: "Interactive wizard — creates bondit-launch.json config" },
            { step: "2", cmd: "npx @bondit/cli launch validate", desc: "Validates config, Phantom credentials, and RPC connection" },
            { step: "3", cmd: "npx @bondit/cli launch simulate", desc: "Dry-run on RPC — catches errors before spending SOL" },
            { step: "4", cmd: "npx @bondit/cli launch create", desc: "Signs and submits the launch transaction on-chain" },
          ].map((row) => (
            <div key={row.step} className="flex items-start gap-3 group">
              <span className="w-5 h-5 rounded-full bg-[#A9FF00]/15 flex items-center justify-center text-[10px] font-mono font-bold text-[#A9FF00] flex-shrink-0 mt-0.5">{row.step}</span>
              <div className="flex-1 min-w-0">
                <code className="block text-[12px] font-mono text-[#F1F1F4] bg-white/[0.04] px-2.5 py-1.5 rounded-lg truncate">{row.cmd}</code>
                <span className="text-[10px] text-[#4C5D84] mt-0.5 block">{row.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                "npx @bondit/cli launch init && npx @bondit/cli launch validate && npx @bondit/cli launch simulate && npx @bondit/cli launch create"
              );
            }}
            className="flex-1 px-3 py-2 text-[11px] font-medium text-[#F1F1F4] bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors text-center"
          >
            Copy Full Command
          </button>
          <button
            onClick={() => {
              const config = JSON.stringify({
                name: "My Token",
                symbol: "MYTKN",
                uri: "https://example.com/metadata/my-token.json",
                mode: "native",
                walletProvider: "phantom",
                rpcUrl: "https://api.devnet.solana.com",
                idempotencyKey: "bondit_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10),
              }, null, 2);
              const blob = new Blob([config], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "bondit-launch.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex-1 px-3 py-2 text-[11px] font-medium text-[#F1F1F4] bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors text-center"
          >
            Download Config JSON
          </button>
        </div>
      </div>

      {/* ═══ STATUS CHECK ═══ */}
      <div className="glass-card mb-6">
        <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
          Check Launch Status
        </h2>
        <p className="text-[12px] text-[#8B8FA3] leading-relaxed mb-3">
          After launching, query the on-chain state of any token:
        </p>
        <div className="bg-white/[0.04] rounded-lg px-4 py-3 font-mono text-[12px] text-[#F1F1F4]">
          <code>npx @bondit/cli launch status --mint &lt;TOKEN_MINT&gt;</code>
        </div>
        <p className="text-[10px] text-[#4C5D84] mt-2">Returns charter params, curve progress, stewardship state, and flight mode eligibility.</p>
      </div>

      {/* ═══ WALLET PROVIDERS ═══ */}
      <div className="glass-card mb-6">
        <h2 className="font-display text-lg font-semibold text-[#F1F1F4] mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
          Wallet Providers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass-card-interactive !p-4 !border-[#A9FF00]/20 !bg-[#A9FF00]/[0.04]">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-lime text-[9px]">Recommended</span>
            </div>
            <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-1">Phantom Server SDK</h3>
            <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
              Managed wallets with server-side signing. Best for agents and automated pipelines. No raw key exposure.
            </p>
            <div className="mt-2 space-y-1">
              {["PHANTOM_ORG_ID", "PHANTOM_APP_ID", "PHANTOM_API_KEY"].map((v) => (
                <code key={v} className="block text-[10px] font-mono text-[#4C5D84]">{v}</code>
              ))}
            </div>
          </div>
          <div className="glass-card-interactive !p-4 opacity-60">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-yellow text-[9px]">Legacy</span>
            </div>
            <h3 className="text-[13px] font-semibold text-[#F1F1F4] mb-1">Keypair File</h3>
            <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
              Raw Solana keypair JSON file. Suitable for local dev only. Not recommended for production.
            </p>
            <div className="mt-2">
              <code className="block text-[10px] font-mono text-[#4C5D84]">--keypair ./id.json</code>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PHANTOM SETUP NOTE ═══ */}
      <div className="px-3 py-2.5 rounded-xl bg-[#A9FF00]/[0.06] border border-[#A9FF00]/[0.12]">
        <p className="text-[11px] text-[#8B8FA3] leading-relaxed">
          Get Phantom Server SDK credentials at <span className="font-mono text-[#F1F1F4]">portal.phantom.app</span>. Same on-chain programs as the web UI — the CLI is just a different signing path to the same deterministic protocol.
        </p>
      </div>
    </div>
  );
}
