import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col animate-in-up py-2", className)}>
      {children}
    </div>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>{children}</div>
  );
}

export function AuthPrimaryButton({
  children,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "h-12 w-full rounded-xl bg-accent text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthSelectionList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function AuthSelectionButton({
  title,
  meta,
  detail,
  onClick,
}: {
  title: string;
  meta?: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link active:bg-secondary/40"
    >
      <div className="font-bold text-foreground">{title}</div>
      {meta && (
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">{meta}</div>
      )}
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </button>
  );
}
