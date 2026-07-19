import { AlertTriangle, Camera, X } from "lucide-react";
import { useState } from "react";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";

export default function WalkaroundAdvisorySheet({ item, onCancel, onSave }) {
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!note.trim()) return;
    setBusy(true);
    await onSave({
      note: note.trim(),
      photoFile,
      isAdvisory: true,
    });
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
      <div
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5"
        style={{ paddingBottom: `calc(20px + ${DRIVER_SAFE_BOTTOM})` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-amber-700">Advisory</p>
            <h3 className="mt-1 text-lg font-bold text-foreground">{item.questionTitle}</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Use this when something needs attention or replacing soon, but the vehicle is still safe to use — not a full
            defect. Admin and Yard will see it as an advisory.
          </span>
        </p>

        <p className="mt-4 text-xs text-muted-foreground">What needs attention? *</p>
        <textarea
          className={`mt-1 min-h-[88px] w-full rounded-xl p-3 text-sm ${op.input}`}
          placeholder="e.g. Wiper blade worn — replace this week…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <p className="mt-4 text-xs text-muted-foreground">Photo (optional)</p>
        <label
          className={`mt-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border ${op.card}`}
        >
          <Camera className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {photoFile ? "Change photo" : "Add a photo if helpful"}
          </span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </label>
        {photoPreview ? (
          <img src={photoPreview} alt="Advisory evidence" className="mt-2 max-h-40 w-full rounded-xl object-cover" />
        ) : null}

        <button
          type="button"
          disabled={!note.trim() || busy}
          onClick={() => void submit()}
          className="mt-4 h-12 w-full rounded-full bg-amber-600 font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save advisory"}
        </button>
      </div>
    </div>
  );
}
