import { useState } from "react";
import { ArrowDown, ArrowUp, Fuel, MapPin, Plus, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitDriverStopChange } from "@/services/job-stop-changes.service";
import { geocodeDriverStop } from "@/services/job-manifest.service";
import { openGoogleMapsNavigation } from "@/lib/navigation/openExternalNavigation";

const STOP_TYPES = [
  { value: "pickup", label: "Pickup" },
  { value: "dropoff", label: "Drop-off" },
  { value: "depot", label: "Depot" },
  { value: "fuel", label: "Fuel stop" },
  { value: "rest", label: "Rest break" },
  { value: "custom", label: "Custom" },
];

export default function DriverJobItineraryPanel({ job, driver, onUpdated, disabled }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("pickup");
  const [addLabel, setAddLabel] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addPostcode, setAddPostcode] = useState("");
  const [reason, setReason] = useState("");

  const stops = job?.stops ?? [];
  const jobDone = job?.status === "completed" || job?.status === "cancelled";

  async function runChange(change) {
    if (!reason.trim()) {
      setError("Add a reason for this change.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const result = await submitDriverStopChange(job.id, { ...change, reason: reason.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(
      result.mode === "pending"
        ? "Submitted for admin approval."
        : result.message ?? "Change applied.",
    );
    setShowAdd(false);
    setAddLabel("");
    setAddAddress("");
    if (onUpdated) await onUpdated();
  }

  async function moveStop(stopId, direction) {
    await runChange({ changeType: "reorder", stopId, direction });
  }

  async function skipStop(stopId) {
    await runChange({ changeType: "skip", stopId });
  }

  async function addStop() {
    if (!addLabel.trim()) {
      setError("Stop label is required.");
      return;
    }
    if (!addAddress.trim() && !addPostcode.trim()) {
      setError("Address or postcode is required.");
      return;
    }

    let latitude;
    let longitude;
    let address = addAddress.trim();

    const geocoded = await geocodeDriverStop({
      label: addLabel.trim(),
      address: addAddress.trim() || undefined,
      postcode: addPostcode.trim() || undefined,
    });

    if (geocoded.ok) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
      address = geocoded.address || address;
    } else if (!["depot", "fuel", "rest", "custom"].includes(addType)) {
      setError(geocoded.message ?? "Could not geocode address.");
      return;
    }

    await runChange({
      changeType: "add",
      stop: {
        stopType: addType,
        label: addLabel.trim(),
        address: address || undefined,
        postcode: addPostcode.trim() || undefined,
        latitude,
        longitude,
      },
    });
  }

  if (!stops.length) return null;

  const activeStop = stops.find((s) => s.status === "arrived") ?? stops.find((s) => s.status === "planned");

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Route / stops</p>
          {activeStop ? (
            <p className="mt-1 text-sm font-semibold text-gray-900">
              Current: {activeStop.label}
            </p>
          ) : null}
        </div>
        {!jobDone && !disabled ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg"
            onClick={() => setShowAdd((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add stop
          </Button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {stops.map((stop, index) => {
          const isPlanned = stop.status === "planned";
          const canEdit = !jobDone && !disabled && isPlanned;
          return (
            <li
              key={stop.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  <span className="font-mono text-xs text-gray-500 mr-1">#{stop.stopOrder ?? index + 1}</span>
                  <span className="capitalize">{stop.stopType}</span> — {stop.label}
                </p>
                {stop.address ? (
                  <p className="text-xs text-gray-500 truncate">{stop.address}</p>
                ) : null}
                <p className="text-[10px] capitalize text-gray-400 mt-0.5">{stop.status}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {stop.latitude != null && stop.longitude != null ? (
                  <button
                    type="button"
                    className="text-[#1eaeae] text-xs font-medium"
                    onClick={() =>
                      void openGoogleMapsNavigation(
                        { latitude: stop.latitude, longitude: stop.longitude, label: stop.label },
                        { driver, job },
                      )
                    }
                  >
                    <MapPin className="inline h-3 w-3" />
                  </button>
                ) : null}
                {canEdit ? (
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      className="p-1 rounded border border-gray-200 bg-white disabled:opacity-40"
                      onClick={() => void moveStop(stop.id, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === stops.length - 1}
                      className="p-1 rounded border border-gray-200 bg-white disabled:opacity-40"
                      onClick={() => void moveStop(stop.id, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="p-1 rounded border border-gray-200 bg-white"
                      onClick={() => void skipStop(stop.id)}
                      aria-label="Skip stop"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!jobDone && !disabled ? (
        <div className="mt-3">
          <label className="text-xs font-medium text-gray-600">Reason for changes</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required for every stop change"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      {showAdd && !jobDone ? (
        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-gray-200 p-3">
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" /> Add stop
          </p>
          <select
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            {STOP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Stop label"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={addAddress}
            onChange={(e) => setAddAddress(e.target.value)}
            placeholder="Address (recommended)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={addPostcode}
            onChange={(e) => setAddPostcode(e.target.value)}
            placeholder="Postcode"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => void addStop()}
          >
            {busy ? "Saving…" : "Add stop"}
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
