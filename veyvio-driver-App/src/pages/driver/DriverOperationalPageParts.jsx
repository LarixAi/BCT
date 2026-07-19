import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import { op } from "@/lib/driver-operational-theme";

export function OperationalPage({ title, subtitle, backTo = "/more", children }) {
  return (
    <DriverPageContainer>
      <div className="mb-5 flex items-start gap-3">
        {backTo ? (
          <Link to={backTo} className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card active:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <p className={op.appLabel}>Veyvio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </DriverPageContainer>
  );
}

export function StatusPill({ status = "good", children }) {
  const tones = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    blocked: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[status] || tones.neutral}`}>{children}</span>;
}

export function InfoRow({ icon: Icon, label, detail, status, to, action }) {
  const content = (
    <div className="flex min-h-[64px] items-center gap-3 border-b border-border bg-card px-4 py-3 last:border-b-0">
      {Icon ? <div className={op.iconWrap}><Icon className={`h-5 w-5 ${op.iconTeal}`} /></div> : null}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-foreground">{label}</p>
        {detail ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p> : null}
      </div>
      {status ? <StatusPill status={status.tone}>{status.label}</StatusPill> : null}
      {action}
      {to ? <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" /> : null}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export { DriverSectionTitle };
