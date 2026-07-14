import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function HomeCard({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "navy" | "teal" | "amber" | "red" | "green";
}) {
  const tones = {
    default: "border-border bg-card",
    navy: "border-accent/25 bg-card",
    teal: "border-link/30 bg-link/5",
    amber: "border-warn/35 bg-warn/5",
    red: "border-vor/35 bg-vor/5",
    green: "border-ok/35 bg-ok/5",
  };

  return (
    <section className={cn("rounded-xl border p-4 shadow-sm", tones[tone], className)}>
      {children}
    </section>
  );
}

export function HomeCardLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{children}</p>
  );
}

export function HomeCardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-1 font-display text-lg font-extrabold tracking-tight">{children}</h2>;
}

export function HomeDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
