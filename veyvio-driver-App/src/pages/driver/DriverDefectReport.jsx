import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { reportDefectViaCommand, refreshCommandBootstrap } from "@/services/command-driver-ops.service";

const SEVERITIES = [
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "critical", label: "Critical" },
];

export default function DriverDefectReport({ driver }) {
  const navigate = useNavigate();
  const { session } = useDriverSupabaseAuth();
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("major");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ref, setRef] = useState("");

  useEffect(() => {
    void (async () => {
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await refreshCommandBootstrap(depotId);
      if (!boot.ok) return;
      const duty = boot.bootstrap?.duties?.[0];
      const vehicle = duty?.vehicle || boot.bootstrap?.legacy?.homeSummary?.vehicleAssignment;
      const id = vehicle?.id || vehicle?.vehicleId;
      const reg = vehicle?.registrationNumber || vehicle?.registration;
      if (id) setVehicleId(String(id));
      if (reg) setVehicleLabel(String(reg));
    })();
  }, [session?.activeDepotId, session?.depots]);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const result = await reportDefectViaCommand({
      description,
      severity,
      vehicleId: vehicleId || undefined,
      depotId: session?.activeDepotId ?? undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRef(result.defect?.defect_reference ?? "");
    setDone(true);
  };

  return (
    <div>
      <DriverOperationalHeader title="Report defect" subtitle="Sent to Veyvio Command for your operator" backTo="/" />
      <div className="px-4 pb-8">
        <CommandBackendNotice
          status="ready"
          title="Defects go to Admin"
          description="Reports are written to the Command defects register for this company."
        />

        {!vehicleLabel ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No vehicle on a published duty yet. You can still submit if dispatch has assigned a vehicle — otherwise ask them first.
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Vehicle on duty: <span className="font-semibold text-foreground">{vehicleLabel}</span>
          </p>
        )}

        {done ? (
          <div className="mt-8 space-y-4">
            <p className="font-medium text-emerald-700">
              Defect reported{ref ? ` (${ref})` : ""}. Dispatch can see it in Admin.
            </p>
            <Button onClick={() => navigate("/")} className={`w-full ${op.primaryBtn}`}>
              Back to home
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className={`mt-1 w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`What is wrong${vehicleLabel ? ` with ${vehicleLabel}` : ""}?`}
                className={`mt-1 w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={submitting || !description.trim()} className={`h-11 w-full ${op.primaryBtn}`}>
              {submitting ? "Sending…" : "Report defect to Command"}
            </Button>
            <p className="text-xs text-muted-foreground">Reporting as {driver?.fullName}</p>
          </form>
        )}
      </div>
    </div>
  );
}
