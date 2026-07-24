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
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";
import {
  BCT_BAY_OPTIONS,
  SPECIAL_LOCATIONS,
  reportDriverParkingLocation,
} from "@/services/yard-parking.service";

const RETURN_CHECKS = [
  { id: "interior", label: "Interior left clean and clear" },
  { id: "bodywork", label: "No new body damage" },
  { id: "equipment", label: "All equipment returned" },
  { id: "lost_property", label: "No lost property remains" },
];

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
    checks: Object.fromEntries(RETURN_CHECKS.map((c) => [c.id, false])),
    submittedAt: null,
  };
}

export default function DriverVehicleHandback({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const [reg, setReg] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [dutyId, setDutyId] = useState("");
  const [depotName, setDepotName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const activeDepotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await refreshCommandBootstrap(activeDepotId).catch(() => null);
      const duty = boot?.ok ? boot.bootstrap?.duties?.[0] : null;
      const vehicle = duty?.vehicle;
      const nextReg =
        vehicle?.registrationNumber ||
        vehicle?.registration ||
        driver?.assignedVehicleRegistration ||
        "";
      setReg(nextReg);
      setVehicleId(vehicle?.vehicleId || vehicle?.id || "");
      setDepotId(activeDepotId || duty?.depotId || "");
      setDutyId(duty?.dutyId || duty?.id || "");
      setDepotName(duty?.reportingLocation || boot?.bootstrap?.operator?.depotName || "");

      try {
        const raw = localStorage.getItem(storageKey(driver?.id, nextReg));
        if (raw) {
          const parsed = JSON.parse(raw);
          setForm({ ...emptyForm(), ...parsed, checks: { ...emptyForm().checks, ...parsed.checks } });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [driver?.id, driver?.assignedVehicleRegistration, session?.activeDepotId, session?.depots]);

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
    const parkingResult = await reportDriverParkingLocation({
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
    });

    if (!parkingResult.ok) {
      setErrorMsg(parkingResult.message || "Parking location could not be recorded.");
      setSaving(false);
      return;
    }

    const next = {
      ...form,
      submittedAt: new Date().toISOString(),
      registration: reg,
      depotName,
      parkingLabel,
    };
    try {
      localStorage.setItem(storageKey(driver?.id, reg), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setForm(next);
    setSavedMsg(`Vehicle parked at ${parkingLabel}. Yard map updated.`);
    setSaving(false);
  };

  return (
    <OperationalPage
      title="Vehicle handback"
      subtitle="Confirm where you parked, then complete return checks."
      backTo="/vehicle"
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
      ) : (
        <>
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

          <div className="mt-4 grid grid-cols-2 gap-3">
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

          <DriverSectionTitle>Keys and return checks</DriverSectionTitle>
          <div className={`mb-3 grid grid-cols-2 gap-3`}>
            <label className={`block p-4 ${op.card}`}>
              <span className="text-sm font-medium text-foreground">Keys returned?</span>
              <select
                disabled={Boolean(form.submittedAt)}
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
                disabled={Boolean(form.submittedAt)}
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

          <div className={op.listCard}>
            {RETURN_CHECKS.map((item) => (
              <label
                key={item.id}
                className="flex min-h-[56px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <input
                  type="checkbox"
                  disabled={Boolean(form.submittedAt)}
                  checked={Boolean(form.checks[item.id])}
                  onChange={() => toggleCheck(item.id)}
                  className="h-5 w-5 accent-[var(--ridova-teal)]"
                />
                <span className="text-[15px] text-foreground">{item.label}</span>
              </label>
            ))}
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

          {!form.submittedAt && (!allChecksDone || !hasParking) ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Select parking location, complete return checks, and enter end mileage before submitting.
            </p>
          ) : null}

          <Button
            type="button"
            disabled={!canSubmit || saving}
            onClick={() => void submit()}
            className={`mt-4 h-12 w-full ${op.primaryBtn}`}
          >
            {form.submittedAt ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Handback complete
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5" />
                {saving ? "Recording…" : "Confirm parking and hand back"}
              </span>
            )}
          </Button>
        </>
      )}
    </OperationalPage>
  );
}
