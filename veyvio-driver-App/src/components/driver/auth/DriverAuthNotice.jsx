import { Mail, ShieldCheck, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";

const ICONS = {
  signup: Mail,
  reset: KeyRound,
  verify: ShieldCheck,
  success: CheckCircle2,
  error: AlertCircle,
};

export function DriverAuthNotice({ variant = "signup", title, children, className = "" }) {
  const Icon = ICONS[variant] ?? Mail;
  const tone =
    variant === "error"
      ? "border-destructive/30 bg-destructive/5"
      : variant === "success"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-2xl border p-4 ${tone} ${className}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold text-foreground">{title}</p> : null}
          <div
            className={
              title
                ? "mt-2 text-sm leading-relaxed text-muted-foreground"
                : "text-sm leading-relaxed text-muted-foreground"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DriverAuthSteps({ steps }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-relaxed text-foreground">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${op.primaryBtn}`}
          >
            {index + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function DriverAuthTip({ children }) {
  return (
    <p className="mt-4 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
