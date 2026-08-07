import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import { op } from "@/lib/driver-operational-theme";
import { getActiveDutyVehicleSummary } from "@/lib/vehicle-swap-gate";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";
import { listAssignableVehicles, selectVehicleForCheck } from "@/services/vehicle-check.service";
import {
  listDriverVehicleSwapRequests,
  requestVehicleSwap,
} from "@/services/vehicle-swap-request.service";

export default function DriverChangeVehicle({ driver, session = null }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeDutyVehicle, setActiveDutyVehicle] = useState(null);
  const [swapReason, setSwapReason] = useState("");
  const [pendingSwap, setPendingSwap] = useState(null);

  useEffect(() => {
    void Promise.all([
      listAssignableVehicles(driver),
      loadDriverBootstrap(),
      listDriverVehicleSwapRequests(),
    ]).then(([list, boot, swaps]) => {
      setOptions(list);
      setSelectedId(list[0]?.vehicleId ?? null);
      if (boot?.ok) setActiveDutyVehicle(getActiveDutyVehicleSummary(boot.bootstrap));
      const pending = (swaps?.requests ?? []).find((row) => row.status === "pending");
      setPendingSwap(pending ?? null);
      setLoading(false);
    });
  }, [driver]);

  const signedOnVehicleId = activeDutyVehicle?.vehicleId ?? null;
  const selectedOption = options.find((opt) => opt.vehicleId === selectedId) ?? null;
  const needsSwapRequest = Boolean(
    signedOnVehicleId && selectedId && String(selectedId) !== String(signedOnVehicleId),
  );

  const displayOptions = useMemo(() => {
    if (!signedOnVehicleId) return options;
    return options;
  }, [options, signedOnVehicleId]);

  const confirm = async () => {
    if (!selectedId) return;

    if (needsSwapRequest) {
      const reason = swapReason.trim();
      if (!reason) {
        setError("Explain why you need a different vehicle — dispatch needs this to approve.");
        return;
      }
      setSaving(true);
      setError("");
      setSuccess("");
      const result = await requestVehicleSwap(driver, session, {
        dutyId: activeDutyVehicle.dutyId,
        currentVehicleId: activeDutyVehicle.vehicleId,
        requestedVehicleId: selectedId,
        reason,
      });
      setSaving(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(
        result.queued
          ? "Swap request saved on this device — dispatch will see it when connection returns."
          : "Swap request sent to dispatch. Keep using your signed-on vehicle until approved.",
      );
      setPendingSwap(result.request ?? { status: "pending", requestedVehicleId: selectedId });
      return;
    }

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
        {activeDutyVehicle ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Signed on — {activeDutyVehicle.registration}</p>
            <p className="mt-1">
              You cannot switch vehicles without dispatch approval. Request a swap below if{" "}
              {activeDutyVehicle.registration} is wrong.
            </p>
          </div>
        ) : null}

        {pendingSwap ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 flex gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Swap request waiting for dispatch</p>
              <p className="mt-1">Keep using {activeDutyVehicle?.registration ?? "your duty vehicle"} until approved.</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground text-sm justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading vehicles…
          </div>
        ) : displayOptions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No vehicles assigned for today. Contact dispatch.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {displayOptions.map((opt) => (
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
                {signedOnVehicleId && String(opt.vehicleId) === String(signedOnVehicleId) ? (
                  <p className="text-xs font-medium text-[#1eaeae] mt-1">Current duty vehicle</p>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {needsSwapRequest && !pendingSwap ? (
          <div className={`mt-4 p-4 space-y-2 ${op.card}`}>
            <p className="text-sm font-semibold text-foreground">Request vehicle swap</p>
            <p className="text-xs text-muted-foreground">
              Dispatch must approve before you can use {selectedOption?.vehicle?.registration ?? "this vehicle"}.
            </p>
            <textarea
              className="w-full rounded-lg border border-border px-3 py-2 text-sm min-h-[80px]"
              placeholder="Why do you need a different vehicle?"
              value={swapReason}
              onChange={(e) => setSwapReason(e.target.value)}
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700 mt-4">{success}</p> : null}

        {displayOptions.length > 0 && !pendingSwap ? (
          <button
            type="button"
            disabled={!selectedId || saving || (needsSwapRequest && !swapReason.trim())}
            onClick={() => void confirm()}
            className={`w-full mt-6 h-12 rounded-full font-semibold disabled:opacity-40 ${op.primaryBtn}`}
          >
            {saving
              ? "Saving…"
              : needsSwapRequest
                ? "Request swap from dispatch"
                : "Use this vehicle"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
