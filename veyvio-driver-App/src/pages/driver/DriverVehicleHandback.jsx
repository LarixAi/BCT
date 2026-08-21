import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CheckCircle2, KeyRound, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OperationalPage,
  DriverSectionTitle,
  StatusPill,
} from "./DriverOperationalPageParts";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";
import {
  BCT_BAY_OPTIONS,
  SPECIAL_LOCATIONS,
} from "@/services/yard-parking.service";
import {
  loadCommandHandbackStatus,
  persistHandbackDraft,
  submitVehicleHandback,
} from "@/services/vehicle-handback.service";
import {
  clearHandbackDraft,
  loadHandbackDraft,
} from "@/lib/vehicle-handback-draft.storage";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import {
  VEHICLE_HAND_BACK_CHECKS,
  emptyHandbackChecks,
} from "@/lib/vehicle-handback-checks";

const RETURN_CHECKS = VEHICLE_HAND_BACK_CHECKS;

const FUEL_OPTIONS = ["Full", "75%", "50%", "25%", "Low / needs fuel"];
const KEY_LOCATIONS = ["Key cabinet", "Office", "With yard staff", "Other"];

function storageKey(driverId, reg) {
  return `veyvio.handback.v1.${driverId || "driver"}.${reg || "vehicle"}`;
}

function emptyForm() {
  return {
    endMileage: "",
    fuelLevel: "75%",
    notes: "",
    parkingBay: "",
    parkingType: "BAY",
    freeTextLocation: "",
    keysReturned: true,
    keyLocation: "Key cabinet",
    fullyInsideBay: true,
    checks: emptyHandbackChecks(),
    submittedAt: null,
  };
}

function dutyVehicleFromBootstrap(bootstrap) {
  if (!bootstrap) return null;
  const duties = Array.isArray(bootstrap.duties) ? bootstrap.duties : [];
  const duty =
    duties.find((row) => row?.actualSignOnAt && !row?.actualSignOffAt) ??
    duties.find((row) => String(row?.lifecycleStatus ?? "") === "in_progress") ??
    duties[0] ??
    null;
  if (!duty) return null;

  const vehicle = duty.vehicle;
  const summaryVehicle = bootstrap.legacy?.homeSummary?.vehicleAssignment;
  const reg =
    vehicle?.registrationNumber ||
    vehicle?.registration ||
    summaryVehicle?.registration ||
    "";
  const vehicleId = vehicle?.id || vehicle?.vehicleId || summaryVehicle?.vehicleId || "";

  return {
    reg,
    vehicleId,
    depotId: duty.depotId || null,
    dutyId: duty.id || duty.dutyId || null,
    depotName: duty.reportingLocation || bootstrap.operator?.depotName || "",
  };
}

function applyDutyVehicle(setters, bootstrap, driver) {
  const fromBootstrap = dutyVehicleFromBootstrap(bootstrap);
  if (fromBootstrap?.reg) {
    setters.setReg(fromBootstrap.reg);
    setters.setVehicleId(fromBootstrap.vehicleId);
    setters.setDepotId(fromBootstrap.depotId || "");
    setters.setDutyId(fromBootstrap.dutyId || "");
    setters.setDepotName(fromBootstrap.depotName);
    return fromBootstrap;
  }

  const fallbackReg = driver?.assignedVehicleRegistration || "";
  if (fallbackReg) setters.setReg(fallbackReg);
  return fromBootstrap;
}

