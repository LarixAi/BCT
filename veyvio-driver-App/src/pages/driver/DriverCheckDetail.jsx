import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime } from "@/lib/uk-locale";
import { getSectionLabel } from "@/lib/walkaround-template-engine";
import { getDriverCheckDetail } from "@/services/vehicle-check.service";

export default function DriverCheckDetail({ driver }) {
  const { checkId } = useParams();
  const [loading, setLoading] = useState(true);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!checkId) return;
    void getDriverCheckDetail(driver, checkId).then((res) => {
      if (!res.ok) setError(res.message);
      else setCheck(res.check);
      setLoading(false);
    });
  }, [driver, checkId]);

  const formatTs = (value) => formatUkDateTime(value);

  const responsesBySection = (check?.responses ?? []).reduce((acc, item) => {
    const key = item.sectionKey ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className={op.pageBg}>
      <DriverOperationalHeader title="Check detail" backTo="/check/history" />

      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground text-sm justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        ) : check ? (
          <div className="mt-4 space-y-4">
            <div className={`${op.card} p-4 space-y-2 text-sm`}>
              <Row label="Vehicle" value={check.registration} />
              <Row label="Walkaround started" value={formatTs(check.startedAt)} />
              <Row label="Submitted" value={formatTs(check.submittedAt)} />
              <Row label="Result" value={check.resultLabel ?? check.result?.replace(/_/g, " ")} />
              <Row label="Check type" value={check.checkType?.replace(/_/g, " ") ?? "—"} />
              {(check.odometerReading ?? check.odometer) != null ? (
                <Row label="Odometer" value={String(check.odometerReading ?? check.odometer)} />
              ) : null}
              {check.fuelLevel ? <Row label="Fuel / charge" value={check.fuelLevel} /> : null}
              {check.templateLabel ? <Row label="Template" value={check.templateLabel} /> : null}
            </div>

            {check.result === "nil_defect" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 font-medium">
                Nil defects reported — audit record complete.
              </div>
            ) : null}

            {check.failedItems?.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2">Failed items</h3>
                <ul className="space-y-2">
                  {check.failedItems.map((item) => (
                    <li key={item.key} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                      <p className="font-medium text-red-900">{item.label}</p>
                      {item.note ? <p className="text-xs text-red-800 mt-1">{item.note}</p> : null}
                      <p className="text-xs text-red-700 mt-1 capitalize">{item.severity}</p>
                      {item.photoSignedUrl ? (
                        <img
                          src={item.photoSignedUrl}
                          alt={`Evidence for ${item.label}`}
                          className="mt-2 rounded-lg max-h-48 w-full object-cover border border-red-200"
                        />
                      ) : item.photoPath ? (
                        <p className="text-xs text-red-700 mt-2">Photo on file — contact admin if it does not load here.</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : check.result !== "nil_defect" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 font-medium">
                No defects reported on this check.
              </div>
            ) : null}

            {Object.keys(responsesBySection).length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2">Checklist</h3>
                <div className="space-y-3">
                  {Object.entries(responsesBySection).map(([sectionKey, items]) => (
                    <div key={sectionKey} className={`${op.card} p-3`}>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        {getSectionLabel(sectionKey)}
                      </p>
                      <ul className="space-y-2">
                        {items.map((item) => (
                          <li key={item.itemId} className="text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                            <div className="flex justify-between gap-2">
                              <span className="text-foreground">{item.questionTitle}</span>
                              <StatusPill status={item.responseStatus} />
                            </div>
                            {item.driverNote ? (
                              <p className="text-xs text-muted-foreground mt-1">{item.driverNote}</p>
                            ) : null}
                            {item.photoSignedUrl ? (
                              <img
                                src={item.photoSignedUrl}
                                alt={`Evidence for ${item.questionTitle}`}
                                className="mt-2 rounded-lg max-h-40 w-full object-cover border border-red-200"
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {check.notes ? (
              <div className={`${op.card} p-4 text-sm`}>
                <p className="text-xs text-muted-foreground uppercase">Additional note</p>
                <p className="mt-1">{check.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
    status === "pass"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "fail"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-muted-foreground bg-muted border-border";
  const label = status === "pass" ? "Pass" : status === "fail" ? "Fail" : status === "na" ? "N/A" : status;
  return (
    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${tone}`}>
      {label}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
