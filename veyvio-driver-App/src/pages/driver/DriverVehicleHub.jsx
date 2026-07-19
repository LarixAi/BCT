import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  FileText,
  History,
  MapPin,
  PackageCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OperationalPage,
  InfoRow,
  DriverSectionTitle,
  StatusPill,
} from "./DriverOperationalPageParts";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  loadDriverBootstrap,
  walkaroundSafetyFromHomeSummary,
} from "@/services/driver-bootstrap.service";
import { getWalkaroundSafetyStatus } from "@/services/vehicle-check.service";

function checkStatusFromSafety(safety) {
  if (!safety?.registration) {
    return {
      label: "No vehicle",
      tone: "neutral",
      detail: "Publish a duty with a vehicle to start today’s check",
      to: "/jobs",
    };
  }
  if (safety.vehicleBlocked) {
    return {
      label: "Blocked",
      tone: "blocked",
      detail: `${safety.registration} cannot enter service until defects are cleared`,
      to: "/defects",
    };
  }
  if (safety.checkComplete && safety.result !== "failed") {
    return {
      label: "Complete",
      tone: "good",
      detail: `${safety.registration} walkaround on record for today`,
      to: "/vehicle/checks",
    };
  }
  if (safety.result === "failed") {
    return {
      label: "Defects open",
      tone: "warning",
      detail: "Walkaround found issues — review before you move",
      to: "/check",
    };
  }
  return {
    label: "Due",
    tone: "warning",
    detail: `Complete the walkaround for ${safety.registration} before service`,
    to: "/check",
  };
}

function applyBootstrapVehicle(boot, setters) {
  if (!boot) return;
  const duty = boot.duties?.[0] ?? null;
  const dutyVehicle = duty?.vehicle;
  const summaryVehicle = boot.legacy?.homeSummary?.vehicleAssignment;
  setters.setVehicle(dutyVehicle || summaryVehicle || null);
  setters.setDepotName(duty?.reportingLocation || boot.operator?.depotName || "");
  setters.setDutyRef(duty?.routeName || duty?.reference || "");
  setters.setSignedOn(
    Boolean(duty?.actualSignOnAt) || duty?.lifecycleStatus === "in_progress",
  );
  const fromSummary = walkaroundSafetyFromHomeSummary(boot.legacy?.homeSummary);
  if (fromSummary) setters.setSafety((prev) => prev ?? fromSummary);
}

export default function DriverVehicleHub({ driver }) {
  const { session, bootstrap: sessionBootstrap } = useDriverSupabaseAuth();
  const [vehicle, setVehicle] = useState(null);
  const [depotName, setDepotName] = useState("");
  const [dutyRef, setDutyRef] = useState("");
  const [signedOn, setSignedOn] = useState(false);
  const [safety, setSafety] = useState(() =>
    walkaroundSafetyFromHomeSummary(sessionBootstrap?.legacy?.homeSummary),
  );
  const [loading, setLoading] = useState(() => !sessionBootstrap);

  useEffect(() => {
    if (sessionBootstrap) {
      applyBootstrapVehicle(sessionBootstrap, {
        setVehicle,
        setDepotName,
        setDutyRef,
        setSignedOn,
        setSafety,
      });
      setLoading(false);
    }
  }, [sessionBootstrap]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const [boot, walkaround] = await Promise.all([
        loadDriverBootstrap({ depotId, force: false }).catch(() => null),
        getWalkaroundSafetyStatus(driver).catch(() => null),
      ]);
      if (cancelled) return;

      if (boot?.ok) {
        applyBootstrapVehicle(boot.bootstrap, {
          setVehicle,
          setDepotName,
          setDutyRef,
          setSignedOn,
          setSafety,
        });
      }
      if (walkaround) setSafety(walkaround);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver, session?.activeDepotId, session?.depots]);

  const reg =
    vehicle?.registrationNumber ||
    vehicle?.registration ||
    safety?.registration ||
    null;
  const fleet = vehicle?.fleetNumber || "—";
  const makeModel = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  const unassigned = !reg;
  const checkUi = useMemo(() => checkStatusFromSafety(safety), [safety]);

  if (loading) {
    return (
      <OperationalPage title="Current vehicle" subtitle="Loading your assigned vehicle…">
        <DriverPageLoader label="Loading vehicle…" />
      </OperationalPage>
    );
  }

  return (
    <OperationalPage
      title="Current vehicle"
      subtitle={
        unassigned
          ? "No vehicle on a published duty yet."
          : "Vehicle from your published Command duty."
      }
    >
      {unassigned ? (
        <div className={`mb-4 p-4 ${op.card}`}>
          <p className="text-base font-semibold text-foreground">No vehicle assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When dispatch publishes a duty with a vehicle, it will show here for checks and
            handback.
          </p>
          <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
            <Link to="/jobs">Open trips</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--ridova-navy)] p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Assigned vehicle
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-wide tabular-nums">{reg}</h2>
              <p className="mt-1 text-sm text-white/70">
                {makeModel || "From published duty"}
                {dutyRef ? ` · ${dutyRef}` : ""}
              </p>
            </div>
            <StatusPill status={signedOn ? "good" : "neutral"}>
              {signedOn ? "On duty" : "Assigned"}
            </StatusPill>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/60">Depot</p>
              <p className="mt-1 font-semibold leading-snug">{depotName || "—"}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/60">Fleet no.</p>
              <p className="mt-1 font-semibold tabular-nums">{fleet}</p>
            </div>
          </div>
        </div>
      )}

      <DriverSectionTitle>Before you move</DriverSectionTitle>
      <div className={op.listCard}>
        <InfoRow
          icon={ClipboardCheck}
          label="Daily vehicle check"
          detail={checkUi.detail}
          status={{ label: checkUi.label, tone: checkUi.tone }}
          to={checkUi.to}
        />
        <InfoRow
          icon={History}
          label="Completed checks"
          detail="Walkarounds you have submitted"
          to="/vehicle/checks"
        />
        <InfoRow
          icon={Wrench}
          label="Report defect"
          detail="Opens on the Admin defects register"
          to="/defects"
        />
        <InfoRow
          icon={MapPin}
          label="Reporting location"
          detail={depotName || "Depot from your duty"}
        />
      </div>

      <DriverSectionTitle>Manage</DriverSectionTitle>
      <div className={op.listCard}>
        <InfoRow
          icon={PackageCheck}
          label="Equipment"
          detail="Accessibility and safety equipment"
          to="/vehicle/equipment"
        />
        <InfoRow
          icon={FileText}
          label="Vehicle documents"
          detail="MOT, insurance and permits"
          to="/vehicle/documents"
        />
        <InfoRow
          icon={ClipboardCheck}
          label="Vehicle handback"
          detail="Mileage, fuel, keys, damage and equipment"
          to="/vehicle/handback"
        />
      </div>

      {!unassigned && checkUi.tone === "warning" && checkUi.to === "/check" ? (
        <Button asChild className={`mt-5 h-12 w-full ${op.primaryBtn}`}>
          <Link to="/check">Start walkaround for {reg}</Link>
        </Button>
      ) : null}
    </OperationalPage>
  );
}
