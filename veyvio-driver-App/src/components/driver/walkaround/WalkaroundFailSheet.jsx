import { Camera, X } from "lucide-react";
import { useState } from "react";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { isBodyworkDamageItem } from "@/lib/walkaround-template-engine";

const CONTINUE_OPTIONS = [
  { value: "no", label: "No — unsafe to drive" },
  { value: "unsure", label: "Unsure — needs review" },
  { value: "yes", label: "Yes — but needs review" },
];

const BODYWORK_ZONES = [
  { value: "front", label: "Front" },
  { value: "nearside", label: "Nearside" },
  { value: "offside", label: "Offside" },
  { value: "rear", label: "Rear" },
  { value: "roof", label: "Roof" },
  { value: "doors", label: "Doors / panels" },
];

const DAMAGE_TYPES = [
  { value: "dent", label: "Dent" },
  { value: "scratch", label: "Scratch / scrape" },
  { value: "crack", label: "Crack" },
  { value: "sharp_edge", label: "Sharp edge" },
  { value: "loose_panel", label: "Loose panel" },
  { value: "other", label: "Other" },
];

export default function WalkaroundFailSheet({ item, profile, onCancel, onSave }) {
  const bodywork = isBodyworkDamageItem(item);
  const [note, setNote] = useState("");
  const [canContinue, setCanContinue] = useState(bodywork ? "yes" : "unsure");
  const [zone, setZone] = useState("");
  const [damageType, setDamageType] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const isAccessibility = item.category === "accessibility" || item.addon === "accessible";

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!note.trim()) return;
    if (bodywork && (!zone || !damageType || !photoFile)) return;
    setBusy(true);
    await onSave({
      note: note.trim(),
      canContinue,
      photoFile,
      photoPath: null,
      zone: bodywork ? zone : null,
      damageType: bodywork ? damageType : null,
      isBodyworkDamage: bodywork,
    });
    setBusy(false);
  };

  const canSave =
    note.trim() &&
    !busy &&
    (!item.requiresPhotoOnFail || photoFile) &&
    (!bodywork || (zone && damageType && photoFile));

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
      <div
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5"
        style={{ paddingBottom: `calc(20px + ${DRIVER_SAFE_BOTTOM})` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-red-600">
              {bodywork ? "Bodywork damage" : "Defect details"}
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">{item.questionTitle}</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {bodywork ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Photo and details go to <strong>Yard</strong> and <strong>Admin</strong> so the vehicle can be reviewed
            before release{profile?.registration ? ` · ${profile.registration}` : ""}.
          </p>
        ) : null}

        {isAccessibility ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Accessibility equipment defect reported. This vehicle may not be suitable for wheelchair or SEND work until
            reviewed.
          </p>
        ) : null}

        {bodywork ? (
          <>
            <p className="mt-4 text-xs text-muted-foreground">Where is the damage?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BODYWORK_ZONES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setZone(opt.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                    zone === opt.value ? "border-[#1eaeae] bg-[#1eaeae]/10 font-semibold" : "border-border"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">Damage type</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DAMAGE_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDamageType(opt.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                    damageType === opt.value ? "border-[#1eaeae] bg-[#1eaeae]/10 font-semibold" : "border-border"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          {bodywork ? "Describe the damage" : "What is wrong?"}
        </p>
        <textarea
          className={`mt-1 min-h-[88px] w-full rounded-xl p-3 text-sm ${op.input}`}
          placeholder={bodywork ? "e.g. Dent on nearside sliding door, edge sharp…" : "Describe the fault clearly…"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <p className="mt-4 text-xs text-muted-foreground">Can the vehicle continue?</p>
        <div className="mt-2 space-y-2">
          {CONTINUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCanContinue(opt.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm ${
                canContinue === opt.value ? "border-[#1eaeae] bg-[#1eaeae]/10 font-semibold" : "border-border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Photo evidence {item.requiresPhotoOnFail || bodywork ? "(required)" : "(recommended)"}
        </p>
        <label
          className={`mt-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border ${op.card}`}
        >
          <Camera className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {photoFile ? "Change photo" : bodywork ? "Photograph the damage" : "Take or choose photo"}
          </span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </label>
        {photoPreview ? (
          <img src={photoPreview} alt="Damage evidence" className="mt-2 max-h-44 w-full rounded-xl object-cover" />
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          {bodywork
            ? "Yard will see this for bay / condition review. Admin will see it on the defects register."
            : "This will be reported to the transport manager."}
        </p>

        <button
          type="button"
          disabled={!canSave}
          onClick={() => void submit()}
          className={`mt-4 h-12 w-full rounded-full font-semibold disabled:opacity-40 ${op.primaryBtn}`}
        >
          {busy ? "Saving…" : bodywork ? "Send damage to Yard & Admin" : "Report defect"}
        </button>
      </div>
    </div>
  );
}
