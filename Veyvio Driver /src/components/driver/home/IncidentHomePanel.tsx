import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Shield } from "lucide-react";
import { calculateCompleteness, categoryLabel } from "@veyvio/incidents";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { SafetyAssistanceButton } from "@/components/driver/home/SafetyAssistanceButton";
import { useIncidentStore } from "@/store/incidents";

/**
 * @param variant home-exceptions — incomplete reports only (never sit above Home status strip)
 * @param variant full — cards + report/assistance CTAs (legacy / more surfaces)
 */
export function IncidentHomePanel({
  variant = "full",
}: {
  variant?: "full" | "home-exceptions";
}) {
  const records = useIncidentStore((s) => s.records);
  const incomplete = records.filter((record) => record.submission.stage !== "complete");

  if (variant === "home-exceptions") {
    if (incomplete.length === 0) return null;

    return (
      <HomeCard tone="amber">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
          <div className="min-w-0 flex-1">
            <p id="incident-home-heading" className="font-semibold">
              {incomplete.length === 1
                ? "One incident report needs completion"
                : `${incomplete.length} incident reports need completion`}
            </p>
            <p className="mt-1 text-sm text-muted">
              Control has your emergency report. Add photos and statements when it is safe.
            </p>
            <ul className="mt-3 space-y-2">
              {incomplete.slice(0, 3).map((record) => {
                const completeness = calculateCompleteness(record.submission);
                return (
                  <li key={record.localIncidentId}>
                    <Link
                      to="/incidents/$incidentId/complete"
                      params={{ incidentId: record.localIncidentId }}
                      className="flex items-center justify-between gap-3 rounded-xs border border-warn/25 bg-card px-3 py-2.5 text-sm hover:bg-secondary/40"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {record.incidentReference ?? record.localIncidentId}
                        </span>
                        <span className="block text-xs text-muted">
                          {categoryLabel(record.submission.categoryCode)} · {completeness.overall}%
                          complete
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </HomeCard>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="incident-home-heading">
      {incomplete.length > 0 && (
        <HomeCard tone="amber">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
            <div className="min-w-0 flex-1">
              <p id="incident-home-heading" className="font-semibold">
                {incomplete.length === 1
                  ? "One incident report needs completion"
                  : `${incomplete.length} incident reports need completion`}
              </p>
              <p className="mt-1 text-sm text-muted">
                Control has your emergency report. Add photos, witnesses, and statements when it is
                safe.
              </p>
              <ul className="mt-3 space-y-2">
                {incomplete.slice(0, 3).map((record) => {
                  const completeness = calculateCompleteness(record.submission);
                  return (
                    <li key={record.localIncidentId}>
                      <Link
                        to="/incidents/$incidentId/complete"
                        params={{ incidentId: record.localIncidentId }}
                        className="flex items-center justify-between gap-3 rounded-xs border border-warn/25 bg-card px-3 py-2.5 text-sm hover:bg-secondary/40"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {record.incidentReference ?? record.localIncidentId}
                          </span>
                          <span className="block text-xs text-muted">
                            {categoryLabel(record.submission.categoryCode)} · {completeness.overall}%
                            complete
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </HomeCard>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          to="/incidents/report"
          className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-vor/35 bg-vor/10 px-4 text-sm font-bold uppercase tracking-widest text-vor"
        >
          <Shield className="size-4" aria-hidden />
          Report incident
        </Link>
        <SafetyAssistanceButton />
      </div>

      {records.length > 0 && (
        <Link to="/incidents" className="block text-center text-sm font-semibold text-link">
          View all incidents ({records.length})
        </Link>
      )}
    </section>
  );
}
