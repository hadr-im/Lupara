import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  hint,
  series,
  tone = "primary",
}: {
  label: string;
  value: string;
  delta: number;
  hint?: string;
  series: number[];
  tone?: "primary" | "accent" | "success" | "warning";
}) {
  const up = delta >= 0;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const step = w / (series.length - 1);
  const points = series
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  const stroke = {
    primary: "var(--primary)",
    accent: "var(--accent)",
    success: "var(--success)",
    warning: "var(--warning)",
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl transition hover:border-border">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-3xl transition group-hover:opacity-50"
        style={{ background: stroke }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
            up
              ? "bg-success/15 text-success"
              : "bg-destructive/15 text-destructive",
          )}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta)}%
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-[11px] text-muted-foreground">{hint}</div>
        <svg width={w} height={h} className="overflow-visible">
          <defs>
            <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill={`url(#g-${label})`}
            stroke="none"
            points={`0,${h} ${points} ${w},${h}`}
          />
          <polyline fill="none" stroke={stroke} strokeWidth="1.75" points={points} />
        </svg>
      </div>
    </div>
  );
}