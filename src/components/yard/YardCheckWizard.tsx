import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, ClipboardCheck, Minus, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VehicleIdentityHeader } from "@/components/yard/VehicleIdentityHeader";
import { CHECK_TYPE_LABELS, getSectionsForCheckType, isManagerAuditCheck } from "@/domain/yard/check-templates";
import {
  computeOverallPassed,
  computeSafetyOutcome,
  SAFETY_OUTCOME_LABEL,
  SAFETY_OUTCOME_TONE,
} from "@/domain/yard/check-outcome";
import { captureCheckSubmissionMeta } from "@/domain/yard/check-submission";
import { DefectPhotoCapture } from "@/components/yard/DefectPhotoCapture";
import { CheckBodyworkPanel } from "@/components/condition/CheckBodyworkPanel";
import { ReturnToServiceGate } from "@/components/condition/ReturnToServiceGate";
import { isBodyworkLinkedSection } from "@/domain/condition/check-bodywork-link";
import { canReturnToService, getReturnToServiceBlockers } from "@/domain/condition/return-to-service-gate";
import { YardAuditBrief } from "@/components/yard/YardAuditBrief";
import { useCan } from "@/platform/permissions/use-can";
import { useYard } from "@/store/yard";
import type { CheckModule, SectionOutcome, YardCheckSectionResult, YardCheckType } from "@/types/yard-check";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { YardConfirmDialog } from "@/components/yard/YardConfirmDialog";

const MODULE_ORDER: CheckModule[] = ["roadworthiness", "yard-audit", "yard-readiness", "equipment", "job-suitability"];

const MODULE_LABELS: Record<CheckModule, string> = {
  roadworthiness: "Roadworthiness (DVSA)",
  "yard-audit": "Spot-bust audit",
  "yard-readiness": "Yard readiness",
  equipment: "Equipment",
  "job-suitability": "Job suitability",
};

const MANAGER_ONLY_TYPES: YardCheckType[] = ["yard-spot"];

type WizardStep = "type" | "sections" | "summary";

interface YardCheckWizardProps {
  vehicleId: string;
  initialCheckType?: YardCheckType;
}

