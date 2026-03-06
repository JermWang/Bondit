import { ProductSurface } from "@/components/product-surface";

export default function SupportPage() {
  return (
    <ProductSurface
      eyebrow="Operator Support"
      title="Support Center"
      description="Everything an operator or creator needs to understand BondIt’s deterministic lifecycle, debug launch issues, and navigate charter-driven stewardship without guessing."
      badge="Guided Ops"
      badgeClassName="badge-blue"
      metrics={[
        { label: "Runbooks", value: "6" },
        { label: "Common Issues", value: "12" },
        { label: "Launch FAQ", value: "24", accentClassName: "text-[#A9FF00]" },
        { label: "Status Pages", value: "3", accentClassName: "text-[#00FFB2]" },
      ]}
      sections={[
        {
          title: "Creator Runbooks",
          description: "Structured guidance for the most common creator and operator tasks.",
          items: [
            { label: "Launch checklist", value: "Wallet, metadata, charter, review" },
            { label: "Graduation readiness", value: "Volume, holders, concentration" },
            { label: "Treasury questions", value: "Release caps + decay schedule" },
            { label: "Flight mode", value: "15K holders / ≤18% / ≤5% treasury" },
          ],
        },
        {
          title: "Troubleshooting",
          description: "The issues this support surface is meant to make obvious instead of mysterious.",
          items: [
            { label: "Wallet connection", value: "Adapter session + network state" },
            { label: "Missing launch data", value: "Indexer/API availability" },
            { label: "Keeper delays", value: "Scheduled job + metric ingestion" },
            { label: "AI answers stale", value: "Advisory data freshness" },
          ],
          footer: "This page will evolve into a searchable troubleshooting and runbook center once docs and ops workstreams land.",
        },
        {
          title: "Escalation Paths",
          description: "Clear escalation targets for product, protocol, and operational issues.",
          items: [
            { label: "Protocol anomaly", value: "Policy + program audit queue", accentClassName: "text-[#32CD32]" },
            { label: "Data mismatch", value: "Indexer + SDK contract review" },
            { label: "AI discrepancy", value: "Grounding + report verification" },
            { label: "Launch UX issue", value: "Frontend productization backlog" },
          ],
        },
      ]}
    />
  );
}
