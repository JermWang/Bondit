import { ProductSurface } from "@/components/product-surface";

export default function TerminalPage() {
  return (
    <ProductSurface
      eyebrow="Operator Console"
      title="Terminal"
      description="A high-signal operator surface for launch-state inspection, policy execution visibility, and the future command-palette style control plane that makes BondIt feel like pump.fun meets Cursor."
      badge="Command Surface"
      badgeClassName="badge-blue"
      metrics={[
        { label: "Tracked Launches", value: "4" },
        { label: "Policy Actions", value: "8", accentClassName: "text-[#A9FF00]" },
        { label: "Keeper Jobs", value: "3", accentClassName: "text-[#A9FF00]" },
        { label: "Replay Safety", value: "Planned", accentClassName: "text-[#00FFB2]" },
      ]}
      sections={[
        {
          title: "Terminal Modes",
          description: "The operator workflows this command surface is designed to streamline.",
          items: [
            { label: "Inspect", value: "Launch, curve, holders, treasury" },
            { label: "Explain", value: "Why a policy action occurred" },
            { label: "Review", value: "Execution and anomaly timeline" },
            { label: "Simulate", value: "Charter and launch config preview" },
          ],
        },
        {
          title: "Execution Guardrails",
          description: "The terminal will stay operator-grade without violating deterministic stewardship.",
          items: [
            { label: "Autonomy", value: "No discretionary actions", accentClassName: "text-[#FF3B5C]" },
            { label: "Scope", value: "Read-heavy, explain-first" },
            { label: "Writes", value: "Keeper / protocol only" },
            { label: "Auditability", value: "Append-only action traces" },
          ],
          footer: "Discovery, dashboard, launch, and advisory flows are now grounded in live services. This route remains focused on future operator-grade inspection and control tooling.",
        },
        {
          title: "Upcoming Panels",
          description: "The product modules queued for this workspace.",
          items: [
            { label: "Command palette", value: "Search + jump + explain" },
            { label: "Launch debugger", value: "State + event timeline" },
            { label: "Policy timeline", value: "Execution context and diffs" },
            { label: "Operator logs", value: "Keeper + indexer health" },
          ],
        },
      ]}
    />
  );
}
