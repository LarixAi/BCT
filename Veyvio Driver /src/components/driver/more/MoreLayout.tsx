import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MoreSubpageLayout({
  title,
  children,
  backTo = "/more",
}: {
  title: string;
  children: ReactNode;
  backTo?: string;
}) {
  return (
    <div className="animate-in-up space-y-4 pb-8">
      <header>
        <Link to={backTo} className="text-sm text-link">
          ‹ More
        </Link>
        <h1 className="mt-2 font-display text-xl font-extrabold tracking-tight">{title}</h1>
      </header>
      {children}
    </div>
  );
}

export function MoreSection({ title, children }: { title: string; children: ReactNode }) {
  if (!title) {
    return <nav className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{children}</nav>;
  }
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">{title}</h2>
      <nav className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </nav>
    </section>
  );
}

export function MoreRow({
  label,
  href,
  badge,
  onClick,
  destructive,
}: {
  label: string;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const content = (
    <>
      <span className={cn("text-sm font-medium", destructive && "text-vor")}>{label}</span>
      <span className="flex items-center gap-2 text-sm text-muted">
        {badge != null && badge !== 0 && (
          <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-bold text-warn">{badge}</span>
        )}
        <ChevronRight className="size-4" />
      </span>
    </>
  );

  const className = "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/40";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={href ?? "/more"} className={className}>
      {content}
    </Link>
  );
}

export function MoreField({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1 border-b border-border px-4 py-3 last:border-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
