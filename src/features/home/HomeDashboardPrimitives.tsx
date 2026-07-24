import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-[#e4e7ec] bg-[#f2f4f7] p-1 ${className}`}
      role="tablist"
    >
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all sm:px-3.5 sm:text-xs ${
            value === opt.id
              ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              : "text-[#667085] hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TrendBadge({
  value,
  label = "from last month",
}: {
  value: number;
  label?: string;
}) {
  const positive = value >= 0;
  return (
    <div className="text-right">
      <span
        className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
          positive ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#fef3f2] text-[#b42318]"
        }`}
      >
        {positive ? "+" : ""}
        {value}%
      </span>
      <div className="mt-1 text-[10px] leading-tight text-[#98a2b3]">{label}</div>
    </div>
  );
}

export function KpiMetricCard({
  label,
  value,
  trend,
  icon: Icon,
  to,
}: {
  label: string;
  value: ReactNode;
  trend: number;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[108px] flex-col justify-between rounded-2xl border border-[#e4e7ec] bg-white p-3.5 transition-shadow hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] sm:min-h-[118px] sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085] transition-colors group-hover:border-[#d0d5dd] group-hover:text-ink">
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-[#e4e7ec] bg-[#f9fafb] text-[#667085]">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink sm:text-[28px]">
          {value}
        </span>
        <TrendBadge value={trend} />
      </div>
    </Link>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "progress" | "ok" | "warn" | "review";
}) {
  const toneCls =
    tone === "ok" ? "bg-[#ecfdf3] text-[#027a48]"
    : tone === "warn" ? "bg-[#fff6ed] text-[#c4320a]"
    : tone === "progress" ? "bg-[#fff6ed] text-[#c4320a]"
    : tone === "review" ? "bg-[#f4f3ff] text-[#5925dc]"
    : "bg-[#f2f4f7] text-[#475467]";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneCls}`}>
      {label}
    </span>
  );
}

export function ThickProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped === 0) {
    return <span className="text-xs text-[#98a2b3]">Not started yet</span>;
  }
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eaecf0]">
        <div
          className="h-full rounded-full bg-ink transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-[#667085]">{clamped}%</span>
    </div>
  );
}

export function DashboardSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}
