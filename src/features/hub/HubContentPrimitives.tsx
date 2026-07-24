import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const hubListPanelClass =
  "overflow-hidden rounded-xl border border-[#eaecf0] divide-y divide-[#eaecf0]";

export const hubInsetCardClass =
  "rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4 transition-colors hover:bg-white";

export function HubSectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-[#667085]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function HubMiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "ok" | "warn" | "vor";
}) {
  const valueColor =
    tone === "ok" ? "text-[#027a48]"
    : tone === "warn" ? "text-[#c4320a]"
    : tone === "vor" ? "text-[#b42318]"
    : "text-ink";

  return (
    <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4">
      <div className={cn("font-display text-2xl font-bold tabular-nums", valueColor)}>{value}</div>
      <div className="mt-1 text-sm font-medium text-[#667085]">{label}</div>
    </div>
  );
}

export function HubCallout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  children: ReactNode;
}) {
  const cls =
    tone === "warn" ? "border-[#fddcab] bg-[#fff6ed] text-[#7a2e0e]"
    : tone === "error" ? "border-[#fecdca] bg-[#fef3f2] text-[#7a271a]"
    : tone === "success" ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
    : "border-[#b2ddff] bg-[#eff8ff] text-[#175cd3]";

  return <div className={cn("rounded-xl border px-4 py-3 text-sm", cls)}>{children}</div>;
}

export function HubEmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#e4e7ec] bg-[#fcfcfd] px-4 py-10 text-center">
      <Icon className="mx-auto size-8 text-[#98a2b3]" strokeWidth={1.75} />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-[#667085]">{description}</p>
    </div>
  );
}

export function HubNavList({
  items,
}: {
  items: readonly {
    to: string;
    label: string;
    description: string;
    icon: LucideIcon;
  }[];
}) {
  return (
    <div className={hubListPanelClass}>
      {items.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-[#fcfcfd]"
        >
          <item.icon className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{item.label}</span>
            <span className="mt-0.5 block text-xs text-[#667085]">{item.description}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" />
        </Link>
      ))}
    </div>
  );
}
