import { ProductSurface } from "@/components/product-surface";

export default function MorePage() {
  return (
    <ProductSurface
      eyebrow="Technical Documentation"
      title="Docs"
      description="How BondIt launches and stewards tokens under the hood. This page documents the OpenClaw advisory integration, keeper execution pipeline, and the exact backend boundaries between AI guidance and deterministic protocol actions."
      badge="Live Architecture"
      badgeClassName="badge-blue"
      metrics={[
        { label: "On-Chain Programs", value: "5" },
        { label: "Keeper Jobs", value: "4", accentClassName: "text-[#A9FF00]" },
        { label: "AI Execution Rights", value: "None", accentClassName: "text-[#FF3B5C]" },
        { label: "Advisory Endpoints", value: "3", accentClassName: "text-white" },
      ]}
      sections={[
        {
          title: "OpenClaw Backend Integration",
          description: "What OpenClaw powers today and how it plugs into each launch without custody or execution authority.",
          items: [
            { label: "Service", value: "services/openclaw-ai (package: @bondit/ai)" },
            { label: "Role", value: "Advisory only: reports, anomaly scans, Q&A" },
            { label: "API", value: "POST /api/reports/daily/:launchId" },
            { label: "API", value: "POST /api/reports/weekly/:launchId" },
            { label: "API", value: "POST /api/query" },
            { label: "Frontend wiring", value: "app/src/lib/api.ts via NEXT_PUBLIC_AI_API_URL" },
            { label: "Spec doc", value: "docs/agent-authority-architecture.md" },
            { label: "Hard boundary", value: "AI cannot execute trades or modify policy parameters", accentClassName: "text-[#FF3B5C]" },
          ],
          footer: "OpenClaw is your intelligence layer, not your signer. Deterministic protocol components still hold execution authority.",
        },
        {
          title: "Per-Launch Agency Execution Path",
          description: "The concrete lifecycle every token follows, from genesis to flight mode.",
          items: [
            { label: "Genesis", value: "launch-factory create_launch mints 80/15/5 allocations" },
            { label: "Curve phase", value: "Bonding curve active until graduation threshold" },
            { label: "Graduation", value: "record_graduation links policy + venue adapter" },
            { label: "Stewardship", value: "keeper monitor + execute + compound jobs run on schedule" },
            { label: "Flight checks", value: "keeper evaluates holders/top10/treasury or forced sunset" },
            { label: "Flight mode", value: "record_flight_mode transitions to permanent agency sunset" },
          ],
          footer: "Recommendation: market this as deterministic agency infrastructure, not discretionary AI trading.",
        },
        {
          title: "Infra, Data Flow, and Ops",
          description: "How services connect in deployment and where production hardening is still in progress.",
          items: [
            { label: "Indexer (3001)", value: "Streams events, builds launch analytics API" },
            { label: "Keeper", value: "Cron scheduler for monitor/execute/compound/flight checks" },
            { label: "OpenClaw AI (3002)", value: "Generates reports and answers launch questions" },
            { label: "Database", value: "Postgres via DATABASE_URL (Supabase-compatible)" },
            { label: "Frontend", value: "Reads indexer + advisory APIs, never signs backend actions" },
            { label: "Current TODOs", value: "Keeper DB hydration + tx submission + AI grounding to indexed data", accentClassName: "text-[#F59E0B]" },
          ],
          footer: "Next docs upgrade: include sequence diagrams + example payloads for each backend endpoint.",
        },
      ]}
    />
  );
}
