import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardCheck, Loader2 } from "lucide-react";
import {
  OperationalPage,
  StatusPill,
} from "./DriverOperationalPageParts";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime, formatUkNumber } from "@/lib/uk-locale";
import { getDriverCheckHistory } from "@/services/vehicle-check.service";

function resultTone(result, outcome) {
  if (result === "nil_defect" || result === "passed") return "good";
  if (outcome === "critical" || result === "failed") return "blocked";
  return "warning";
}

function resultLabel(check) {
  if (check.resultLabel) return check.resultLabel;
  if (check.result === "nil_defect") return "Nil defects";
  if (check.result === "failed") {
    return check.outcome === "critical" ? "Critical defects" : "Defects reported";
  }
  if (check.result === "pass_with_advisory") return "Passed with advisory";
  return "Passed";
}

/**
 * Driver-only completed vehicle checks (Command + local history).
 * Route: /vehicle/checks
 */
export default function DriverCompletedVehicleChecks({ driver }) {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getDriverCheckHistory(driver, { limit: 50 }).then((res) => {
      if (cancelled) return;
      if (!res.ok) setError(res.message || "Could not load your checks.");
      else setChecks(Array.isArray(res.checks) ? res.checks : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [driver]);

  const completed = useMemo(
    () =>
      checks.filter((c) => {
        const r = String(c.result ?? "");
        return r && r !== "draft" && r !== "in_progress";
      }),
    [checks],
  );

  return (
    <OperationalPage
      title="Completed checks"
      subtitle="Walkarounds you have submitted — only your records."
      backTo="/vehicle"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your checks…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!loading && !error && completed.length === 0 ? (
        <div className={`p-5 ${op.card}`}>
          <div className="flex items-start gap-3">
            <div className={op.iconWrap}>
              <ClipboardCheck className={`h-5 w-5 ${op.iconTeal}`} />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No checks submitted yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When you finish a daily walkaround, it will appear here with the vehicle and
                result.
              </p>
            </div>
          </div>
          <Link
            to="/check"
            className={`mt-4 flex h-11 items-center justify-center ${op.primaryBtn}`}
          >
            Start today’s walkaround
          </Link>
        </div>
      ) : null}

      {!loading && completed.length > 0 ? (
        <ul className="space-y-2">
          {completed.map((check) => (
            <li key={check.id}>
              <Link
                to={`/check/history/${check.id}`}
                className={`flex items-center gap-3 p-4 ${op.cardInteractive}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {check.registration || "—"}
                    </span>
                    <StatusPill status={resultTone(check.result, check.outcome)}>
                      {resultLabel(check)}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatUkDateTime(check.submittedAt ?? check.checkedAt ?? check.startedAt)}
                    {check.odometer != null
                      ? ` · ${formatUkNumber(check.odometer)} mi/km`
                      : ""}
                  </p>
                  {check.templateLabel ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {check.templateLabel}
                    </p>
                  ) : null}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </OperationalPage>
  );
}
