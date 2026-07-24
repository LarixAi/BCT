import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HubMetricCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  tone?: "default" | "ok" | "warn" | "vor";
}) {
  const valueColor =
    tone === "ok" ? "text-[#027a48]"
    : tone === "warn" ? "text-[#c4320a]"
    : tone === "vor" ? "text-[#b42318]"
    : "text-ink";

  const className = cn(
    "flex min-w-[140px] flex-1 flex-col justify-between rounded-2xl border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow sm:min-w-[160px] sm:p-4",
    active ? "border-[#d0d5dd] ring-2 ring-ink/10" : "border-[#e4e7ec] hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)]",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#e4e7ec] bg-[#f9fafb] text-[#667085]">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <span className={cn("mt-3 font-display text-2xl font-bold leading-none tabular-nums", valueColor)}>
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function HubMetricStrip({ children }: { children: ReactNode }) {
  return (
    <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
      {children}
    </section>
  );
}
