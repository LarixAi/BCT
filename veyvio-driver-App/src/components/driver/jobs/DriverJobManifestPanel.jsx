import { useRef, useState } from "react";
import { Camera, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { manifestAction, uploadNoShowEvidence } from "@/services/job-manifest.service";

export default function DriverJobManifestPanel({ job, driver, onUpdated, disabled }) {
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noShowRow, setNoShowRow] = useState(null);
  const [noShowReason, setNoShowReason] = useState("");
  const [noShowPhoto, setNoShowPhoto] = useState(null);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const photoInputRef = useRef(null);

  const manifest = job?.manifest ?? [];
  const actionable = manifest.filter((p) => p.canBoard || p.canNoShow || p.canDropOff);

  if (!manifest.length) return null;

  async function run(action, row, reason, extras) {
    const manifestId =
      action === "drop_off" ? row.dropoffManifestId : row.pickupManifestId;
    if (!manifestId) return;

    setBusyId(manifestId);
    setError("");
    setMessage("");

    const result = await manifestAction(job.id, action, manifestId, reason, extras);
    setBusyId(null);

    if (!result.ok) {
      setError(result.message ?? "Action failed.");
      return;
    }

    setMessage(result.message ?? "Updated.");
    setNoShowRow(null);
    setNoShowReason("");
    setNoShowPhoto(null);
    setSignatureConfirmed(false);
    if (onUpdated) await onUpdated();
  }

  async function submitNoShow(row) {
    if (!noShowReason.trim()) {
      setError("A reason is required for no-show.");
      return;
    }

    let evidencePhotoPath = null;
    if (noShowPhoto && driver?.organisationId) {
      const manifestId = row.pickupManifestId;
      const uploaded = await uploadNoShowEvidence(driver, job.id, manifestId, noShowPhoto);
      if (!uploaded.ok) {
        setError(uploaded.message ?? "Photo upload failed.");
        return;
      }
      evidencePhotoPath = uploaded.path;
    }

    await run("no_show", row, noShowReason.trim(), {
      evidencePhotoPath,
      signatureDataUrl: signatureConfirmed ? "driver_confirmed_on_device" : null,
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-gray-500">Passengers</p>
      <ul className="mt-3 space-y-2">
        {manifest.map((row) => (
          <li key={row.passengerId} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {row.preferredName || row.passengerName}
                </p>
                <p className="text-[10px] capitalize text-gray-500">
                  Pickup: {row.pickupStatus ?? "—"} · Drop-off: {row.dropoffStatus ?? "—"}
                </p>
                {row.safeguardingFlag ? (
                  <p className="text-[10px] font-medium text-amber-700 mt-0.5">Safeguarding notes on file</p>
                ) : null}
              </div>
            </div>

            {noShowRow?.passengerId === row.passengerId ? (
              <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold text-amber-900">No-show evidence</p>
                <textarea
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  placeholder="Reason (required)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setNoShowPhoto(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera className="mr-1 h-3.5 w-3.5" />
                    {noShowPhoto ? "Photo attached" : "Add photo"}
                  </Button>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={signatureConfirmed}
                      onChange={(e) => setSignatureConfirmed(e.target.checked)}
                    />
                    Driver confirms on-site check
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={disabled || busyId === row.pickupManifestId}
                    onClick={() => void submitNoShow(row)}
                  >
                    Submit no-show
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => {
                      setNoShowRow(null);
                      setNoShowReason("");
                      setNoShowPhoto(null);
                      setSignatureConfirmed(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {row.canBoard ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-lg text-xs"
                    disabled={disabled || busyId === row.pickupManifestId}
                    onClick={() => void run("board", row)}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Boarded
                  </Button>
                ) : null}
                {row.canNoShow ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    disabled={disabled || busyId === row.pickupManifestId}
                    onClick={() => {
                      setNoShowRow(row);
                      setNoShowReason("");
                      setNoShowPhoto(null);
                      setSignatureConfirmed(false);
                      setError("");
                    }}
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" />
                    No show
                  </Button>
                ) : null}
                {row.canDropOff ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={disabled || busyId === row.dropoffManifestId}
                    onClick={() => void run("drop_off", row)}
                  >
                    Dropped off
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!actionable.length ? (
        <p className="mt-2 text-xs text-gray-500">Arrive at the pickup stop to update passengers.</p>
      ) : null}
      {message ? <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
