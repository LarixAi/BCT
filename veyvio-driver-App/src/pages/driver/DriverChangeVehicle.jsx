import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import { op } from "@/lib/driver-operational-theme";
import { listAssignableVehicles, selectVehicleForCheck } from "@/services/vehicle-check.service";

export default function DriverChangeVehicle({ driver }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void listAssignableVehicles(driver).then((list) => {
      setOptions(list);
      setSelectedId(list[0]?.vehicleId ?? null);
      setLoading(false);
    });
  }, [driver]);

  const confirm = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    const result = await selectVehicleForCheck(driver, selectedId);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate("/check", { replace: true });
  };

  return (
    <div className={op.pageBg}>
      <DriverOperationalHeader title="Change vehicle" subtitle="Select today's assigned vehicle" backTo="/check" />
      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground text-sm justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading vehicles…
          </div>
        ) : options.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No vehicles assigned for today. Contact dispatch.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {options.map((opt) => (
              <button
                key={opt.vehicleId}
                type="button"
                onClick={() => setSelectedId(opt.vehicleId)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                  selectedId === opt.vehicleId ? "border-[#1eaeae] bg-[#1eaeae]/10" : op.card
                }`}
              >
                <p className="font-bold text-foreground">{opt.vehicle?.registration}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[opt.vehicle?.make, opt.vehicle?.model].filter(Boolean).join(" ")}
                  {opt.vehicle?.wheelchair_accessible ? " · WAV" : ""}
                </p>
                {opt.job?.route_name ? (
                  <p className="text-xs text-muted-foreground mt-1">Route: {opt.job.route_name}</p>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}

        {options.length > 0 ? (
          <button
            type="button"
            disabled={!selectedId || saving}
            onClick={() => void confirm()}
            className={`w-full mt-6 h-12 rounded-full font-semibold disabled:opacity-40 ${op.primaryBtn}`}
          >
            {saving ? "Saving…" : "Use this vehicle"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
