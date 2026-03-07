import { ProductSurface } from "@/components/product-surface";

export default function LivePage() {
  return (
    <ProductSurface
      eyebrow="Live Market Surface"
      title="BondIt Live"
      description="Track active launches, graduation pressure, and stewardship momentum in one discovery-first view. This is the operator-grade radar surface for what is moving on BondIt right now."
      badge="Market Pulse"
      badgeClassName="badge-green"
      metrics={[
        { label: "Active Launches", value: "4" },
        { label: "24h Flow", value: "$17.6M", accentClassName: "text-[#A9FF00]" },
        { label: "Graduating Soon", value: "2", accentClassName: "text-[#A9FF00]" },
        { label: "Flight Mode", value: "1", accentClassName: "text-[#00FFB2]" },
      ]}
      sections={[
        {
          title: "Market Pulse",
          description: "The highest-signal live conditions across discovery, curve demand, and post-graduation stewardship.",
          items: [
            { label: "Top mover", value: "MOODENG +1842%", accentClassName: "text-[#00FFB2]" },
            { label: "Most watched", value: "BRETT / 8,921 replies", accentClassName: "text-[#A9FF00]" },
            { label: "Highest velocity", value: "GIGA / $892K 24h", accentClassName: "text-[#A9FF00]" },
            { label: "Most mature", value: "BRETT / Flight Mode", accentClassName: "text-[#00FFB2]" },
          ],
          footer: "Discovery, dashboard, and advisory surfaces now read live indexer data. This page is the next candidate for a fully realtime multi-panel rollout.",
        },
        {
          title: "Transition Watch",
          description: "Tokens approaching important lifecycle thresholds that merit operator attention.",
          items: [
            { label: "Curve to graduation", value: "PNUT 67%" },
            { label: "Stewardship day", value: "GIGA day 12" },
            { label: "Treasury threshold", value: "MOODENG 5.8% remaining" },
            { label: "Concentration risk", value: "GIGA 19.2% top-10", accentClassName: "text-[#FF3B5C]" },
          ],
        },
        {
          title: "Operator Notes",
          description: "What this page is positioned to expose next on top of the grounded indexer and advisory stack.",
          items: [
            { label: "Realtime feed", value: "Indexed trade + launch events" },
            { label: "Discovery sort", value: "Volume, activity, velocity, risk" },
            { label: "Alerts", value: "Graduation, anomaly, flight triggers" },
            { label: "Copilot hooks", value: "Ask why this token is trending" },
          ],
        },
      ]}
    />
  );
}
