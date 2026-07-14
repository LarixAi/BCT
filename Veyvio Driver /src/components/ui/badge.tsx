import { cn } from "@/lib/utils";

const variants = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-link/10 text-link",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  destructive: "bg-destructive/10 text-destructive",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}
