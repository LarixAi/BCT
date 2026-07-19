import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OperationalPage,
  DriverSectionTitle,
  StatusPill,
} from "./DriverOperationalPageParts";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";

const RETURN_CHECKS = [
  { id: "bay", label: "Vehicle parked in allocated bay" },
  { id: "interior", label: "Interior left clean and clear" },
  { id: "bodywork", label: "No new body damage" },
  { id: "equipment", label: "All equipment returned" },
  { id: "lost_property", label: "No lost property remains" },
  { id: "keys", label: "Keys returned to the correct location" },
];

const FUEL_OPTIONS = ["Full", "75%", "50%", "25%", "Low / needs fuel"];

function storageKey(driverId, reg) {
  return `veyvio.handback.v1.${driverId || "driver"}.${reg || "vehicle"}`;
}

function emptyForm() {
  return {
    endMileage: "",
    fuelLevel: "75%",
    notes: "",
    checks: Object.fromEntries(RETURN_CHECKS.map((c) => [c.id, false])),
    submittedAt: null,
  };
}

export default function DriverVehicleHandback({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const [reg, setReg] = useState("");
  const [depotName, setDepotName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await refreshCommandBootstrap(depotId).catch(() => null);
      const duty = boot?.ok ? boot.bootstrap?.duties?.[0] : null;
      const vehicle = duty?.vehicle;
      const nextReg =
        vehicle?.registrationNumber ||
        vehicle?.registration ||
        driver?.assignedVehicleRegistration ||
        "";
      setReg(nextReg);
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

  const allChecksDone = useMemo(
    () => RETURN_CHECKS.every((c) => form.checks[c.id]),
    [form.checks],
  );
  const canSubmit = Boolean(form.endMileage.trim()) && allChecksDone && !form.submittedAt;

  const toggleCheck = (id) => {
    if (form.submittedAt) return;
    setForm((prev) => ({
      ...prev,
      checks: { ...prev.checks, [id]: !prev.checks[id] },
    }));
  };

  const submit = () => {
    if (!canSubmit) return;
    setSaving(true);
    const next = {
      ...form,
      submittedAt: new Date().toISOString(),
      registration: reg,
      depotName,
    };
    try {
      localStorage.setItem(storageKey(driver?.id, reg), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setForm(next);
    setSavedMsg("Handback saved on this device. Yard can collect these details at return.");
    setSaving(false);
  };

  return (
    <OperationalPage
      title="Vehicle handback"
      subtitle="Record condition and return details at the end of duty."
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

          <DriverSectionTitle>Return checks</DriverSectionTitle>
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

          {savedMsg ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              {savedMsg}
            </p>
          ) : null}

          {!form.submittedAt && !allChecksDone ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Tick every return check and enter end mileage before submitting.
            </p>
          ) : null}

          <Button
            type="button"
            disabled={!canSubmit || saving}
            onClick={submit}
            className={`mt-4 h-12 w-full ${op.primaryBtn}`}
          >
            {form.submittedAt ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Handback saved
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5" />
                {saving ? "Saving…" : "Submit vehicle handback"}
              </span>
            )}
          </Button>
        </>
      )}
    </OperationalPage>
  );
}
