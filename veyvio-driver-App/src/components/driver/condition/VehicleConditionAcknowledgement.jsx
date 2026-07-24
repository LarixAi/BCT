import { useState } from "react";
import { AlertTriangle, CheckCircle2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { op } from "@/lib/driver-operational-theme";

const ACK_OPTIONS = [
  {
    id: "condition_accepted",
    label: "Condition accepted",
    detail: "Existing damage matches what I can see. Vehicle safe to use.",
  },
  {
    id: "condition_differs",
    label: "Condition differs",
    detail: "Something does not match the recorded condition.",
  },
  {
    id: "new_damage_found",
    label: "New damage found",
    detail: "I can see damage that is not on the record.",
  },
  {
    id: "unable_to_inspect",
    label: "Unable to inspect",
    detail: "Vehicle too dirty, dark or obstructed to inspect properly.",
  },
];

/**
 * Pre-duty vehicle condition acknowledgement — chain of custody without auto-blame.
 */
export default function VehicleConditionAcknowledgement({
  vehicleRegistration,
  lastInspectionAt,
  openDamageCount = 0,
  restrictions = [],
  onAcknowledge,
  disabled = false,
}) {
  const [selected, setSelected] = useState(null);
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsStatement = selected === "condition_differs" || selected === "new_damage_found";

  const handleSubmit = async () => {
    if (!selected || disabled) return;
    if (needsStatement && !statement.trim()) return;
    setSubmitting(true);
    try {
      await onAcknowledge?.({
        acknowledgementType: selected,
        statement: statement.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`rounded-2xl border ${op.cardBorder} bg-white p-4 space-y-3`}>
      <div className="flex items-start gap-2">
        <Camera className="size-5 text-slate-500 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 className="font-semibold text-slate-900">Vehicle condition acknowledgement</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {vehicleRegistration ?? "Vehicle"} — review known condition before your duty.
          </p>
          {lastInspectionAt ? (
            <p className="text-xs text-slate-500 mt-1">
              Latest yard inspection: {new Date(lastInspectionAt).toLocaleString("en-GB")}
            </p>
          ) : null}
        </div>
      </div>

      {openDamageCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-medium">{openDamageCount} known damage area{openDamageCount > 1 ? "s" : ""} on record.</span>
          <span className="block text-xs mt-0.5">Confirm each matches what you see, or report a difference.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          No open body damage on record.
        </div>
      )}

      {restrictions.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-amber-950">
            <AlertTriangle className="size-4" aria-hidden />
            Operational restrictions
          </div>
          <ul className="mt-1 text-xs text-amber-900 list-disc pl-4">
            {restrictions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        {ACK_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => setSelected(opt.id)}
            className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
              selected === opt.id
                ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-medium text-sm text-slate-900">{opt.label}</span>
            <span className="block text-xs text-slate-600 mt-0.5">{opt.detail}</span>
          </button>
        ))}
      </div>

      {needsStatement ? (
        <div>
          <label htmlFor="condition-statement" className="text-xs font-medium text-slate-700">
            Describe what differs (required)
          </label>
          <textarea
            id="condition-statement"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="What you see, and where on the vehicle…"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Yard and fleet admin will be notified. This does not automatically assign blame.
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        className="w-full h-11"
        disabled={!selected || submitting || disabled || (needsStatement && !statement.trim())}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "Recording…" : "Confirm condition acknowledgement"}
      </Button>
    </section>
  );
}
