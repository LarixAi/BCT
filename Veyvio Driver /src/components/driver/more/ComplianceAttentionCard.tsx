import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { complianceSeverityTone } from "@/domain/more/more-helpers";
import type { ComplianceAlert } from "@/types/more";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { cn } from "@/lib/utils";

export function ComplianceAttentionCard({ alerts }: { alerts: ComplianceAlert[] }) {
  if (alerts.length === 0) {
    return (
      <HomeCard tone="green">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-5 text-ok" />
          <div>
            <p className="font-semibold text-ok">Documents up to date</p>
            <p className="text-xs text-muted">No compliance action is currently required.</p>
          </div>
        </div>
      </HomeCard>
    );
  }

  const primary = alerts[0]!;
  const tone = complianceSeverityTone(primary.severity);
  const toneMap = {
    amber: "amber" as const,
    red: "red" as const,
    teal: "teal" as const,
  };

  return (
    <HomeCard tone={toneMap[tone]}>
      <div className="flex gap-3">
        <AlertTriangle className={cn("mt-0.5 size-5 shrink-0", tone === "red" ? "text-vor" : "text-warn")} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            {alerts.length} document{alerts.length === 1 ? "" : "s"} need attention
          </p>
          <p className="font-semibold">{primary.title}</p>
          {alerts.length > 1 && (
            <p className="text-xs text-muted">+ {alerts.length - 1} more item{alerts.length - 1 === 1 ? "" : "s"}</p>
          )}
          <Link
            to={primary.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-link"
          >
            Review documents
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </HomeCard>
  );
}
