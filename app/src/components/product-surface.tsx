import type { ReactNode } from "react";

interface SurfaceMetric {
  label: string;
  value: string;
  accentClassName?: string;
}

interface SurfaceSection {
  title: string;
  description?: string;
  items?: Array<{
    label: string;
    value: string;
    accentClassName?: string;
  }>;
  footer?: string;
  content?: ReactNode;
}

interface ProductSurfaceProps {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  badgeClassName?: string;
  metrics: SurfaceMetric[];
  sections: SurfaceSection[];
}

function MetricCard({ label, value, accentClassName }: SurfaceMetric) {
  return (
    <div className="glass-card !p-4">
      <div className="stat-label mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${accentClassName ?? "text-[#F1F1F4]"}`}>{value}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: string;
  accentClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12px]">
      <span className="text-[#8B8FA3]">{label}</span>
      <span className={`font-mono text-right ${accentClassName ?? "text-[#F1F1F4]"}`}>{value}</span>
    </div>
  );
}

export function ProductSurface({
  eyebrow,
  title,
  description,
  badge,
  badgeClassName,
  metrics,
  sections,
}: ProductSurfaceProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
      <div className="glass-card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B8FA3] mb-2">{eyebrow}</div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <h1 className="font-display text-3xl font-bold text-[#F1F1F4]">{title}</h1>
              <span className={`badge ${badgeClassName ?? "badge-violet"}`}>{badge}</span>
            </div>
            <p className="text-[13px] text-[#8B8FA3] leading-relaxed max-w-3xl">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div key={section.title} className="glass-card h-full">
            <h2 className="font-display text-[15px] font-semibold text-[#F1F1F4] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A9FF00] shadow-[0_0_6px_rgba(169,255,0,0.5)]" />
              {section.title}
            </h2>
            {section.description ? <p className="text-[12px] text-[#8B8FA3] leading-relaxed mb-4">{section.description}</p> : null}
            {section.items?.length ? (
              <div className="space-y-3">
                {section.items.map((item) => (
                  <DetailRow key={`${section.title}-${item.label}`} {...item} />
                ))}
              </div>
            ) : null}
            {section.content ? <div className={section.items?.length ? "mt-4" : ""}>{section.content}</div> : null}
            {section.footer ? <div className="mt-4 pt-4 border-t border-white/[0.06] text-[12px] text-[#D9D9D9]">{section.footer}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
