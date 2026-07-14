import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DefectPhotoCapture } from "@/components/yard/DefectPhotoCapture";
import { BodyZoneDiagram } from "@/components/condition/BodyZoneDiagram";
import { getBodyZones, getCaptureTemplate, VIDEO_WALKAROUND_INSTRUCTION } from "@/domain/condition/body-zones";
import { defaultInspectionTypeForVehicle } from "@/domain/condition/inspection-mutations";
import { getConditionProfile } from "@/domain/condition/condition-helpers";
import { useYard } from "@/store/yard";
import type { CaptureSlot, InspectionType } from "@/types/condition";
import { DAMAGE_TYPE_LABELS, OBSERVATION_LABELS, type DamageType, type ObservationClassification } from "@/types/condition";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";

type Step = "setup" | "capture" | "damage" | "review";

interface GuidedInspectionWizardProps {
  vehicleId: string;
  initialType?: InspectionType;
  repairOrderId?: string;
}

export function GuidedInspectionWizard({ vehicleId, initialType, repairOrderId }: GuidedInspectionWizardProps) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const profiles = useYard(s => s.conditionProfiles);
  const damageRecords = useYard(s => s.damageRecords);
  const startInspection = useYard(s => s.startInspection);
  const addInspectionMedia = useYard(s => s.addInspectionMedia);
  const completeInspection = useYard(s => s.completeInspection);
  const approveBaseline = useYard(s => s.approveBaseline);
  const reportDamageObservation = useYard(s => s.reportDamageObservation);
  const verifyRepairWorkOrder = useYard(s => s.verifyRepairWorkOrder);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const navigate = useNavigate();

  const linkedRepair = repairOrderId ? repairOrders.find(o => o.id === repairOrderId) : undefined;
  const profile = getConditionProfile(profiles, vehicleId);
  const defaultType = repairOrderId ? "post-repair" as InspectionType : (initialType ?? defaultInspectionTypeForVehicle(profile));
  const zones = useMemo(() => (vehicle ? getBodyZones(vehicle.type) : []), [vehicle]);
  const slots = useMemo(
    () => (vehicle ? getCaptureTemplate(vehicle.type, defaultType === "onboarding-baseline" ? "onboarding-baseline" : "standard") : []),
    [vehicle, defaultType],
  );

  const [step, setStep] = useState<Step>("setup");
  const [inspectionType, setInspectionType] = useState<InspectionType>(defaultType);
  const [mileage, setMileage] = useState("");
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [capturedSlots, setCapturedSlots] = useState<Record<string, string>>({});
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [damageType, setDamageType] = useState<DamageType>("scratch");
  const [damageNote, setDamageNote] = useState("");
  const [damageClassification, setDamageClassification] = useState<ObservationClassification>("new_not_reported");
  const [verificationPassed, setVerificationPassed] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState("");

  if (!vehicle) return null;

  const openDamage = damageRecords.filter(d => d.vehicleId === vehicleId && !["repaired", "closed"].includes(d.status));
  const currentSlot: CaptureSlot | undefined = slots[slotIndex];
  const captureDone = slots.filter(s => s.required).every(s => capturedSlots[s.id]);

  const begin = () => {
    const insp = startInspection(vehicleId, inspectionType, mileage ? Number(mileage) : undefined);
    setInspectionId(insp.id);
    setStep("capture");
  };

  const captureCurrent = (dataUrl: string) => {
    if (!inspectionId || !currentSlot) return;
    addInspectionMedia(inspectionId, {
      vehicleZoneId: currentSlot.zoneId,
      captureSlotId: currentSlot.id,
      mediaType: currentSlot.kind === "video" ? "video" : "photo",
      dataUrl,
      capturedAt: new Date().toISOString(),
      capturedBy: "Yard user",
      qualityStatus: "accepted",
      offlineCapture: !navigator.onLine,
      evidenceRole: currentSlot.kind === "video" ? "walkaround_video" : "context",
    });
    setCapturedSlots(prev => ({ ...prev, [currentSlot.id]: dataUrl }));
    if (slotIndex < slots.length - 1) setSlotIndex(slotIndex + 1);
    else setStep("damage");
  };

  const submitDamage = () => {
    if (!inspectionId || !selectedZone) {
      toast.error(yardCopy.toast.inspection.selectZone);
      return;
    }
    reportDamageObservation({
      inspectionId,
      vehicleId,
      zoneId: selectedZone,
      reportSource: "yard_inspection",
      classification: damageClassification,
      damageType,
      description: damageNote || undefined,
      severity: "cosmetic",
      safeToOperate: true,
      mediaIds: [],
    });
    toast.success(yardCopy.toast.inspection.damageRecorded);
    setSelectedZone(null);
    setDamagePhotos([]);
    setDamageNote("");
  };

  const finish = () => {
    if (!inspectionId) return;
    const awaiting = inspectionType === "onboarding-baseline";
    completeInspection(inspectionId, { awaitingApproval: awaiting });
    if (awaiting) {
      approveBaseline(inspectionId);
      toast.success(yardCopy.toast.inspection.baselineApproved);
    } else if (inspectionType === "post-repair" && repairOrderId) {
      verifyRepairWorkOrder(repairOrderId, inspectionId, verificationPassed, verificationNotes || undefined);
      toast.success(verificationPassed ? yardCopy.toast.inspection.repairVerificationPassed : yardCopy.toast.inspection.repairVerificationFailed);
    } else {
      toast.success(yardCopy.toast.inspection.completed);
    }
    navigate({ to: "/yard/$vehicleId/condition", params: { vehicleId } });
  };

  return (
    <div className="space-y-5 pb-8">
      <Link to="/yard/$vehicleId/condition" params={{ vehicleId }} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Condition
      </Link>

      {step === "setup" && (
        <section className="bg-white border border-border rounded-xs p-4 space-y-4">
          <h1 className="font-display text-lg font-extrabold uppercase tracking-tight">Start inspection</h1>
          <p className="text-xs text-muted">{vehicle.reg} · {vehicle.type}</p>
          {linkedRepair && (
            <div className="bg-primary/5 border border-primary/20 rounded-xs p-3 text-xs">
              <div className="font-bold uppercase tracking-widest text-[10px] text-primary">Post-repair verification</div>
              <p className="mt-1">{linkedRepair.description}</p>
            </div>
          )}
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Inspection type</Label>
            <select
              value={inspectionType}
              onChange={e => setInspectionType(e.target.value as InspectionType)}
              className="mt-1 w-full border border-border rounded-xs p-2 text-sm bg-white"
            >
              <option value="onboarding-baseline">Onboarding baseline</option>
              <option value="yard-check">Yard bodywork inspection</option>
              <option value="weekly-bodywork">Weekly detailed bodywork</option>
              <option value="post-repair">Post-repair verification</option>
              <option value="return-to-yard">Return to yard</option>
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Mileage</Label>
            <Input value={mileage} onChange={e => setMileage(e.target.value)} placeholder="Odometer reading" className="mt-1" />
          </div>
          {openDamage.length > 0 && (
            <p className="text-xs text-warn bg-warn/10 border border-warn/30 rounded-xs p-2">
              {openDamage.length} known damage area{openDamage.length > 1 ? "s" : ""} on record — confirm unchanged or report worsened/new during capture.
            </p>
          )}
          <Button onClick={begin} className="w-full bg-primary text-white font-bold uppercase tracking-widest">
            Begin guided capture
          </Button>
        </section>
      )}

      {step === "capture" && currentSlot && (
        <section className="bg-white border border-border rounded-xs p-4 space-y-4">
          <div className="flex justify-between text-xs">
            <span className="font-bold uppercase tracking-wider">Photo {slotIndex + 1} / {slots.length}</span>
            <span className="text-muted">{currentSlot.label}</span>
          </div>
          {currentSlot.kind === "video" ? (
            <p className="text-xs text-muted bg-secondary/50 p-3 rounded-xs">{VIDEO_WALKAROUND_INSTRUCTION}</p>
          ) : (
            <p className="text-xs text-muted">Capture a clear {currentSlot.required ? "required" : "optional"} photograph for evidence comparison.</p>
          )}
          <DefectPhotoCapture
            photos={capturedSlots[currentSlot.id] ? [capturedSlots[currentSlot.id]] : []}
            onChange={photos => { if (photos[0]) captureCurrent(photos[0]); }}
            max={1}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={slotIndex === 0} onClick={() => setSlotIndex(i => i - 1)}>Back</Button>
            <Button
              className="flex-1"
              onClick={() => slotIndex < slots.length - 1 ? setSlotIndex(i => i + 1) : setStep("damage")}
            >
              {capturedSlots[currentSlot.id] ? "Next" : "Skip"} <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
          {!captureDone && (
            <p className="text-[10px] text-vor text-center">Required angles still missing — complete before submit.</p>
          )}
        </section>
      )}

      {step === "damage" && (
        <section className="space-y-4">
          <div className="bg-white border border-border rounded-xs p-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest font-display mb-2">Mark observations</h2>
            <p className="text-xs text-muted mb-3">Select a zone and record whether damage is new, existing, or unchanged. Every image belongs to this inspection.</p>
            <BodyZoneDiagram
              zones={zones}
              damageRecords={openDamage}
              selectedZoneId={selectedZone ?? undefined}
              onSelectZone={setSelectedZone}
            />
          </div>
          {selectedZone && (
            <div className="bg-white border border-border rounded-xs p-4 space-y-3">
              <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Decision</Label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(OBSERVATION_LABELS) as ObservationClassification[]).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDamageClassification(key)}
                    className={`px-2 py-1 rounded-xs border text-[10px] font-medium ${
                      damageClassification === key ? "border-primary bg-primary text-white" : "border-border"
                    }`}
                  >
                    {OBSERVATION_LABELS[key]}
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Damage type</Label>
                <select
                  value={damageType}
                  onChange={e => setDamageType(e.target.value as DamageType)}
                  className="mt-1 w-full border border-border rounded-xs p-2 text-sm"
                >
                  {Object.entries(DAMAGE_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <DefectPhotoCapture photos={damagePhotos} onChange={setDamagePhotos} max={3} />
              <Textarea placeholder="Description, size, operational impact…" value={damageNote} onChange={e => setDamageNote(e.target.value)} />
              <Button onClick={submitDamage} variant="outline" className="w-full text-xs uppercase tracking-widest font-bold">
                <Camera className="size-4" /> Record observation
              </Button>
            </div>
          )}
          <Button onClick={() => setStep("review")} className="w-full bg-accent text-white font-bold uppercase tracking-widest">
            Continue to review
          </Button>
        </section>
      )}

      {step === "review" && (
        <section className="bg-white border border-border rounded-xs p-4 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest font-display">Review & submit</h2>
          <ul className="text-xs space-y-1">
            <li>· {Object.keys(capturedSlots).length} media files captured</li>
            <li>· Inspection type: {inspectionType.replace(/-/g, " ")}</li>
            <li>· {openDamage.length} known damage on record</li>
          </ul>
          {inspectionType === "post-repair" && repairOrderId && (
            <div className="space-y-3 border-t border-border pt-3">
              <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Verification outcome</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={verificationPassed ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => setVerificationPassed(true)}
                >
                  Repair satisfactory
                </Button>
                <Button
                  type="button"
                  variant={!verificationPassed ? "default" : "outline"}
                  className={`flex-1 text-xs ${!verificationPassed ? "bg-vor hover:bg-vor/90" : ""}`}
                  onClick={() => setVerificationPassed(false)}
                >
                  Repair not acceptable
                </Button>
              </div>
              <Textarea
                placeholder="Verification notes…"
                value={verificationNotes}
                onChange={e => setVerificationNotes(e.target.value)}
              />
            </div>
          )}
          <p className="text-[11px] text-muted">
            Submitting creates an immutable inspection record. Original evidence cannot be replaced — corrections are added as new audit events.
          </p>
          <Button onClick={finish} className="w-full bg-primary text-white font-bold uppercase tracking-widest">
            Sign & submit inspection
          </Button>
        </section>
      )}
    </div>
  );
}
