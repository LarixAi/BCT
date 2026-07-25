import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OperationalPage,
  DriverSectionTitle,
  StatusPill,
} from "./DriverOperationalPageParts";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  shouldSuggestAdBlueDefect,
  validateAdBlueRefillForm,
  vehicleUsesAdBlue,
} from "@/lib/adblue-refill";
import { resolveAssignedVehicleId } from "@/lib/vehicle-readiness";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";
import { loadAdBlueRecords, submitAdBlueRefill } from "@/services/adblue-refill.service";

const FILL_TYPES = [
  ["full", "Filled to full"],
  ["partial", "Partial top-up"],
  ["emergency", "Emergency"],
];

const WARNING_OPTIONS = [
  ["none", "No warning"],
  ["low", "Low AdBlue warning"],
  ["no_restart", "No-restart countdown"],
  ["system_fault", "SCR / emissions fault"],
];

const CLEARED_OPTIONS = [
  ["yes", "Yes"],
  ["no", "No"],
  ["not_checked", "Not checked yet"],
  ["requires_drive", "Needs a drive cycle"],
];

export default function DriverAdBlueRefill({ driver }) {
  const { session, bootstrap: sessionBootstrap } = useDriverSupabaseAuth();
  const [vehicle, setVehicle] = useState(null);
  const [dutyId, setDutyId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    mileage: "",
    amountLitres: "",
    fillType: "partial",
    sourceType: "depot_dispenser",
    sourceLabel: "",
    warningBefore: "none",
    warningCleared: "yes",
    physicallyAddedBy: "self",
    physicallyAddedByName: "",
    spillOrContamination: false,
    notes: "",
  });

  const vehicleId = useMemo(
    () => resolveAssignedVehicleId(sessionBootstrap, vehicle),
    [sessionBootstrap, vehicle],
  );
  const reg =
    vehicle?.registrationNumber ||
    vehicle?.registration ||
    sessionBootstrap?.assignedVehicleReadiness?.registrationNumber ||
    "";
  const usesAdBlue = vehicleUsesAdBlue(vehicle ?? sessionBootstrap?.assignedVehicleReadiness);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const activeDepotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await refreshCommandBootstrap(activeDepotId).catch(() => null);
      const duty = boot?.ok ? boot.bootstrap?.duties?.[0] : sessionBootstrap?.duties?.[0];
      const nextVehicle = duty?.vehicle ?? null;
      if (!cancelled) {
        setVehicle(nextVehicle);
        setDutyId(duty?.dutyId || duty?.id || "");
        setDepotId(activeDepotId || duty?.depotId || "");
      }
      const id = resolveAssignedVehicleId(boot?.bootstrap ?? sessionBootstrap, nextVehicle);
      if (id) {
        const records = await loadAdBlueRecords(id).catch(() => ({ ok: false }));
        if (!cancelled && records.ok) setHistory(records.records ?? []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.id, session?.activeDepotId, session?.depots, sessionBootstrap]);

  const defectSuggested = shouldSuggestAdBlueDefect({
    warningBefore: form.warningBefore,
    warningCleared: form.warningCleared,
    spillOrContamination: form.spillOrContamination,
  });

  async function onSubmit() {
    setError("");
    setMessage("");
    if (!confirmed) {
      setError("Confirm you are recording AdBlue for this vehicle.");
      return;
    }
    const validation = validateAdBlueRefillForm(form);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    if (!vehicleId) {
      setError("No vehicle assigned on your published duty.");
      return;
    }

    setBusy(true);
    const result = await submitAdBlueRefill({
      vehicleId,
      depotId,
      dutyId,
      mileage: Number(form.mileage),
      amountLitres: Number(form.amountLitres),
      fillType: form.fillType,
      sourceType: form.sourceType,
      sourceLabel: form.sourceLabel || null,
      warningBefore: form.warningBefore,
      warningCleared: form.warningCleared,
      physicallyAddedBy: form.physicallyAddedBy,
      physicallyAddedByName: form.physicallyAddedBy === "self" ? null : form.physicallyAddedByName,
      spillOrContamination: form.spillOrContamination,
      notes: form.notes,
      linkedDutyId: dutyId || null,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.message || "AdBlue refill could not be recorded.");
      return;
    }

    setMessage(
      `${result.record?.amountLitres ?? form.amountLitres} litres recorded in Command at ${Number(form.mileage).toLocaleString("en-GB")} miles.`,
    );
    if (result.record?.createDefectSuggested || defectSuggested) {
      setError(
        "AdBlue warning did not clear or spill was reported — raise an AdBlue system defect before returning the vehicle to service.",
      );
    }
    const refreshed = await loadAdBlueRecords(vehicleId);
    if (refreshed.ok) setHistory(refreshed.records ?? []);
  }

  if (loading) {
    return (
      <OperationalPage title="Record AdBlue" subtitle="Loading vehicle…" backTo="/vehicle">
        <DriverPageLoader label="Loading AdBlue…" />
      </OperationalPage>
    );
  }

  if (!reg) {
    return (
      <OperationalPage title="Record AdBlue" subtitle="No vehicle on duty." backTo="/vehicle">
        <div className={`p-4 ${op.card}`}>
          <p className="font-semibold">No vehicle assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish a duty with a vehicle before recording AdBlue.
          </p>
          <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
            <Link to="/vehicle">Back to vehicle</Link>
          </Button>
        </div>
      </OperationalPage>
    );
  }

  if (!usesAdBlue) {
    return (
      <OperationalPage title="Record AdBlue" subtitle="Not required for this vehicle." backTo="/vehicle">
        <div className={`p-4 ${op.card}`}>
          <p className="font-semibold">{reg} does not use AdBlue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AdBlue applies to diesel and most hybrid coaches — not electric or petrol-only vehicles.
          </p>
          <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
            <Link to="/vehicle">Back to vehicle</Link>
          </Button>
        </div>
      </OperationalPage>
    );
  }

  return (
    <OperationalPage
      title="Record AdBlue"
      subtitle="AdBlue goes in the blue emissions tank only — never the diesel tank."
      backTo="/vehicle"
    >
      <div className={`mb-4 p-4 ${op.card}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{reg}</p>
          </div>
          <StatusPill status="neutral">
            <span className="inline-flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5" />
              AdBlue
            </span>
          </StatusPill>
        </div>
        <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          I am recording AdBlue for this vehicle
        </label>
      </div>

      <DriverSectionTitle>Mileage and quantity</DriverSectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <label className={`block p-4 ${op.card}`}>
          <span className="text-sm font-medium">Odometer (miles)</span>
          <input
            inputMode="numeric"
            value={form.mileage}
            onChange={(e) => setForm((p) => ({ ...p, mileage: e.target.value }))}
            className={`mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base tabular-nums ${op.input}`}
            placeholder="82416"
          />
        </label>
        <label className={`block p-4 ${op.card}`}>
          <span className="text-sm font-medium">Litres added</span>
          <input
            inputMode="decimal"
            value={form.amountLitres}
            onChange={(e) => setForm((p) => ({ ...p, amountLitres: e.target.value }))}
            className={`mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base tabular-nums ${op.input}`}
            placeholder="18.4"
          />
        </label>
      </div>

      <div className={`mt-3 p-4 ${op.card}`}>
        <p className="text-sm font-medium">Fill type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FILL_TYPES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, fillType: value }))}
              className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                form.fillType === value
                  ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/10"
                  : "border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <DriverSectionTitle>Warning and source</DriverSectionTitle>
      <div className={`space-y-3 p-4 ${op.card}`}>
        <label className="block text-sm">
          <span className="font-medium">Warning before top-up</span>
          <select
            value={form.warningBefore}
            onChange={(e) => setForm((p) => ({ ...p, warningBefore: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
          >
            {WARNING_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Did the warning clear?</span>
          <select
            value={form.warningCleared}
            onChange={(e) => setForm((p) => ({ ...p, warningCleared: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
          >
            {CLEARED_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.spillOrContamination}
            onChange={(e) => setForm((p) => ({ ...p, spillOrContamination: e.target.checked }))}
            className="h-5 w-5"
          />
          Spill or possible contamination occurred
        </label>
        <label className="block text-sm">
          <span className="font-medium">Notes (optional)</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className={`mt-2 w-full rounded-xl border border-border bg-background p-3 text-base ${op.input}`}
            placeholder="Pump reference or operational context"
          />
        </label>
      </div>

      {defectSuggested ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          After recording, report an AdBlue system defect if the warning has not cleared.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {message}
        </p>
      ) : null}

      <Button
        type="button"
        disabled={busy}
        onClick={() => void onSubmit()}
        className={`mt-4 h-12 w-full ${op.primaryBtn}`}
      >
        {busy ? "Recording…" : "Confirm AdBlue record"}
      </Button>

      {history.length ? (
        <>
          <DriverSectionTitle>Recent refills</DriverSectionTitle>
          <div className={op.listCard}>
            {history.slice(0, 5).map((record) => (
              <div key={record.id} className="border-b border-border px-4 py-3 last:border-b-0">
                <p className="font-semibold tabular-nums">{record.amountLitres} litres</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(record.occurredAt).toLocaleString("en-GB")} ·{" "}
                  {record.mileage?.toLocaleString?.("en-GB") ?? record.mileage} miles
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </OperationalPage>
  );
}