export function YardCheckWizard({ vehicleId, initialCheckType }: YardCheckWizardProps) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const allDefects = useYard(s => s.defects);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const damageRecords = useYard(s => s.damageRecords);
  const yardChecks = useYard(s => s.yardChecks);
  const completeCheck = useYard(s => s.completeCheck);
  const canSpotAudit = useCan("check.spot_audit");
  const navigate = useNavigate();

  const openDefects = useMemo(
    () => allDefects.filter(d => d.vehicleId === vehicleId && !d.resolved),
    [allDefects, vehicleId],
  );
  const lastDriverCheck = useMemo(
    () => yardChecks.find(c => c.vehicleId === vehicleId && c.checkType !== "yard-spot"),
    [yardChecks, vehicleId],
  );

  const availableCheckTypes = useMemo(() => {
    const all = Object.keys(CHECK_TYPE_LABELS) as YardCheckType[];
    return all.filter(t => !MANAGER_ONLY_TYPES.includes(t) || canSpotAudit);
  }, [canSpotAudit]);

  const resolvedInitialType =
    initialCheckType && (!MANAGER_ONLY_TYPES.includes(initialCheckType) || canSpotAudit)
      ? initialCheckType
      : undefined;

  const [step, setStep] = useState<WizardStep>(resolvedInitialType ? "sections" : "type");
  const [checkType, setCheckType] = useState<YardCheckType>(resolvedInitialType ?? "start-of-day");
  const [startedAt] = useState(() => new Date().toISOString());
  const [activeModule, setActiveModule] = useState<CheckModule>("roadworthiness");
  const [results, setResults] = useState<Record<string, YardCheckSectionResult>>({});
  const [odometer, setOdometer] = useState("");
  const [confirmRts, setConfirmRts] = useState(false);

  const sectionDefs = useMemo(() => getSectionsForCheckType(checkType), [checkType]);

  const modulesPresent = useMemo(
    () => MODULE_ORDER.filter(m => sectionDefs.some(s => s.module === m)),
    [sectionDefs],
  );

  const moduleSections = useMemo(
    () => sectionDefs.filter(s => s.module === activeModule),
    [sectionDefs, activeModule],
  );

  const answeredCount = sectionDefs.filter(s => results[s.id]?.outcome).length;
  const allAnswered = answeredCount === sectionDefs.length;

  const finalSections = useMemo(
    () => sectionDefs.map(s => results[s.id] ?? { sectionId: s.id, title: s.title, outcome: "passed" as SectionOutcome }),
    [sectionDefs, results],
  );
  const previewOutcome = computeSafetyOutcome(finalSections);
  const previewPassed = computeOverallPassed(finalSections);
  const defectCount = finalSections.filter(s => s.outcome === "defect").length;

  const rtsBlockers = useMemo(
    () => getReturnToServiceBlockers(vehicleId, allDefects, repairOrders, damageRecords),
    [vehicleId, allDefects, repairOrders, damageRecords],
  );
  const rtsReady = canReturnToService(rtsBlockers);

  if (!vehicle) return null;

  const setOutcome = (sectionId: string, title: string, outcome: SectionOutcome) => {
    setResults(prev => {
      if (outcome === "defect") {
        return {
          ...prev,
          [sectionId]: {
            sectionId,
            title,
            outcome,
            failedItemIds: prev[sectionId]?.failedItemIds ?? [],
            note: prev[sectionId]?.note,
            safeToMove: prev[sectionId]?.safeToMove,
          },
        };
      }
      return { ...prev, [sectionId]: { sectionId, title, outcome } };
    });
  };

  const toggleFailedItem = (sectionId: string, itemId: string) => {
    setResults(prev => {
      const current = prev[sectionId];
      if (!current) return prev;
      const ids = new Set(current.failedItemIds ?? []);
      if (ids.has(itemId)) ids.delete(itemId);
      else ids.add(itemId);
      return { ...prev, [sectionId]: { ...current, failedItemIds: [...ids] } };
    });
  };

  const updateDefectField = (
    sectionId: string,
    patch: Partial<Pick<YardCheckSectionResult, "note" | "safeToMove" | "photoDataUrls">>,
  ) => {
    setResults(prev => {
      const current = prev[sectionId];
      if (!current) return prev;
      return { ...prev, [sectionId]: { ...current, ...patch } };
    });
  };

  const startSections = (type: YardCheckType) => {
    if (type === "return-to-service") {
      const blockers = getReturnToServiceBlockers(vehicleId, allDefects, repairOrders, damageRecords);
      if (!canReturnToService(blockers)) {
        toast.error(yardCopy.toast.check.rtsBlocked);
        return;
      }
    }
    setCheckType(type);
    setResults({});
    setActiveModule(MODULE_ORDER.find(m => getSectionsForCheckType(type).some(s => s.module === m)) ?? "roadworthiness");
    setStep("sections");
  };

  const goToSummary = () => {
    if (!allAnswered) {
      toast.error(yardCopy.toast.check.completeEverySection);
      return;
    }
    setStep("summary");
  };

  const executeSubmit = () => {
    const sections = sectionDefs.map(s => {
      const r = results[s.id];
      return r ?? { sectionId: s.id, title: s.title, outcome: "passed" as SectionOutcome };
    });
    const meta = captureCheckSubmissionMeta(startedAt);
    const raised = completeCheck(vehicleId, {
      checkType,
      sections,
      startedAt,
      odometer: odometer ? Number(odometer) : undefined,
      ...meta,
    });
    const vorCount = raised.filter(d => d.vorCaseId).length;
    if (vorCount > 0) {
      toast.warning(yardCopy.toast.check.savedVor(vorCount));
    } else if (raised.length > 0) {
      const auditCount = raised.filter(d => d.auditFinding).length;
      if (auditCount > 0) {
        toast.warning(yardCopy.toast.check.auditMissed(auditCount));
      } else {
        toast.warning(yardCopy.toast.check.defectsRaised(raised.length));
      }
    } else {
      toast.success(yardCopy.toast.check.complete(vehicle.reg));
    }
    navigate({ to: "/yard/$vehicleId", params: { vehicleId } });
  };

  const submit = () => {
    if (checkType === "return-to-service") {
      setConfirmRts(true);
      return;
    }
    executeSubmit();
  };

  return (
    <div className="space-y-5 animate-in-up pb-8">
      <Link
        to="/yard/$vehicleId"
        params={{ vehicleId }}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {vehicle.reg}
      </Link>

      <header className="bg-white border border-border rounded-xs p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-extrabold uppercase tracking-tight flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              {isManagerAuditCheck(checkType) && step !== "type" ? "Manager Audit" : "Yard Vehicle Check"}
            </h1>
          </div>
          {step !== "type" && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {CHECK_TYPE_LABELS[checkType].label}
            </span>
          )}
        </div>
        <VehicleIdentityHeader vehicle={vehicle} compact />
        {step === "sections" && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted mb-1">
              <span>Progress</span>
              <span>{answeredCount} / {sectionDefs.length}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(answeredCount / sectionDefs.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {step === "type" && (
        <section className="space-y-3">
          <p className="text-xs text-muted">
            Based on the DVSA PSV daily walkaround, expanded with yard readiness, equipment and job suitability.
            A digital record does not replace physically inspecting the vehicle.
          </p>
          {canSpotAudit && (
            <button
              type="button"
              onClick={() => startSections("yard-spot")}
              className="flex items-center justify-between gap-3 w-full border-2 border-warn/50 bg-warn/10 rounded-xs p-4 text-left hover:border-warn"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="size-3.5" />
                  {CHECK_TYPE_LABELS["yard-spot"].label}
                </div>
                <div className="text-[11px] text-muted mt-0.5">{CHECK_TYPE_LABELS["yard-spot"].description}</div>
                <div className="text-[10px] text-muted mt-1">{getSectionsForCheckType("yard-spot").length} sections · managers only</div>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>
          )}
          <div className="grid grid-cols-1 gap-2">
            {availableCheckTypes.filter(t => t !== "yard-spot").map(type => {
              const meta = CHECK_TYPE_LABELS[type];
              const count = getSectionsForCheckType(type).length;
              return (
                <button
                  key={type}
                  onClick={() => startSections(type)}
                  className="flex items-center justify-between gap-3 border border-border bg-white rounded-xs p-4 text-left hover:border-primary hover:bg-primary/5"
                >
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">{meta.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">{meta.description}</div>
                    <div className="text-[10px] text-muted mt-1">{count} sections</div>
                  </div>
                  <ChevronRight className="size-4 text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === "sections" && isManagerAuditCheck(checkType) && (
        <YardAuditBrief vehicle={vehicle} openDefects={openDefects} lastCheck={lastDriverCheck} />
      )}

      {step === "sections" && checkType === "return-to-service" && (
        <ReturnToServiceGate blockers={rtsBlockers} vehicleId={vehicleId} />
      )}

      {step === "sections" && (
        <>
          <div className="flex flex-wrap gap-1">
            {modulesPresent.map(m => {
              const modSections = sectionDefs.filter(s => s.module === m);
              const modDone = modSections.every(s => results[s.id]?.outcome);
              return (
                <button
                  key={m}
                  onClick={() => setActiveModule(m)}
                  className={`px-2.5 py-1.5 rounded-xs border text-[10px] font-bold uppercase tracking-widest ${
                    activeModule === m
                      ? "border-primary bg-primary text-white"
                      : modDone
                        ? "border-ok/40 bg-ok/10 text-ok"
                        : "border-border bg-white text-muted"
                  }`}
                >
                  {MODULE_LABELS[m]}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {moduleSections.map(def => {
              const r = results[def.id];
              const outcome = r?.outcome;
              return (
                <div
                  key={def.id}
                  className={`border rounded-xs p-3 ${
                    outcome === "defect"
                      ? "border-vor bg-vor/5"
                      : outcome === "passed"
                        ? "border-ok/40 bg-ok/5"
                        : outcome === "na"
                          ? "border-border bg-secondary/30"
                          : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">{def.title}</span>
                        {def.safetyCritical && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-vor">Safety</span>
                        )}
                        {def.dvsaGroup && (
                          <span className="text-[9px] font-mono text-muted">DVSA {def.dvsaGroup}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">{def.description}</p>
                      {isBodyworkLinkedSection(def.id) && (
                        <CheckBodyworkPanel vehicleId={vehicleId} sectionTitle={def.title} />
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <OutcomeBtn
                        active={outcome === "passed"}
                        tone="ok"
                        label="All passed"
                        onClick={() => setOutcome(def.id, def.title, "passed")}
                      >
                        <Check className="size-3.5" />
                      </OutcomeBtn>
                      <OutcomeBtn
                        active={outcome === "defect"}
                        tone="vor"
                        label="Defect found"
                        onClick={() => setOutcome(def.id, def.title, "defect")}
                      >
                        <TriangleAlert className="size-3.5" />
                      </OutcomeBtn>
                      <OutcomeBtn
                        active={outcome === "na"}
                        tone="muted"
                        label="Not applicable"
                        onClick={() => setOutcome(def.id, def.title, "na")}
                      >
                        <Minus className="size-3.5" />
                      </OutcomeBtn>
                    </div>
                  </div>

                  {outcome === "defect" && (
                    <div className="mt-3 pt-3 border-t border-vor/20 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Defect drill-down</p>
                      <div className="flex flex-wrap gap-1.5">
                        {def.items.map(item => {
                          const selected = r?.failedItemIds?.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleFailedItem(def.id, item.id)}
                              className={`px-2 py-1 rounded-xs border text-[10px] font-medium text-left ${
                                selected ? "border-vor bg-vor text-white" : "border-border bg-white hover:border-vor/50"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">
                          Is the vehicle safe to move?
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={r?.safeToMove === true ? "default" : "outline"}
                            className="text-xs"
                            onClick={() => updateDefectField(def.id, { safeToMove: true })}
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={r?.safeToMove === false ? "destructive" : "outline"}
                            className="text-xs"
                            onClick={() => updateDefectField(def.id, { safeToMove: false })}
                          >
                            No — hold vehicle
                          </Button>
                        </div>
                      </div>
                      <DefectPhotoCapture
                        photos={r?.photoDataUrls ?? []}
                        onChange={photos => updateDefectField(def.id, { photoDataUrls: photos })}
                      />
                      <Textarea
                        placeholder="Comments, position, photos noted…"
                        value={r?.note ?? ""}
                        onChange={e => updateDefectField(def.id, { note: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 border-t border-border">
            <Button variant="outline" onClick={() => setStep("type")} className="flex-1">
              Change type
            </Button>
            <Button onClick={goToSummary} disabled={!allAnswered} className="flex-1 bg-primary text-white font-bold uppercase tracking-widest">
              Review summary
            </Button>
          </div>
        </>
      )}

      {step === "summary" && (
        <section className="space-y-4">
          {checkType === "return-to-service" && (
            <ReturnToServiceGate blockers={rtsBlockers} vehicleId={vehicleId} />
          )}
          <div className={`border rounded-xs p-4 ${SAFETY_OUTCOME_TONE[previewOutcome]}`}>
            <div className="text-[10px] font-bold uppercase tracking-widest">Outcome</div>
            <div className="text-sm font-bold mt-1">{SAFETY_OUTCOME_LABEL[previewOutcome]}</div>
            <div className="text-xs mt-1">
              {previewPassed ? "All sections passed or marked N/A." : `${defectCount} defect section(s) recorded.`}
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Odometer (optional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 48210"
              value={odometer}
              onChange={e => setOdometer(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="bg-white border border-border rounded-xs divide-y divide-border max-h-[40vh] overflow-y-auto">
            {sectionDefs.map(def => {
              const r = results[def.id];
              const label = r?.outcome === "passed" ? "Passed" : r?.outcome === "na" ? "N/A" : "Defect";
              const tone = r?.outcome === "passed" ? "text-ok" : r?.outcome === "na" ? "text-muted" : "text-vor";
              return (
                <div key={def.id} className="flex items-center justify-between p-2.5 text-xs">
                  <span className="font-medium">{def.title}</span>
                  <span className={`font-bold uppercase tracking-widest text-[10px] ${tone}`}>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("sections")} className="flex-1">
              Back
            </Button>
            <Button onClick={submit} disabled={checkType === "return-to-service" && !rtsReady} className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold uppercase tracking-widest">
              {yardCopy.buttons.completeYardCheck}
            </Button>
          </div>
        </section>
      )}

      <YardConfirmDialog
        open={confirmRts}
        onOpenChange={setConfirmRts}
        {...yardCopy.confirm.rtsCheck(vehicle.reg)}
        confirmLabel={yardCopy.buttons.returnToService}
        onConfirm={() => {
          setConfirmRts(false);
          executeSubmit();
        }}
      />
    </div>
  );
}

function OutcomeBtn({
  children,
  active,
  tone,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone: "ok" | "vor" | "muted";
  label: string;
  onClick: () => void;
}) {
  const activeCls =
    tone === "ok" ? "bg-ok text-white border-ok"
    : tone === "vor" ? "bg-vor text-white border-vor"
    : "bg-secondary text-foreground border-border";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-xs border ${
        active ? activeCls : "border-border bg-white hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}
