import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { BodyZoneDiagram } from "@/components/condition/BodyZoneDiagram";
import { DefectPhotoCapture } from "@/components/yard/DefectPhotoCapture";
import { RegPlate } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { yardCopy } from "@/copy/yard-messages";
import { getBodyZones } from "@/domain/condition/body-zones";
import { useYard } from "@/store/yard";
import {
  DAMAGE_TYPE_LABELS,
  type DamageType,
  type ObservationClassification,
} from "@/types/condition";
import { toast } from "sonner";

const STEPS = [
  { id: "confirm", label: "Confirm vehicle" },
  { id: "zone", label: "Select zone" },
  { id: "details", label: "Damage details" },
  { id: "photo", label: "Photo evidence" },
  { id: "review", label: "Review & submit" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const CLASSIFICATION_OPTIONS: { value: ObservationClassification; label: string }[] = [
  { value: "new_not_reported", label: "New damage — not previously reported" },
  { value: "new_previously_reported", label: "New damage — already known to ops" },
  { value: "existing_worsened", label: "Existing damage — worsened" },
];

export function ReportDamageWizard({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const openDamage = useYard(s =>
    s.damageRecords.filter(d => d.vehicleId === vehicleId && !["repaired", "closed"].includes(d.status)),
  );
  const startInspection = useYard(s => s.startInspection);
  const addInspectionMedia = useYard(s => s.addInspectionMedia);
  const completeInspection = useYard(s => s.completeInspection);
  const reportDamageObservation = useYard(s => s.reportDamageObservation);

  const zones = useMemo(() => (vehicle ? getBodyZones(vehicle.type) : []), [vehicle]);

  const [step, setStep] = useState<StepId>("confirm");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [damageType, setDamageType] = useState<DamageType>("scratch");
  const [classification, setClassification] = useState<ObservationClassification>("new_not_reported");
  const [note, setNote] = useState("");
  const [safeToOperate, setSafeToOperate] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const photoDataUrl = photos[0] ?? null;

  if (!vehicle) return null;

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const zoneLabel = zones.find(z => z.id === selectedZone)?.label ?? selectedZone;

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const submit = () => {
    if (!selectedZone) {
      toast.error(yardCopy.toast.inspection.selectZone);
      return;
    }
    if (!photoDataUrl) {
      toast.error("Add a photo before submitting — evidence is required for bodywork damage.");
      return;
    }
    setSubmitting(true);
    try {
      const inspection = startInspection(vehicleId, "reported-damage");
      const media = addInspectionMedia(inspection.id, {
        vehicleZoneId: selectedZone,
        captureSlotId: `report-${selectedZone}`,
        mediaType: "photo",
        dataUrl: photoDataUrl,
        capturedAt: new Date().toISOString(),
        capturedBy: "Yard user",
        qualityStatus: "accepted",
        offlineCapture: !navigator.onLine,
        evidenceRole: "close_up",
      });
      reportDamageObservation({
        inspectionId: inspection.id,
        vehicleId,
        zoneId: selectedZone,
        reportSource: "yard_inspection",
        reportedBy: "Yard user",
        classification,
        damageType,
        description: note || undefined,
        severity: safeToOperate ? "cosmetic" : "safety_critical",
        safeToOperate,
        mediaIds: media?.id ? [media.id] : [],
      });
      completeInspection(inspection.id, { awaitingApproval: false });
      toast.success("Damage recorded. Syncing to Command when online.");
      navigate({ to: "/vehicle-bodywork/$vehicleId", params: { vehicleId } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <Link
        to="/vehicle-bodywork/$vehicleId"
        params={{ vehicleId }}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Vehicle bodywork
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#667085]">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1 font-display text-lg font-extrabold uppercase tracking-tight">
          {STEPS[stepIndex]?.label}
        </h1>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Report progress">
          {STEPS.map((s, index) => (
            <li
              key={s.id}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                index === stepIndex
                  ? "bg-[#0B1526] text-white"
                  : index < stepIndex
                    ? "bg-[#12A89D]/15 text-[#0B1526]"
                    : "bg-[#f2f4f7] text-[#98a2b3]"
              }`}
            >
              {index + 1}. {s.label}
            </li>
          ))}
        </ol>
      </div>

      {step === "confirm" && (
        <section className="space-y-4 rounded-xl border border-[#eaecf0] bg-white p-4">
          <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />
          <p className="text-sm text-[#667085]">
            {vehicle.type} · Bay {vehicle.bayId}. Confirm this is the vehicle you are inspecting before
            recording bodywork damage.
          </p>
          {vehicle.status === "VOR" ? (
            <p className="rounded-lg border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">
              This vehicle is VOR. Still record new damage so the record stays complete.
            </p>
          ) : null}
          <Button onClick={goNext} className="w-full bg-[#12A89D] font-bold uppercase tracking-widest text-white hover:bg-[#0f968c]">
            Confirm vehicle <ChevronRight className="ml-1 size-4" />
          </Button>
        </section>
      )}

      {step === "zone" && (
        <section className="space-y-4 rounded-xl border border-[#eaecf0] bg-white p-4">
          <p className="text-sm text-[#667085]">Tap the body zone where the damage is.</p>
          <BodyZoneDiagram
            zones={zones}
            damageRecords={openDamage}
            selectedZoneId={selectedZone ?? undefined}
            onSelectZone={setSelectedZone}
            embedded
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!selectedZone}
              className="flex-1 bg-[#12A89D] font-bold uppercase tracking-widest text-white hover:bg-[#0f968c]"
            >
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === "details" && (
        <section className="space-y-4 rounded-xl border border-[#eaecf0] bg-white p-4">
          <p className="text-xs font-medium text-[#667085]">Zone: {zoneLabel}</p>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted">Damage type</Label>
            <select
              value={damageType}
              onChange={e => setDamageType(e.target.value as DamageType)}
              className="mt-1 w-full rounded-md border border-border bg-white p-2 text-sm"
            >
              {Object.entries(DAMAGE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted">Classification</Label>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value as ObservationClassification)}
              className="mt-1 w-full rounded-md border border-border bg-white p-2 text-sm"
            >
              {CLASSIFICATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted">Notes</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What you can see — size, location on panel, any sharp edges"
              className="mt-1"
              rows={3}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={!safeToOperate}
              onChange={e => setSafeToOperate(!e.target.checked)}
              className="mt-1"
            />
            <span>
              Safety-critical — vehicle should not enter service until reviewed
            </span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button onClick={goNext} className="flex-1 bg-[#12A89D] font-bold uppercase tracking-widest text-white hover:bg-[#0f968c]">
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === "photo" && (
        <section className="space-y-4 rounded-xl border border-[#eaecf0] bg-white p-4">
          <p className="text-sm text-[#667085]">
            Close-up evidence is required before this report can sync to Command.
          </p>
          <DefectPhotoCapture photos={photos} onChange={setPhotos} max={1} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!photoDataUrl}
              className="flex-1 bg-[#12A89D] font-bold uppercase tracking-widest text-white hover:bg-[#0f968c]"
            >
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="space-y-4 rounded-xl border border-[#eaecf0] bg-white p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Vehicle</dt>
              <dd className="font-medium">{vehicle.reg}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Zone</dt>
              <dd className="font-medium">{zoneLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Type</dt>
              <dd className="font-medium">{DAMAGE_TYPE_LABELS[damageType]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Safe to operate</dt>
              <dd className="font-medium">{safeToOperate ? "Yes" : "No — safety-critical"}</dd>
            </div>
            {note ? (
              <div>
                <dt className="text-[#667085]">Notes</dt>
                <dd className="mt-1 font-medium">{note}</dd>
              </div>
            ) : null}
          </dl>
          {photoDataUrl ? (
            <img src={photoDataUrl} alt="Damage evidence preview" className="max-h-40 w-full rounded-lg object-contain bg-[#f9fafb]" />
          ) : null}
          <p className="text-xs text-[#667085]">
            Submit writes locally and queues <span className="font-mono">damage.report</span> to Command
            (one authoritative write path).
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} className="flex-1" disabled={submitting}>
              Back
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="flex-1 bg-[#0B1526] font-bold uppercase tracking-widest text-white hover:bg-[#152238]"
            >
              {submitting ? "Submitting…" : "Submit damage report"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
