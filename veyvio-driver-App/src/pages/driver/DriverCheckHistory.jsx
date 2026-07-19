import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime, formatUkNumber } from "@/lib/uk-locale";
import { getDriverCheckHistory } from "@/services/vehicle-check.service";

function resultLabel(result, outcome) {
  if (result === "nil_defect") return "Nil defects";
  if (result === "failed") {
    if (outcome === "critical") return "Critical defects";
    return "Defects reported";
  }
  return "Passed";
}

function resultTone(result, outcome) {
  if (result === "nil_defect" || result === "passed") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (outcome === "critical") return "text-red-700 bg-red-50 border-red-200";
  return "text-amber-800 bg-amber-50 border-amber-200";
}

export default function DriverCheckHistory({ driver }) {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void getDriverCheckHistory(driver).then((res) => {
      if (!res.ok) setError(res.message);
      else setChecks(res.checks);
      setLoading(false);
    });
  }, [driver]);

  return (
    <div className={op.pageBg}>
      <DriverOperationalHeader
        title="My vehicle checks"
        subtitle="Walkarounds you have submitted"
        backTo="/vehicle/checks"
      />

      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground text-sm justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-6">No checks submitted yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {checks.map((check) => (
              <li key={check.id}>
                <Link
                  to={`/check/history/${check.id}`}
                  className={`flex items-center gap-3 rounded-2xl border p-4 ${op.cardInteractive}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">{check.registration}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${resultTone(check.result, check.outcome)}`}>
                        {check.resultLabel ?? resultLabel(check.result, check.outcome)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started {formatUkDateTime(check.startedAt ?? check.checkedAt)}
                      {check.odometer ? ` · ${formatUkNumber(check.odometer)} mi/km` : ""}
                    </p>
                    {check.templateLabel ? (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.templateLabel}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
