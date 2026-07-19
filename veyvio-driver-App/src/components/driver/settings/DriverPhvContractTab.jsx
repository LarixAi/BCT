import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bus, ClipboardCheck, FileText, Loader2, Plane, Radio, School } from "lucide-react";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import DriverStatusBanner from "@/components/driver/operational/DriverStatusBanner";
import { op } from "@/lib/driver-operational-theme";
import { WORK_MODE } from "@/lib/driver-work-modes";
import {
  evaluateContractTransportReadiness,
  loadContractTransportSummary,
} from "@/services/driver-contract-transport.service";

export default function DriverPhvContractTab({ driver }) {
  const mode = WORK_MODE.contract;
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState(null);
  const [summary, setSummary] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [ready, info] = await Promise.all([
        evaluateContractTransportReadiness(driver),
        loadContractTransportSummary(driver),
      ]);
      setReadiness(ready);
      setSummary(info);
    } finally {
      setLoading(false);
    }
  }, [driver]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading && !readiness) {
    return <DriverPageLoader label="Loading PHV route details…" />;
  }

  const fleetVehicle = readiness?.fleetVehicle;

  return (
    <div className="space-y-6">
      <div className={`p-4 ${op.card}`}>
        <div className="flex items-center gap-2">
          <Bus className={`w-5 h-5 ${op.iconTeal}`} />
          <h2 className="text-[15px] font-semibold text-foreground">{mode.label}</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{mode.description}</p>
        <div className="flex flex-wrap gap-2 pt-3">
          {driver.canDoSchoolRuns ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground">
              <School className="w-3 h-3" /> School runs
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground">
            <Plane className="w-3 h-3" /> Airport transfers
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground">
            <Bus className="w-3 h-3" /> Other scheduled routes
          </span>
        </div>
      </div>

      {readiness?.ready ? (
        <DriverStatusBanner variant="success" title="Ready for PHV route work">
          Fleet vehicle assigned, documents in order, and today&apos;s vehicle check is complete.
        </DriverStatusBanner>
      ) : readiness?.blockers?.length ? (
        <DriverStatusBanner variant="warning" title="Complete these steps for route jobs">
          <ul className="space-y-1 mt-1">
            {readiness.blockers.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </DriverStatusBanner>
      ) : null}

      <section>
        <DriverSectionTitle>Assigned fleet vehicle</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground">{mode.vehicleNote}</p>
          {fleetVehicle ? (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="font-mono font-semibold text-foreground">{fleetVehicle.registration}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[fleetVehicle.make, fleetVehicle.model].filter(Boolean).join(" ")}
                {fleetVehicle.depotName ? ` · ${fleetVehicle.depotName}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No fleet vehicle assigned yet. Open Jobs to see upcoming route work, or contact dispatch.
            </p>
          )}
          {summary?.nextJob ? (
            <p className="text-xs text-muted-foreground">
              Next route: <span className="font-medium text-foreground">{summary.nextJob.route_name}</span>
            </p>
          ) : null}
          <Link to="/jobs" className={`text-xs font-semibold ${op.tealAccent}`}>
            View assigned jobs →
          </Link>
        </div>
      </section>

      <section>
        <DriverSectionTitle>Driver documents</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Driving licence, CPC, medical and — for school work — enhanced DBS must be valid and on file.
          </p>
          {driver.canDoSchoolRuns ? (
            <div className={`${op.listCard} divide-y divide-border`}>
              <div className="px-4 py-3.5 bg-card">
                <p className="text-xs text-muted-foreground">DBS expiry</p>
                <p className="text-sm font-medium mt-0.5">{driver.dbsExpiryDate || "Not on file"}</p>
              </div>
              <div className="px-4 py-3.5 bg-card">
                <p className="text-xs text-muted-foreground">Licence no.</p>
                <p className="text-sm font-medium font-mono mt-0.5">{driver.licenceNumber || "—"}</p>
              </div>
            </div>
          ) : null}
          <Link to="/documents" className={`text-xs font-semibold ${op.tealAccent}`}>
            Manage driver documents →
          </Link>
        </div>
      </section>

      <section>
        <DriverSectionTitle>Sign on for route work</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Complete a daily walkaround on your assigned fleet vehicle, then sign on for duty to receive school, airport
            and other scheduled jobs.
          </p>
          <div className="grid gap-2">
            <Link
              to={mode.checkPath}
              className={`flex items-center justify-center gap-2 h-11 rounded-full font-semibold text-sm ${op.primaryBtn}`}
            >
              <ClipboardCheck className="w-4 h-4" />
              {readiness?.checkDone ? "Fleet vehicle check done today" : mode.checkLabel}
            </Link>
            <Link
              to={mode.onlinePath}
              className={`flex items-center justify-center gap-2 h-11 rounded-full font-semibold text-sm border border-border bg-card text-foreground ${
                readiness?.ready ? "" : "opacity-60 pointer-events-none"
              }`}
              aria-disabled={!readiness?.ready}
            >
              <Radio className="w-4 h-4" />
              {mode.onlineLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