function ReturnChecksSummary({ checks, readOnly = false, onToggle }) {
  return (
    <div className={op.listCard}>
      {RETURN_CHECKS.map((item) => {
        const checked = Boolean(checks?.[item.id]);
        if (readOnly) {
          return (
            <div
              key={item.id}
              className="flex min-h-[56px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <CheckCircle2
                className={`h-5 w-5 shrink-0 ${checked ? "text-emerald-600" : "text-muted-foreground/40"}`}
              />
              <span className={`text-[15px] ${checked ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </div>
          );
        }
        return (
          <label
            key={item.id}
            className="flex min-h-[56px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle?.(item.id)}
              className="h-5 w-5 accent-[var(--ridova-teal)]"
            />
            <span className="text-[15px] text-foreground">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function DriverVehicleHandback({ driver }) {
  const { session, bootstrap: sessionBootstrap } = useDriverSupabaseAuth();
  const workspace = resolveDriverWorkspaceScope(driver, session);
  const [reg, setReg] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [dutyId, setDutyId] = useState("");
  const [depotName, setDepotName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!sessionBootstrap) return;
    applyDutyVehicle(
      { setReg, setVehicleId, setDepotId, setDutyId, setDepotName },
      sessionBootstrap,
      driver,
    );
  }, [sessionBootstrap, driver]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingStatus(true);
      const activeDepotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await loadDriverBootstrap({ depotId: activeDepotId, force: false }).catch(() => null);
      const bootstrap = boot?.ok ? boot.bootstrap : sessionBootstrap;
      const resolved = applyDutyVehicle(
        { setReg, setVehicleId, setDepotId, setDutyId, setDepotName },
        bootstrap,
        driver,
      );
      const nextVehicleId = resolved?.vehicleId || "";
      const nextReg = resolved?.reg || driver?.assignedVehicleRegistration || "";

      const commandHandback = nextVehicleId
        ? await loadCommandHandbackStatus({
            bootstrap,
            vehicle: { id: nextVehicleId, vehicleId: nextVehicleId, registrationNumber: nextReg },
          }).catch(() => ({ ok: false, recorded: false }))
        : { ok: false, recorded: false };

      if (cancelled) return;

      if (commandHandback.recorded) {
        if (workspace.companyId && workspace.membershipId && nextVehicleId) {
          clearHandbackDraft(workspace.companyId, workspace.membershipId, nextVehicleId);
        }
        try {
          localStorage.removeItem(storageKey(driver?.id, nextReg));
        } catch {
          /* ignore */
        }
        const parkingLabel = commandHandback.parkingLabel || "your selected bay";
        const refLabel = commandHandback.handbackReference
          ? ` Ref ${commandHandback.handbackReference}.`
          : "";
        setForm({
          ...emptyForm(),
          submittedAt: commandHandback.submittedAt ?? new Date().toISOString(),
          handbackReference: commandHandback.handbackReference,
          parkingLabel,
          checks: commandHandback.handbackChecks ?? emptyHandbackChecks(),
        });
        setSavedMsg(
          `Handback already recorded in Command for ${nextReg || "this vehicle"} at ${parkingLabel}.${refLabel}`,
        );
        setLoadingStatus(false);
        return;
      }

      let restored = null;
      if (workspace.companyId && workspace.membershipId && nextVehicleId) {
        restored = loadHandbackDraft(workspace.companyId, workspace.membershipId, nextVehicleId);
      }
      if (!restored) {
        try {
          const raw = localStorage.getItem(storageKey(driver?.id, nextReg));
          if (raw) restored = JSON.parse(raw);
        } catch {
          /* ignore legacy */
        }
      }
      if (restored && !restored.submittedAt) {
        setForm({
          ...emptyForm(),
          ...restored,
          keysReturned: restored.keysReturned !== false,
          checks: { ...emptyForm().checks, ...restored.checks },
        });
      }
      setLoadingStatus(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.id, driver?.assignedVehicleRegistration, session?.activeDepotId, session?.depots, sessionBootstrap, workspace.companyId, workspace.membershipId]);

  useEffect(() => {
    if (!vehicleId || form.submittedAt || !workspace.companyId || !workspace.membershipId) return;
    persistHandbackDraft(workspace.companyId, workspace.membershipId, vehicleId, form);
  }, [form, vehicleId, workspace.companyId, workspace.membershipId]);

  const parkingLabel = useMemo(() => {
    if (form.parkingType === "BAY" && form.parkingBay) return `Bay ${form.parkingBay}`;
    const special = SPECIAL_LOCATIONS.find((s) => s.id === form.parkingType);
    if (special) return special.label;
    if (form.freeTextLocation) return form.freeTextLocation;
    return "";
  }, [form.parkingBay, form.parkingType, form.freeTextLocation]);

  const allChecksDone = useMemo(
    () => RETURN_CHECKS.every((c) => form.checks[c.id]),
    [form.checks],
  );
  const hasParking = Boolean(parkingLabel);
  const canSubmit =
    Boolean(form.endMileage.trim()) &&
    allChecksDone &&
    hasParking &&
    !form.submittedAt &&
    Boolean(vehicleId);

  const toggleCheck = (id) => {
    if (form.submittedAt) return;
    setForm((prev) => ({
      ...prev,
      checks: { ...prev.checks, [id]: !prev.checks[id] },
    }));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErrorMsg("");
    const special = SPECIAL_LOCATIONS.find((s) => s.id === form.parkingType);
    const parkingResult = await submitVehicleHandback({
      vehicleId,
      depotId,
      dutyId,
      locationType: special?.locationType ?? "BAY",
      bayNumber: form.parkingType === "BAY" ? Number(form.parkingBay) : null,
      freeTextLocation:
        form.parkingType === "other" ? form.freeTextLocation || "Outside marked bay" : null,
      keysReturned: form.keysReturned,
      keyLocation: form.keyLocation,
      fullyInsideBay: form.fullyInsideBay,
      endMileage: form.endMileage,
      fuelLevel: form.fuelLevel,
      notes: form.notes,
      handbackChecks: form.checks,
      companyId: workspace.companyId,
      membershipId: workspace.membershipId,
      driverId: driver?.id,
    });

    if (!parkingResult.ok) {
      setErrorMsg(parkingResult.message || "Handback could not be recorded in Command.");
      setSaving(false);
      return;
    }

    if (parkingResult.queued) {
      setSavedMsg(parkingResult.message);
      setSaving(false);
      return;
    }

    const next = {
      ...form,
      submittedAt: parkingResult.recordedAt ?? new Date().toISOString(),
      registration: reg,
      depotName,
      parkingLabel,
      handbackReference: parkingResult.handbackReport?.handbackReference ?? null,
    };
    if (workspace.companyId && workspace.membershipId && vehicleId) {
      clearHandbackDraft(workspace.companyId, workspace.membershipId, vehicleId);
    }
    setForm(next);
    const refLabel = next.handbackReference ? ` Ref ${next.handbackReference}.` : "";
    setSavedMsg(`Vehicle parked at ${parkingLabel}. Handback recorded in Command.${refLabel}`);
    setSaving(false);
  };

  return (
    <OperationalPage
      title="Vehicle handback"
      subtitle="End of duty — confirm the vehicle is still in good condition, then park and return keys."
      backTo="/duty"
    >
      <div className={`mb-4 p-4 ${op.card}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Returning
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {reg || "No vehicle"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {depotName || "Depot from your duty"}
            </p>
          </div>
          <StatusPill status={form.submittedAt ? "good" : "warning"}>
            {form.submittedAt ? "Submitted" : "In progress"}
          </StatusPill>
        </div>
      </div>

      {loadingStatus ? (
        <div className={`p-4 ${op.card}`}>
          <p className="text-sm text-muted-foreground">Checking Command for an existing handback…</p>
        </div>
      ) : null}

      {!reg ? (
        <div className={`p-4 ${op.card}`}>
          <p className="font-semibold">No vehicle to hand back</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open Current vehicle once a duty with a vehicle is published.
          </p>
          <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
            <Link to="/vehicle">Back to vehicle</Link>
          </Button>
        </div>
      ) : form.submittedAt ? (
        <>
          <div className={`p-4 ${op.card}`}>
            <p className="font-semibold text-foreground">Handback complete</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {savedMsg ||
                `Vehicle condition confirmed and handback recorded in Command for ${reg}.`}
            </p>
            {form.parkingLabel ? (
              <p className="mt-2 text-sm font-medium text-foreground">Parked at {form.parkingLabel}</p>
            ) : null}
            {form.handbackReference ? (
              <p className="mt-1 text-sm text-muted-foreground">Reference {form.handbackReference}</p>
            ) : null}
          </div>

          <DriverSectionTitle>Condition you confirmed</DriverSectionTitle>
          <ReturnChecksSummary checks={form.checks} readOnly />

          <div className="mt-4 grid gap-3">
            <Button asChild className={`h-11 w-full ${op.primaryBtn}`}>
              <Link to="/duty">Return to My duty</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link to="/">Back to home</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link to="/vehicle/timeline">View vehicle timeline</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={`mb-4 p-4 ${op.card} border-[var(--ridova-teal)]/20 bg-[var(--ridova-teal)]/5`}>
            <p className="text-sm font-semibold text-foreground">Before you sign off duty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Walk around {reg} and confirm it is clean, undamaged, and ready for Yard. Tick each
              item below — if you found new damage, report it before you hand back.
            </p>
            <Button asChild variant="outline" className="mt-3 h-10 w-full">
              <Link to="/defects">Report new damage</Link>
            </Button>
          </div>

          <DriverSectionTitle>Vehicle condition</DriverSectionTitle>
          <ReturnChecksSummary checks={form.checks} onToggle={toggleCheck} />

          <DriverSectionTitle>Where have you parked the vehicle?</DriverSectionTitle>
          <div className={`p-4 ${op.card}`}>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4" />
              Select parking location
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {BCT_BAY_OPTIONS.map((bay) => (
                <button
                  key={bay.bayNumber}
                  type="button"
                  disabled={Boolean(form.submittedAt)}
                  onClick={() =>
                    setForm((p) => ({ ...p, parkingType: "BAY", parkingBay: String(bay.bayNumber) }))
                  }
                  className={`min-h-[44px] rounded-xl border text-sm font-bold tabular-nums ${
                    form.parkingType === "BAY" && form.parkingBay === String(bay.bayNumber)
                      ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/10 text-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {bay.bayNumber}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SPECIAL_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  disabled={Boolean(form.submittedAt)}
                  onClick={() => setForm((p) => ({ ...p, parkingType: loc.id, parkingBay: "" }))}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                    form.parkingType === loc.id
                      ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/10"
                      : "border-border"
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
            {form.parkingType === "other" ? (
              <input
                disabled={Boolean(form.submittedAt)}
                placeholder="Describe location"
                value={form.freeTextLocation}
                onChange={(e) => setForm((p) => ({ ...p, freeTextLocation: e.target.value }))}
                className={`mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base ${op.input}`}
              />
            ) : null}
            {parkingLabel ? (
              <p className="mt-3 text-sm font-semibold text-foreground">
                Selected: {parkingLabel}
              </p>
            ) : null}
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={Boolean(form.submittedAt)}
                checked={form.fullyInsideBay}
                onChange={(e) => setForm((p) => ({ ...p, fullyInsideBay: e.target.checked }))}
                className="h-5 w-5"
              />
              Vehicle fully inside the marked bay
            </label>
          </div>

          <DriverSectionTitle>Keys and mileage</DriverSectionTitle>
          <div className={`mb-3 grid grid-cols-2 gap-3`}>
            <label className={`block p-4 ${op.card}`}>
              <span className="text-sm font-medium text-foreground">Keys returned?</span>
              <select
                value={form.keysReturned ? "yes" : "no"}
                onChange={(e) => setForm((p) => ({ ...p, keysReturned: e.target.value === "yes" }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className={`block p-4 ${op.card}`}>
              <span className="text-sm font-medium text-foreground">Key location</span>
              <select
                value={form.keyLocation}
                onChange={(e) => setForm((p) => ({ ...p, keyLocation: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
              >
                {KEY_LOCATIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={`block p-4 ${op.card}`}>
              <span className="text-sm font-medium text-foreground">End mileage</span>
              <input
                inputMode="numeric"
                placeholder="e.g. 48216"
                disabled={Boolean(form.submittedAt)}
                value={form.endMileage}
                onChange={(e) => setForm((p) => ({ ...p, endMileage: e.target.value }))}
                className={`mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base tabular-nums ${op.input}`}
              />
            </label>
            <label className={`block p-4 ${op.card}`}>
              <span className="text-sm font-medium text-foreground">Fuel / charge</span>
              <select
                disabled={Boolean(form.submittedAt)}
                value={form.fuelLevel}
                onChange={(e) => setForm((p) => ({ ...p, fuelLevel: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
              >
                {FUEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            disabled={Boolean(form.submittedAt)}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-border bg-card font-semibold disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            Add handback photos
          </button>

          <label className="mt-4 block text-sm font-medium text-foreground">
            Driver notes
            <textarea
              rows={3}
              disabled={Boolean(form.submittedAt)}
              placeholder="Anything Yard or Operations should know"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className={`mt-2 w-full rounded-2xl border border-border bg-card p-3 text-base ${op.input}`}
            />
          </label>

          {errorMsg ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
              {errorMsg}
            </p>
          ) : null}

          {savedMsg ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              {savedMsg}
            </p>
          ) : null}

          {!form.submittedAt && (!allChecksDone || !hasParking || !form.endMileage.trim()) ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Confirm vehicle condition, select parking, and enter end mileage before submitting.
            </p>
          ) : null}

          <Button
            type="button"
            disabled={!canSubmit || saving || loadingStatus}
            onClick={() => void submit()}
            className={`mt-4 h-12 w-full ${op.primaryBtn}`}
          >
            <span className="flex items-center justify-center gap-2">
              <KeyRound className="h-5 w-5" />
              {saving ? "Recording…" : "Confirm condition and hand back"}
            </span>
          </Button>
        </>
      )}
    </OperationalPage>
  );
}
