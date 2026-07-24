import { useMemo } from "react";
import { create } from "zustand";
import type { BootstrapDataSource, BootstrapPayload } from "@/data/mocks/bootstrap";
import { createEmptyYardCoreState } from "@/platform/yard/empty-yard-state";
import { buildEquipmentForVehicle, mergeEquipmentForVehicles, isValidVehicleEquipment, type StockLine } from "@/data/equipment-fixtures";
import type { CompleteYardCheckInput, YardCheckResult } from "@/types/yard-check";
import { computeOverallPassed, computeSafetyOutcome, severityForSection } from "@/domain/yard/check-outcome";
import { getSectionDef, isManagerAuditCheck } from "@/domain/yard/check-templates";
import { shouldAutoVorFromSection } from "@/domain/yard/check-vor";
import { buildVorCaseFromDefect } from "@/domain/yard/vor-from-defect";
import { applyVehicleMove, zoneOfBay } from "@/domain/yard/bay-zones";
import { applyVehicleDeparture } from "@/domain/yard/departure-exit";
import {
  acknowledgePlan,
  buildPrepTasksFromPlan,
  canAcknowledgePlan,
} from "@/domain/yard/operational-plan";
import { applyResolveDefect, canResolveDefect } from "@/domain/yard/defect-workflow";
import { buildHandoverSummary } from "@/domain/yard/handover-summary";
import { recomputeAllTrips } from "@/domain/yard/trip-readiness";
import {
  buildDefectTask,
  buildVorTask,
  mergeAutomatedTasks,
  tasksFromBlockedTrips,
} from "@/domain/tasks/task-automation";
import {
  applyAssignEquipment,
  applyClearEquipmentIssue,
  applyRecordEquipmentPresence,
  applyReportEquipmentIssue,
  applyRestockConsumable,
  applyTransferEquipment,
  applyUnassignEquipment,
  patchVehicleEquipment,
  type EquipmentCheckKind,
  type EquipmentIssue,
} from "@/domain/equipment/equipment-mutations";
import {
  applyAutoTaskCompletions,
  applyReadyTripTaskCompletions,
} from "@/domain/tasks/task-completion";
import { canAcceptTask, canAssignTask, canCompleteTask, getUserDisplayName } from "@/domain/tasks/task-workflow";
import { computeReadiness } from "@/lib/readiness";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import type { YardRole } from "@/types/permissions";
import { getActorName } from "@/platform/yard/get-actor-name";
import { enqueueYardMutation } from "@/platform/yard/enqueue-yard-mutation";
import { publishVehicleVorMarked } from "@/platform/ops/publish-vor-marked";
import { createAdBlueRefillRecord } from "@/domain/fluids/adblue-refill";
import type { AdBlueRefillInput, AdBlueRefillRecord } from "@/types/fluids";
import type { OperationalDayPlan } from "@/types/plan";
import type { YardHubLayoutSnapshot } from "@veyvio/yard";
import type { YardTask } from "@/types/tasks";
import type {
  Bay,
  Defect,
  DefectSeverity,
  DepartureRelease,
  Movement,
  MovementReason,
  ShiftHandover,
  Trip,
  Vehicle,
  VehicleStatus,
  VorCase,
  VorLifecycle,
} from "@/types/yard";
import type {
  AssignedItem,
  EquipmentAuditEvent,
  ReadinessResult,
  VehicleEquipment,
} from "@/types/equipment";
import {
  approveBaselineInspection,
  completeInspectionRecord,
  createDamageRecordFromObservation,
  createInspection,
  createSnapshotFromInspection,
  buildDamageReview,
  updateProfileAfterBaseline,
} from "@/domain/condition/inspection-mutations";
import { openDamageForVehicle, formatDamageRef } from "@/domain/condition/condition-helpers";
import {
  defectCategoryForDamageType,
  operationalDecisionForDamage,
} from "@/domain/condition/damage-operational";
import {
  damageStatusAfterRepairComplete,
  damageStatusAfterRepairStart,
  damageStatusAfterVerification,
} from "@/domain/condition/repair-workflow";
import type {
  CustodyEvent,
  DamageObservation,
  DamageRecord,
  DamageReview,
  InspectionMedia,
  InspectionType,
  ObservationClassification,
  RepairWorkOrder,
  VehicleConditionProfile,
  VehicleConditionSnapshot,
  VehicleInspection,
} from "@/types/condition";

// --- Sheet UI state ---
export type SheetKind =
  | { kind: "move"; vehicleId: string }
  | { kind: "check"; vehicleId: string }
  | { kind: "defect"; vehicleId: string }
  | { kind: "vor"; caseId: string }
  | { kind: "quick" }
  | { kind: "assign-equipment"; vehicleId: string }
  | { kind: "equipment-label"; vehicleId: string; itemId: string }
  | { kind: "transfer-equipment"; vehicleId: string; itemId: string }
  | { kind: "restock-consumable"; vehicleId: string; defId?: string }
  | { kind: "report-equipment-issue"; vehicleId: string; itemId?: string; itemKind?: "fixed" | "assigned" }
  | { kind: "unassign-equipment"; vehicleId: string; itemId: string }
  | { kind: "scan-equipment"; vehicleId: string }
  | { kind: "arrival"; vehicleId?: string }
  | { kind: "stage-departure"; vehicleId: string }
  | { kind: "departure-release"; tripId: string }
  | null;

export type { EquipmentIssue } from "@/domain/equipment/equipment-mutations";

interface State {
  bays: Bay[];
  vehicles: Vehicle[];
  trips: Trip[];
  defects: Defect[];
  vorCases: VorCase[];
  movements: Movement[];
  adblueRefills: AdBlueRefillRecord[];
  yardChecks: YardCheckResult[];
  equipment: Record<string, VehicleEquipment>;
  equipmentAudit: EquipmentAuditEvent[];
  depotStock: StockLine[];
  departureReleases: DepartureRelease[];
  handovers: ShiftHandover[];
  tasks: YardTask[];
  sheet: SheetKind;
  conditionProfiles: Record<string, VehicleConditionProfile>;
  inspections: VehicleInspection[];
  inspectionMedia: InspectionMedia[];
  damageRecords: DamageRecord[];
  damageObservations: DamageObservation[];
  damageReviews: DamageReview[];
  conditionSnapshots: VehicleConditionSnapshot[];
  custodyTimeline: CustodyEvent[];
  repairWorkOrders: RepairWorkOrder[];
  operationalPlan: OperationalDayPlan | null;
  depotCode: string | null;
  yardMapEnabled: boolean;
  yardLayout: YardHubLayoutSnapshot | null;
  dataSource: BootstrapDataSource | null;
  hydrated: boolean;

  resetToEmpty: () => void;
  hydrateFromBootstrap: (payload: BootstrapPayload) => void;
  /** Drain driver/admin platform events (journey start, plan publish) while the app is open. */
  processIncomingOpsNotices: () => number;
  applyPublishedPlan: (plan: OperationalDayPlan) => void;
  acknowledgeOperationalPlan: () => boolean;

  // actions
  openSheet: (s: SheetKind) => void;
  closeSheet: () => void;
  moveVehicle: (vehicleId: string, toBayId: string, reason: MovementReason, note?: string) => void;
  recordAdBlueRefill: (vehicleId: string, input: AdBlueRefillInput) => AdBlueRefillRecord;
  completeCheck: (vehicleId: string, input: CompleteYardCheckInput) => Defect[];
  raiseDefect: (input: { vehicleId: string; category: string; severity: DefectSeverity; notes: string }) => Defect;
  resolveDefect: (defectId: string, note?: string) => Defect | null;
  raiseVorFromDefect: (defectId: string) => VorCase;
  advanceVor: (caseId: string, to: VorLifecycle, note?: string) => void;

  // equipment actions
  readiness: (vehicleId: string) => ReadinessResult;
  ensureVehicleEquipment: (vehicleId: string) => void;
  recordEquipmentPresence: (vehicleId: string, kind: EquipmentCheckKind, itemId: string, present: boolean) => void;
  assignEquipment: (vehicleId: string, item: Omit<AssignedItem, "assignedAt" | "assignedBy">) => string | null;
  transferEquipment: (fromVehicleId: string, itemId: string, toVehicleId: string) => void;
  unassignEquipment: (vehicleId: string, itemId: string, reason: string, destination: string) => void;
  restockConsumable: (vehicleId: string, defId: string, addQty: number) => void;
  reportEquipmentIssue: (vehicleId: string, kind: "fixed" | "assigned", itemId: string, issue: EquipmentIssue, note?: string) => void;
  clearEquipmentIssue: (vehicleId: string, kind: "fixed" | "assigned", itemId: string, note?: string) => void;

  releaseForDeparture: (tripId: string, checklist: { id: string; label: string; passed: boolean }[], note?: string) => void;
  departVehicleForService: (
    tripId: string,
    source: "driver_journey_start" | "yard_confirmed",
    externalEventId?: string,
  ) => boolean;
  completeHandover: (notes: string) => ShiftHandover;

  acceptTask: (taskId: string) => void;
  completeTask: (taskId: string, note?: string) => void;
  assignTask: (taskId: string, assigneeId: string, assigneeName: string) => void;

  startInspection: (vehicleId: string, inspectionType: InspectionType, mileage?: number) => VehicleInspection;
  addInspectionMedia: (inspectionId: string, media: Omit<InspectionMedia, "id" | "inspectionId">) => InspectionMedia;
  completeInspection: (inspectionId: string, opts?: { awaitingApproval?: boolean }) => VehicleInspection | null;
  approveBaseline: (inspectionId: string) => VehicleInspection | null;
  reportDamageObservation: (input: Omit<DamageObservation, "id" | "observedAt" | "mediaIds"> & { mediaIds?: string[] }) => DamageObservation;
  reviewDamageObservation: (
    observationId: string,
    decision: ObservationClassification,
    opts?: { linkedDamageId?: string; notes?: string; createNewDamage?: boolean },
  ) => DamageReview | null;
  requestRepair: (input: {
    vehicleId: string;
    description: string;
    damageId?: string;
    defectId?: string;
    assignedTo?: string;
  }) => RepairWorkOrder;
  startRepairWorkOrder: (workOrderId: string) => RepairWorkOrder | null;
  completeRepairWorkOrder: (workOrderId: string, notes?: string) => RepairWorkOrder | null;
  verifyRepairWorkOrder: (
    workOrderId: string,
    inspectionId: string,
    passed: boolean,
    notes?: string,
  ) => RepairWorkOrder | null;
}


const nowIso = () => new Date().toISOString();
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

/** Server-backed yard tasks use UUID ids; local automation uses `task_xxx` and must not sync. */
const SERVER_TASK_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function enqueueCreatedTasks(tasks: YardTask[]) {
  for (const task of tasks) {
    if (!SERVER_TASK_ID.test(task.id)) continue;
    void enqueueYardMutation("task.update", {
      taskId: task.id,
      action: "create",
      title: task.title,
      kind: task.kind,
      priority: task.priority,
      vehicleId: task.vehicleId,
      defectId: task.defectId,
      tripId: task.tripId,
    });
  }
}

function enqueueCompletedTasks(tasks: YardTask[]) {
  for (const task of tasks) {
    if (!SERVER_TASK_ID.test(task.id)) continue;
    void enqueueYardMutation("task.update", {
      taskId: task.id,
      action: "complete",
      note: task.completionNote,
      auto: true,
    });
  }
}

function refreshHubTasksAfterMutation() {
  const tenancy = getTenancySnapshot();
  if (!tenancy.companyId || !tenancy.depotId) return;
  void hydrateYardFromApi({
    companyId: tenancy.companyId,
    depotId: tenancy.depotId,
    role: (tenancy.role as YardRole) ?? "yard_manager",
  });
}

function equipmentMeta(vehicleId: string, actor: string) {
  return {
    vehicleId,
    at: nowIso(),
    by: actor,
    nextAuditId: () => uid("ea"),
  };
}

function emitVorMarked(vc: VorCase, vehicleReg?: string) {
  const tenancy = getTenancySnapshot();
  const session = getSessionSnapshot();
  publishVehicleVorMarked({
    companyId: tenancy.companyId ?? "unknown",
    depotId: tenancy.depotId ?? "unknown",
    actorId: session.user?.id ?? getActorName(),
    vehicleId: vc.vehicleId,
    vorCaseId: vc.id,
    defectId: vc.defectId,
    reason: vc.reason,
    vehicleReg,
  });
}

function commitTripState(
  st: { trips: Trip[]; tasks: YardTask[] },
  vehicles: Vehicle[],
  equipment: Record<string, VehicleEquipment>,
  incoming: YardTask[] = [],
) {
  const { tasks: withIncoming, added: incomingAdded } = mergeAutomatedTasks(st.tasks, incoming);
  const trips = recomputeAllTrips(st.trips, vehicles, equipment);
  const tripTasks = tasksFromBlockedTrips(trips, vehicles, withIncoming, "Yard automation", uid);
  const { tasks: withCreated, added: tripAdded } = mergeAutomatedTasks(withIncoming, tripTasks);
  const { tasks, completed } = applyReadyTripTaskCompletions(
    withCreated,
    trips,
    "Yard automation",
    nowIso(),
  );
  enqueueCreatedTasks([...incomingAdded, ...tripAdded]);
  enqueueCompletedTasks(completed);
  return { trips, tasks };
}

export const useYard = create<State>((set, get) => ({
  ...createEmptyYardCoreState(),

  resetToEmpty: () => set(createEmptyYardCoreState()),

  hydrateFromBootstrap: (payload) => {
    const plan = payload.operationalPlan ?? null;
    const actor = "Yard automation";
    const prepTasks = plan
      ? buildPrepTasksFromPlan(plan, payload.tasks ?? [], actor, uid)
      : [];
    const { tasks: withPrep, added: prepAdded } = mergeAutomatedTasks(payload.tasks ?? [], prepTasks);
    enqueueCreatedTasks(prepAdded);

    const equipment = mergeEquipmentForVehicles(payload.vehicles, {
      ...get().equipment,
      ...payload.equipment,
    });

    set({
      bays: payload.bays,
      vehicles: payload.vehicles,
      trips: recomputeAllTrips(payload.trips, payload.vehicles, equipment),
      defects: payload.defects,
      vorCases: payload.vorCases,
      movements: payload.movements,
      adblueRefills: payload.adblueRefills ?? get().adblueRefills,
      yardChecks: payload.yardChecks,
      equipment,
      depotStock: payload.depotStock,
      equipmentAudit: get().equipmentAudit,
      departureReleases: get().departureReleases,
      handovers: get().handovers,
      tasks: withPrep,
      conditionProfiles: payload.conditionProfiles ?? get().conditionProfiles,
      inspections: payload.inspections ?? get().inspections,
      inspectionMedia: payload.inspectionMedia ?? get().inspectionMedia,
      damageRecords: payload.damageRecords ?? get().damageRecords,
      damageObservations: payload.damageObservations ?? get().damageObservations,
      damageReviews: payload.damageReviews ?? get().damageReviews,
      conditionSnapshots: payload.conditionSnapshots ?? get().conditionSnapshots,
      custodyTimeline: payload.custodyTimeline ?? get().custodyTimeline,
      repairWorkOrders: payload.repairWorkOrders ?? [],
      operationalPlan: plan,
      depotCode: payload.depotCode ?? null,
      yardMapEnabled: payload.yardMapEnabled ?? false,
      yardLayout: payload.yardLayout ?? null,
      dataSource: payload.dataSource ?? "mock",
      hydrated: true,
    });
    get().processIncomingOpsNotices();
  },

  processIncomingOpsNotices: () => {
    let applied = 0;
    void import("@/platform/ops/ingest-driver-ops-events").then((m) => {
      const notices = m.ingestDriverOpsEventsForYard();
      for (const notice of notices) {
        if (notice.eventType === "journey.started") {
          const trip = get().trips.find(
            candidate => candidate.vehicleId === notice.vehicleId && !candidate.departedAt,
          );
          if (trip && get().departVehicleForService(trip.id, "driver_journey_start", notice.id)) {
            applied += 1;
          }
          continue;
        }
        if (notice.eventType === "plan.published") {
          const plan = m.planFromNoticePayload(notice.payload);
          if (plan) {
            get().applyPublishedPlan(plan);
            applied += 1;
          }
        }
      }
    });
    return applied;
  },

  applyPublishedPlan: (plan) => {
    const st = get();
    const actor = "Yard automation";
    const prepTasks = buildPrepTasksFromPlan(plan, st.tasks, actor, uid);
    const { tasks, added } = mergeAutomatedTasks(st.tasks, prepTasks);
    enqueueCreatedTasks(added);
    set({ operationalPlan: plan, tasks });
  },

  acknowledgeOperationalPlan: () => {
    const st = get();
    if (!canAcknowledgePlan(st.operationalPlan)) return false;
    const plan = acknowledgePlan(st.operationalPlan!, nowIso());
    set({ operationalPlan: plan });
    void enqueueYardMutation("plan.acknowledge", {
      planId: plan.id,
      operationalDate: plan.operationalDate,
      version: plan.version,
    });
    return true;
  },

  openSheet: (s) => set({ sheet: s }),
  closeSheet: () => set({ sheet: null }),

  moveVehicle: (vehicleId, toBayId, reason, note) => {
    const st = get();
    const v = st.vehicles.find(x => x.id === vehicleId);
    if (!v) return;
    const fromBayId = v.bayId;
    const vehicles = applyVehicleMove(st.vehicles, vehicleId, toBayId, st.bays);
    const actor = getActorName();
    const mv: Movement = { id: uid("m"), vehicleId, fromBayId, toBayId, reason, at: nowIso(), by: actor, note };
    const { trips, tasks } = commitTripState(st, vehicles, st.equipment);
    set({
      vehicles,
      movements: [mv, ...st.movements],
      trips,
      tasks,
    });
    const zone = zoneOfBay(toBayId, st.bays);
    void enqueueYardMutation("vehicle.move", {
      vehicleId,
      fromBayId,
      toBayId,
      zone,
      reason,
      note,
      movementId: mv.id,
    });
  },

  recordAdBlueRefill: (vehicleId, input) => {
    const st = get();
    const vehicle = st.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");

    const recordedAt = nowIso();
    const record = createAdBlueRefillRecord(vehicle, input, {
      id: uid("abr"),
      recordedAt,
      recordedBy: getActorName(),
      recordedByRole: "Yard operative",
    });

    set({ adblueRefills: [record, ...st.adblueRefills] });
    void enqueueYardMutation("vehicle.adblue_refill", record);
    return record;
  },

  completeCheck: (vehicleId, input) => {
    const st = get();
    const actor = getActorName();
    const completedAt = nowIso();
    const overallPassed = computeOverallPassed(input.sections);
    const safetyOutcome = computeSafetyOutcome(input.sections);
    const check: YardCheckResult = {
      id: uid("c"),
      vehicleId,
      checkType: input.checkType,
      startedAt: input.startedAt,
      completedAt,
      at: completedAt,
      by: actor,
      odometer: input.odometer,
      sections: input.sections,
      overallPassed,
      safetyOutcome,
      durationSeconds: input.durationSeconds,
      deviceLabel: input.deviceLabel,
      offlineSubmission: input.offlineSubmission,
    };
    const linkedInspection = createInspection(
      vehicleId,
      input.checkType === "yard-spot" ? "manager-audit" : "yard-check",
      actor,
      input.startedAt,
      uid,
      { mileage: input.odometer, checkId: check.id },
    );
    const completedInspection = completeInspectionRecord(linkedInspection, completedAt);
    check.inspectionId = completedInspection.id;
    const isAudit = isManagerAuditCheck(input.checkType);
    const defectSections = input.sections.filter(s => s.outcome === "defect");
    const newDefects: Defect[] = defectSections.map(s => {
      const def = getSectionDef(s.sectionId);
      const failedLabels = s.failedItemIds
        ?.map(id => def?.items.find(i => i.id === id)?.label)
        .filter(Boolean)
        .join("; ");
      const baseNote = [s.note, failedLabels].filter(Boolean).join(" — ") || `Defect: ${s.title}`;
      return {
        id: uid("df"),
        vehicleId,
        category: def?.title ?? s.title,
        severity: severityForSection(s.sectionId),
        notes: isAudit ? `[Manager audit] ${baseNote}` : baseNote,
        raisedAt: completedAt,
        raisedBy: actor,
        resolved: false,
        photoUrls: s.photoDataUrls?.length ? s.photoDataUrls : undefined,
        auditFinding: isAudit || undefined,
        sourceCheckId: isAudit ? check.id : undefined,
      };
    });
    const newVorCases: VorCase[] = [];
    const defectsWithVor = newDefects.map((df, i) => {
      const section = defectSections[i];
      if (!shouldAutoVorFromSection(section)) return df;
      const vc = buildVorCaseFromDefect(df, actor, completedAt, uid);
      newVorCases.push(vc);
      return { ...df, vorCaseId: vc.id };
    });
    const isReturnToService = input.checkType === "return-to-service";
    let vorCases = [...newVorCases, ...st.vorCases];
    const vehicles: Vehicle[] = st.vehicles.map(v => {
      if (v.id !== vehicleId) return v;
      let nextStatus: VehicleStatus = v.status;
      if (safetyOutcome === "vor" || newVorCases.length > 0) nextStatus = "VOR";
      else if (isReturnToService && overallPassed) nextStatus = "Available";
      else if (safetyOutcome === "hold") nextStatus = "Awaiting Check";
      else if (overallPassed && v.status === "Awaiting Check") nextStatus = "Available";
      else if (!overallPassed && v.status !== "VOR") nextStatus = "Awaiting Check";
      return {
        ...v,
        lastCheckAt: completedAt,
        lastCheckPassed: overallPassed,
        status: nextStatus,
      };
    });
    let custodyTimeline = st.custodyTimeline;
    if (isReturnToService && overallPassed && safetyOutcome !== "vor") {
      vorCases = vorCases.map(vc =>
        vc.vehicleId === vehicleId && vc.lifecycle !== "Cleared"
          ? {
            ...vc,
            lifecycle: "Cleared",
            history: [
              ...vc.history,
              { at: completedAt, by: actor, from: vc.lifecycle, to: "Cleared", note: "Return-to-service check passed" },
            ],
          }
          : vc,
      );
      custodyTimeline = [{
        id: uid("cust"),
        vehicleId,
        at: completedAt,
        kind: "yard_inspection",
        label: "Return to service authorised",
        actor,
        referenceId: check.id,
      }, ...custodyTimeline];
    }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const defectTasks = defectsWithVor.map(df => buildDefectTask(df, vehicle, actor, uid));
    const vorTasks = newVorCases.map(vc => buildVorTask(vc, vehicle, actor, uid));
    let tasks = st.tasks;
    let checkCompleted: YardTask[] = [];
    if (overallPassed) {
      const result = applyAutoTaskCompletions(
        tasks,
        [{ type: "check_passed", vehicleId }],
        actor,
        nowIso(),
      );
      tasks = result.tasks;
      checkCompleted = result.completed;
    }
    enqueueCompletedTasks(checkCompleted);
    const { trips, tasks: nextTasks } = commitTripState(
      { trips: st.trips, tasks },
      vehicles,
      st.equipment,
      [...defectTasks, ...vorTasks],
    );
    set({
      yardChecks: [check, ...st.yardChecks],
      inspections: [completedInspection, ...st.inspections],
      defects: [...defectsWithVor, ...st.defects],
      vorCases,
      vehicles,
      trips,
      tasks: nextTasks,
      custodyTimeline,
    });
    void enqueueYardMutation("check.complete", {
      checkId: check.id,
      vehicleId,
      checkType: input.checkType,
      startedAt: input.startedAt,
      passed: overallPassed,
      safetyOutcome,
      sections: input.sections,
      odometer: input.odometer,
      durationSeconds: input.durationSeconds,
      offlineSubmission: input.offlineSubmission,
    });
    for (const vc of newVorCases) {
      void enqueueYardMutation("vehicle.mark_vor", {
        vorCaseId: vc.id,
        vehicleId: vc.vehicleId,
        defectId: vc.defectId,
        reason: vc.reason,
      });
      const markedVehicle = vehicles.find(v => v.id === vc.vehicleId);
      emitVorMarked(vc, markedVehicle?.reg);
    }
    return defectsWithVor;
  },

  raiseDefect: ({ vehicleId, category, severity, notes }) => {
    const st = get();
    const actor = getActorName();
    const df: Defect = {
      id: uid("df"), vehicleId, category, severity, notes,
      raisedAt: nowIso(), raisedBy: actor, resolved: false,
    };
    const vehicles = severity === "Safety-critical"
      ? st.vehicles.map(v => v.id === vehicleId ? { ...v, lastCheckPassed: false, status: v.status === "VOR" ? "VOR" : "Awaiting Check" as VehicleStatus } : v)
      : st.vehicles;
    const vehicle = st.vehicles.find(v => v.id === vehicleId);
    const defectTask = buildDefectTask(df, vehicle, actor, uid);
    const { trips, tasks } = commitTripState(st, vehicles, st.equipment, [defectTask]);
    set({ defects: [df, ...st.defects], vehicles, trips, tasks });
    void enqueueYardMutation("defect.create", { defectId: df.id, vehicleId, category, severity, notes });
    return df;
  },

  resolveDefect: (defectId, note) => {
    const st = get();
    const df = st.defects.find(d => d.id === defectId);
    if (!df) return null;
    const vorCase = df.vorCaseId ? st.vorCases.find(c => c.id === df.vorCaseId) : undefined;
    if (!canResolveDefect(df, vorCase).ok) return null;

    const actor = getActorName();
    const at = nowIso();
    const updated = applyResolveDefect(df, actor, at, note);
    const defects = st.defects.map(d => d.id === defectId ? updated : d);
    const { tasks: afterComplete, completed } = applyAutoTaskCompletions(
      st.tasks,
      [{ type: "defect_resolved", defectId }],
      actor,
      at,
    );
    enqueueCompletedTasks(completed);
    const { trips, tasks } = commitTripState(
      { trips: st.trips, tasks: afterComplete },
      st.vehicles,
      st.equipment,
    );
    set({ defects, trips, tasks });
    void enqueueYardMutation("defect.resolve", {
      defectId,
      vehicleId: updated.vehicleId,
      note,
      resolvedAt: at,
      resolvedBy: actor,
    });
    return updated;
  },

  raiseVorFromDefect: (defectId) => {
    const st = get();
    const actor = getActorName();
    const df = st.defects.find(d => d.id === defectId);
    if (!df) throw new Error("Defect not found");
    if (df.vorCaseId) {
      const existing = st.vorCases.find(c => c.id === df.vorCaseId);
      if (existing) return existing;
    }
    const vc = buildVorCaseFromDefect(df, actor, nowIso(), uid);
    const vehicles = st.vehicles.map(v => v.id === df.vehicleId ? { ...v, status: "VOR" as VehicleStatus } : v);
    const defects = st.defects.map(d => d.id === defectId ? { ...d, vorCaseId: vc.id } : d);
    const vehicle = st.vehicles.find(v => v.id === df.vehicleId);
    const vorTask = buildVorTask(vc, vehicle, actor, uid);
    const { trips, tasks } = commitTripState(st, vehicles, st.equipment, [vorTask]);
    set({
      vorCases: [vc, ...st.vorCases],
      defects,
      vehicles,
      trips,
      tasks,
    });
    void enqueueYardMutation("vehicle.mark_vor", { vorCaseId: vc.id, vehicleId: df.vehicleId, defectId, reason: vc.reason });
    emitVorMarked(vc, vehicle?.reg);
    return vc;
  },

  advanceVor: (caseId, to, note) => {
    const st = get();
    const actor = getActorName();
    const c = st.vorCases.find(x => x.id === caseId);
    if (!c) return;
    const from = c.lifecycle;
    const updated: VorCase = {
      ...c,
      lifecycle: to,
      history: [...c.history, { at: nowIso(), by: actor, from, to, note }],
    };
    const vorCases = st.vorCases.map(x => x.id === caseId ? updated : x);
    let vehicles = st.vehicles;
    if (to === "Cleared") {
      vehicles = st.vehicles.map(v => v.id === c.vehicleId ? { ...v, status: "Awaiting Check" as VehicleStatus, lastCheckPassed: false } : v);
    } else {
      vehicles = st.vehicles.map(v => v.id === c.vehicleId ? { ...v, status: "VOR" as VehicleStatus } : v);
    }
    const { trips, tasks } = commitTripState(st, vehicles, st.equipment);
    let nextTasks = tasks;
    let vorCompleted: YardTask[] = [];
    if (to === "Cleared") {
      const result = applyAutoTaskCompletions(
        tasks,
        [{ type: "vor_cleared", vehicleId: c.vehicleId, defectId: c.defectId }],
        actor,
        nowIso(),
      );
      nextTasks = result.tasks;
      vorCompleted = result.completed;
    }
    enqueueCompletedTasks(vorCompleted);
    set({ vorCases, vehicles, trips, tasks: nextTasks });
    if (to === "Cleared") {
      void enqueueYardMutation("vehicle.release_vor", { caseId, vehicleId: c.vehicleId, note });
    }
  },

  // -------- Equipment --------
  readiness: (vehicleId) => {
    const st = get();
    const v = st.vehicles.find(x => x.id === vehicleId);
    if (!v) return { state: "unknown", totals: { complete: 0, total: 0 }, blockers: [], restrictions: [], warnings: [], summary: "Unknown" };
    return computeReadiness(v, st.equipment[vehicleId]);
  },

  ensureVehicleEquipment: (vehicleId) => {
    const st = get();
    if (isValidVehicleEquipment(st.equipment[vehicleId])) return;
    const v = st.vehicles.find(x => x.id === vehicleId);
    if (!v) return;
    const equipment = {
      ...st.equipment,
      [vehicleId]: buildEquipmentForVehicle(v.id, v.type),
    };
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({ equipment, trips, tasks });
  },

  recordEquipmentPresence: (vehicleId, kind, itemId, present) => {
    const st = get();
    const actor = getActorName();
    const result = applyRecordEquipmentPresence(
      st.equipment[vehicleId],
      kind,
      itemId,
      present,
      equipmentMeta(vehicleId, actor),
    );
    if (!result) return;
    const equipment = patchVehicleEquipment(st.equipment, vehicleId, result.equipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
  },

  assignEquipment: (vehicleId, item) => {
    const st = get();
    const actor = getActorName();
    const result = applyAssignEquipment(st.equipment[vehicleId], item, equipmentMeta(vehicleId, actor));
    if (!result) return null;
    const equipment = patchVehicleEquipment(st.equipment, vehicleId, result.equipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
    void enqueueYardMutation("equipment.assign", { vehicleId, itemId: result.itemId, label: result.label });
    return result.itemId;
  },

  transferEquipment: (fromVehicleId, itemId, toVehicleId) => {
    if (fromVehicleId === toVehicleId) return;
    const st = get();
    const actor = getActorName();
    const toVehicle = st.vehicles.find(v => v.id === toVehicleId);
    if (!toVehicle) return;
    const result = applyTransferEquipment(
      st.equipment[fromVehicleId],
      st.equipment[toVehicleId],
      itemId,
      toVehicle.reg,
      equipmentMeta(fromVehicleId, actor),
    );
    if (!result) return;
    let equipment = patchVehicleEquipment(st.equipment, fromVehicleId, result.sourceEquipment);
    equipment = patchVehicleEquipment(equipment, toVehicleId, result.targetEquipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
    void enqueueYardMutation("equipment.transfer", {
      fromVehicleId,
      toVehicleId,
      itemId,
      label: result.label,
    });
  },

  unassignEquipment: (vehicleId, itemId, reason, destination) => {
    const st = get();
    const actor = getActorName();
    const result = applyUnassignEquipment(
      st.equipment[vehicleId],
      itemId,
      reason,
      destination,
      equipmentMeta(vehicleId, actor),
    );
    if (!result) return;
    const equipment = patchVehicleEquipment(st.equipment, vehicleId, result.equipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
    void enqueueYardMutation("equipment.transfer", { vehicleId, itemId, reason, destination });
  },

  restockConsumable: (vehicleId, defId, addQty) => {
    const st = get();
    const actor = getActorName();
    const result = applyRestockConsumable(
      st.equipment[vehicleId],
      st.depotStock,
      defId,
      addQty,
      equipmentMeta(vehicleId, actor),
    );
    if (!result) return;
    const equipment = patchVehicleEquipment(st.equipment, vehicleId, result.equipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      depotStock: result.depotStock,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
    void enqueueYardMutation("equipment.restock", { vehicleId, defId, addQty });
  },

  reportEquipmentIssue: (vehicleId, kind, itemId, issue, note) => {
    const st = get();
    const actor = getActorName();
    const result = applyReportEquipmentIssue(
      st.equipment[vehicleId],
      kind,
      itemId,
      issue,
      note,
      equipmentMeta(vehicleId, actor),
    );
    if (!result) return;
    const equipment = patchVehicleEquipment(st.equipment, vehicleId, result.equipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
  },

  clearEquipmentIssue: (vehicleId, kind, itemId, note) => {
    const st = get();
    const actor = getActorName();
    const result = applyClearEquipmentIssue(
      st.equipment[vehicleId],
      kind,
      itemId,
      note,
      equipmentMeta(vehicleId, actor),
    );
    if (!result) return;
    const equipment = patchVehicleEquipment(st.equipment, vehicleId, result.equipment);
    const { trips, tasks } = commitTripState(st, st.vehicles, equipment);
    set({
      equipment,
      equipmentAudit: [result.audit, ...st.equipmentAudit],
      trips,
      tasks,
    });
  },

  releaseForDeparture: (tripId, checklist, note) => {
    const st = get();
    const trip = st.trips.find(t => t.id === tripId);
    if (!trip?.vehicleId || !trip.ready || trip.releasedAt) return;
    const actor = getActorName();
    const at = nowIso();
    const release: DepartureRelease = {
      id: uid("dr"),
      tripId,
      vehicleId: trip.vehicleId,
      at,
      by: actor,
      checklist,
      note,
    };
    const trips = st.trips.map(t =>
      t.id === tripId ? { ...t, releasedAt: at, releasedBy: actor } : t,
    );
    const { tasks, completed } = applyAutoTaskCompletions(
      st.tasks,
      [{ type: "trip_released", tripId }],
      actor,
      at,
    );
    enqueueCompletedTasks(completed);
    set({
      trips,
      tasks,
      departureReleases: [release, ...st.departureReleases],
    });
    void enqueueYardMutation("departure.release", { releaseId: release.id, tripId, vehicleId: trip.vehicleId, checklist, note });
  },

  departVehicleForService: (tripId, source, externalEventId) => {
    const st = get();
    const trip = st.trips.find(candidate => candidate.id === tripId);
    if (!trip?.vehicleId) return false;
    const vehicle = st.vehicles.find(candidate => candidate.id === trip.vehicleId);
    if (!vehicle) return false;

    const at = nowIso();
    const actor = source === "driver_journey_start" ? "Veyvio Driver" : getActorName();
    const result = applyVehicleDeparture({
      trip,
      vehicle,
      vehicles: st.vehicles,
      bays: st.bays,
      at,
      by: actor,
      source,
      movementId: uid("m"),
    });
    if (!result) return false;

    const markedTrips = st.trips.map(candidate =>
      candidate.id === tripId ? result.trip : candidate,
    );
    const { trips, tasks } = commitTripState({ ...st, trips: markedTrips }, result.vehicles, st.equipment);

    set({
      vehicles: result.vehicles,
      movements: [result.movement, ...st.movements],
      trips,
      tasks,
    });
    void enqueueYardMutation("departure.complete", {
      tripId,
      vehicleId: vehicle.id,
      fromBayId: result.fromBayId,
      movementId: result.movement.id,
      departedAt: at,
      source,
      externalEventId,
    });
    return true;
  },

  completeHandover: (notes) => {
    const st = get();
    const actor = getActorName();
    const summary = buildHandoverSummary(st.vehicles, st.trips, st.defects, st.vorCases);
    const handover: ShiftHandover = {
      id: uid("ho"),
      at: nowIso(),
      by: actor,
      summary,
      notes,
    };
    set({ handovers: [handover, ...st.handovers] });
    void enqueueYardMutation("handover.complete", { handoverId: handover.id, summary, notes });
    return handover;
  },

  acceptTask: (taskId) => {
    const st = get();
    const user = getSessionSnapshot().user;
    if (!user) return;
    const userName = getUserDisplayName(user);
    const task = st.tasks.find(t => t.id === taskId);
    if (!task || !canAcceptTask(task, user.id, userName)) return;
    const actor = getActorName();
    const updated: YardTask = {
      ...task,
      status: "in_progress",
      assigneeId: user.id,
      assigneeName: actor,
      acceptedAt: nowIso(),
    };
    set({ tasks: st.tasks.map(t => t.id === taskId ? updated : t) });
    void enqueueYardMutation("task.update", {
      taskId,
      action: "accept",
      assigneeId: user.id,
      assigneeName: actor,
    });
    void refreshHubTasksAfterMutation();
  },

  completeTask: (taskId, note) => {
    const st = get();
    const user = getSessionSnapshot().user;
    if (!user) return;
    const userName = getUserDisplayName(user);
    const task = st.tasks.find(t => t.id === taskId);
    if (!task || !canCompleteTask(task, user.id, userName)) return;
    const actor = getActorName();
    const updated: YardTask = {
      ...task,
      status: "completed",
      completedAt: nowIso(),
      completedBy: actor,
      completionNote: note,
    };
    set({ tasks: st.tasks.map(t => t.id === taskId ? updated : t) });
    void enqueueYardMutation("task.update", { taskId, action: "complete", note });
    void refreshHubTasksAfterMutation();
  },

  assignTask: (taskId, assigneeId, assigneeName) => {
    const st = get();
    const task = st.tasks.find(t => t.id === taskId);
    if (!task || !canAssignTask(task)) return;
    const updated: YardTask = {
      ...task,
      status: "assigned",
      assigneeId,
      assigneeName,
    };
    set({ tasks: st.tasks.map(t => t.id === taskId ? updated : t) });
    void enqueueYardMutation("task.update", { taskId, action: "assign", assigneeId, assigneeName });
  },

  startInspection: (vehicleId, inspectionType, mileage) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const inspection = createInspection(vehicleId, inspectionType, actor, at, uid, { mileage });
    const profiles = { ...st.conditionProfiles };
    const profile = profiles[vehicleId] ?? { vehicleId, baselineStatus: "not_started", conditionRating: "unknown" as const };
    if (inspectionType === "onboarding-baseline" && profile.baselineStatus === "not_started") {
      profiles[vehicleId] = { ...profile, baselineStatus: "in_progress" };
    }
    set({
      inspections: [inspection, ...st.inspections],
      conditionProfiles: profiles,
    });
    void enqueueYardMutation("inspection.start", {
      inspectionId: inspection.id,
      vehicleId,
      inspectionType,
      startedAt: inspection.startedAt,
      mileage: inspection.mileage,
      location: inspection.location,
    });
    return inspection;
  },

  addInspectionMedia: (inspectionId, media) => {
    const st = get();
    const item: InspectionMedia = { ...media, id: uid("med"), inspectionId };
    set({ inspectionMedia: [item, ...st.inspectionMedia] });
    void enqueueYardMutation("inspection.media", {
      inspectionId,
      mediaId: item.id,
      media: item,
    });
    return item;
  },

  completeInspection: (inspectionId, opts) => {
    const st = get();
    const inspection = st.inspections.find(i => i.id === inspectionId);
    if (!inspection) return null;
    const at = nowIso();
    const actor = getActorName();
    const completed = completeInspectionRecord(inspection, at, opts);
    const custodyEvent: CustodyEvent = {
      id: uid("cust"),
      vehicleId: inspection.vehicleId,
      at,
      kind: "yard_inspection",
      label: `${completed.inspectionType.replace(/-/g, " ")} completed`,
      actor,
      referenceId: inspectionId,
    };
    set({
      inspections: st.inspections.map(i => i.id === inspectionId ? completed : i),
      custodyTimeline: [custodyEvent, ...st.custodyTimeline],
    });
    void enqueueYardMutation("inspection.complete", { inspectionId, status: completed.status });
    return completed;
  },

  approveBaseline: (inspectionId) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const inspection = st.inspections.find(i => i.id === inspectionId);
    if (!inspection || inspection.inspectionType !== "onboarding-baseline") return null;
    const approved = approveBaselineInspection(inspection, actor, at);
    const openDamage = openDamageForVehicle(st.damageRecords, inspection.vehicleId);
    const rating = openDamage.some(d => d.severity === "safety_critical")
      ? "poor" as const
      : openDamage.length > 0 ? "fair" as const : "good" as const;
    const snapshot = createSnapshotFromInspection(
      approved,
      openDamage.length,
      rating,
      actor,
      at,
      uid,
      openDamage.length > 0
        ? `Baseline approved with ${openDamage.length} pre-existing damage area(s) recorded.`
        : "Clean baseline — no pre-existing damage recorded.",
    );
    const profile = st.conditionProfiles[inspection.vehicleId] ?? {
      vehicleId: inspection.vehicleId,
      baselineStatus: "not_started",
      conditionRating: "unknown" as const,
    };
    const vehicles = st.vehicles.map(v =>
      v.id === inspection.vehicleId && v.status === "Awaiting Check"
        ? { ...v, status: "Available" as VehicleStatus }
        : v,
    );
    set({
      inspections: st.inspections.map(i => i.id === inspectionId ? approved : i),
      conditionSnapshots: [snapshot, ...st.conditionSnapshots],
      conditionProfiles: {
        ...st.conditionProfiles,
        [inspection.vehicleId]: updateProfileAfterBaseline(profile, approved.id, snapshot.id, rating),
      },
      vehicles,
    });
    void enqueueYardMutation("inspection.approve", { inspectionId, snapshotId: snapshot.id });
    return approved;
  },

  reportDamageObservation: (input) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const obs: DamageObservation = {
      ...input,
      id: uid("obs"),
      observedAt: at,
      reportedBy: input.reportedBy || actor,
      mediaIds: input.mediaIds ?? [],
    };
    let damageRecords = st.damageRecords;
    if (["new_not_reported", "new_previously_reported"].includes(obs.classification)) {
      const record = createDamageRecordFromObservation(obs, uid);
      obs.damageId = record.id;
      damageRecords = [record, ...damageRecords];
    } else if (obs.classification === "existing_worsened" && input.damageId) {
      damageRecords = damageRecords.map(d =>
        d.id === input.damageId
          ? { ...d, lastConfirmedAt: at, status: "repair_required" as const, severity: obs.severity ?? d.severity }
          : d,
      );
      obs.damageId = input.damageId;
    }
    set({
      damageObservations: [obs, ...st.damageObservations],
      damageRecords,
    });
    void enqueueYardMutation("damage.report", { observationId: obs.id, vehicleId: obs.vehicleId });
    return obs;
  },

  reviewDamageObservation: (observationId, decision, opts) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const obs = st.damageObservations.find(o => o.id === observationId);
    if (!obs) return null;

    let damageRecords = st.damageRecords;
    if (opts?.createNewDamage && !obs.damageId) {
      const record = createDamageRecordFromObservation({ ...obs, classification: decision }, uid);
      damageRecords = [{ ...record, status: "confirmed" }, ...damageRecords];
    } else if (obs.damageId && decision === "existing_unchanged") {
      damageRecords = damageRecords.map(d =>
        d.id === obs.damageId ? { ...d, status: "monitoring" as const, lastConfirmedAt: at } : d,
      );
    } else if (obs.damageId && decision === "existing_worsened") {
      damageRecords = damageRecords.map(d =>
        d.id === obs.damageId
          ? { ...d, status: "repair_required" as const, lastConfirmedAt: at, severity: obs.severity ?? d.severity }
          : d,
      );
    }

    const linkedDamageId = opts?.linkedDamageId ?? obs.damageId
      ?? damageRecords.find(d => d.firstObservationId === observationId)?.id;
    const record = linkedDamageId ? damageRecords.find(d => d.id === linkedDamageId) : undefined;
    const actionable = ["new_not_reported", "existing_worsened"].includes(decision);

    let operationalNote: string | undefined;
    let defects = st.defects;
    let vorCases = st.vorCases;
    let vehicles = st.vehicles;
    let tasks = st.tasks;

    if (record && actionable) {
      const op = operationalDecisionForDamage(record, obs.safeToOperate ?? true);
      operationalNote = op.reason;
      damageRecords = damageRecords.map(d =>
        d.id === record.id
          ? {
            ...d,
            operationalImpact: op.status !== "available_monitored",
            status: op.recommendVor ? "repair_required" as const : d.status,
          }
          : d,
      );

      if (op.defectSeverity) {
        const df: Defect = {
          id: uid("df"),
          vehicleId: record.vehicleId,
          category: defectCategoryForDamageType(record.damageType),
          severity: op.defectSeverity,
          notes: `[${formatDamageRef(record.id)}] ${record.description ?? record.title}${opts?.notes ? ` — ${opts.notes}` : ""}`,
          raisedAt: at,
          raisedBy: actor,
          resolved: false,
        };
        defects = [df, ...defects];
        damageRecords = damageRecords.map(d => d.id === record.id ? { ...d, defectId: df.id } : d);

        const vehicle = vehicles.find(v => v.id === record.vehicleId);
        if (op.recommendVor && op.vehicleStatus === "VOR") {
          const vc = buildVorCaseFromDefect(df, actor, at, uid);
          vorCases = [vc, ...vorCases];
          defects = defects.map(d => d.id === df.id ? { ...d, vorCaseId: vc.id } : d);
          vehicles = vehicles.map(v =>
            v.id === record.vehicleId ? { ...v, status: "VOR" as VehicleStatus } : v,
          );
          const merged = mergeAutomatedTasks(tasks, [
            buildDefectTask(df, vehicle, actor, uid),
            buildVorTask(vc, vehicle, actor, uid),
          ]);
          tasks = merged.tasks;
          enqueueCreatedTasks(merged.added);
        } else {
          const merged = mergeAutomatedTasks(tasks, [buildDefectTask(df, vehicle, actor, uid)]);
          tasks = merged.tasks;
          enqueueCreatedTasks(merged.added);
        }
      }
    }

    const review = buildDamageReview(observationId, actor, at, decision, uid, {
      linkedDamageId,
      notes: opts?.notes,
      operationalDecision: operationalNote,
    });

    const custodyEvent: CustodyEvent = {
      id: uid("cust"),
      vehicleId: obs.vehicleId,
      at,
      kind: "damage_review",
      label: `Damage review: ${decision.replace(/_/g, " ")}`,
      actor,
      referenceId: review.id,
    };

    const { trips, tasks: nextTasks } = commitTripState(
      { trips: st.trips, tasks },
      vehicles,
      st.equipment,
    );

    set({
      damageReviews: [review, ...st.damageReviews],
      damageRecords,
      damageObservations: st.damageObservations.map(o =>
        o.id === observationId
          ? { ...o, classification: decision, damageId: linkedDamageId ?? o.damageId }
          : o,
      ),
      defects,
      vorCases,
      vehicles,
      trips,
      tasks: nextTasks,
      custodyTimeline: [custodyEvent, ...st.custodyTimeline],
    });
    void enqueueYardMutation("damage.review", { reviewId: review.id, observationId, decision });
    return review;
  },

  requestRepair: (input) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const order: RepairWorkOrder = {
      id: uid("rwo"),
      vehicleId: input.vehicleId,
      damageId: input.damageId,
      defectId: input.defectId,
      status: "open",
      description: input.description,
      assignedTo: input.assignedTo,
      requestedAt: at,
      requestedBy: actor,
    };
    let damageRecords = st.damageRecords;
    if (input.damageId) {
      damageRecords = damageRecords.map(d =>
        d.id === input.damageId ? { ...d, status: "repair_scheduled" as const } : d,
      );
    }
    set({
      repairWorkOrders: [order, ...st.repairWorkOrders],
      damageRecords,
    });
    void enqueueYardMutation("repair.request", { orderId: order.id, vehicleId: input.vehicleId });
    return order;
  },

  startRepairWorkOrder: (workOrderId) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const order = st.repairWorkOrders.find(o => o.id === workOrderId);
    if (!order || !["open", "scheduled"].includes(order.status)) return null;
    const updated: RepairWorkOrder = { ...order, status: "in_progress" };
    let damageRecords = st.damageRecords;
    if (order.damageId) {
      damageRecords = damageRecords.map(d =>
        d.id === order.damageId
          ? { ...d, status: damageStatusAfterRepairStart(d.status) }
          : d,
      );
    }
    const custodyEvent: CustodyEvent = {
      id: uid("cust"),
      vehicleId: order.vehicleId,
      at,
      kind: "workshop",
      label: `Repair started — ${order.description}`,
      actor,
      referenceId: workOrderId,
    };
    set({
      repairWorkOrders: st.repairWorkOrders.map(o => o.id === workOrderId ? updated : o),
      damageRecords,
      custodyTimeline: [custodyEvent, ...st.custodyTimeline],
    });
    void enqueueYardMutation("repair.start", { orderId: workOrderId });
    return updated;
  },

  completeRepairWorkOrder: (workOrderId, notes) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const order = st.repairWorkOrders.find(o => o.id === workOrderId);
    if (!order || order.status !== "in_progress") return null;
    const updated: RepairWorkOrder = {
      ...order,
      status: "awaiting_verification",
      completedAt: at,
      notes: notes ? [order.notes, notes].filter(Boolean).join(" — ") : order.notes,
    };
    let damageRecords = st.damageRecords;
    if (order.damageId) {
      damageRecords = damageRecords.map(d =>
        d.id === order.damageId
          ? { ...d, status: damageStatusAfterRepairComplete(d.status), lastConfirmedAt: at }
          : d,
      );
    }
    const custodyEvent: CustodyEvent = {
      id: uid("cust"),
      vehicleId: order.vehicleId,
      at,
      kind: "workshop",
      label: `Workshop complete — awaiting verification`,
      actor,
      referenceId: workOrderId,
    };
    set({
      repairWorkOrders: st.repairWorkOrders.map(o => o.id === workOrderId ? updated : o),
      damageRecords,
      custodyTimeline: [custodyEvent, ...st.custodyTimeline],
    });
    void enqueueYardMutation("repair.complete", { orderId: workOrderId });
    return updated;
  },

  verifyRepairWorkOrder: (workOrderId, inspectionId, passed, notes) => {
    const st = get();
    const actor = getActorName();
    const at = nowIso();
    const order = st.repairWorkOrders.find(o => o.id === workOrderId);
    if (!order || order.status !== "awaiting_verification") return null;

    const updated: RepairWorkOrder = {
      ...order,
      status: passed ? "completed" : "in_progress",
      verificationInspectionId: passed ? inspectionId : order.verificationInspectionId,
      completedAt: passed ? at : undefined,
      notes: notes ? [order.notes, notes].filter(Boolean).join(" — ") : order.notes,
    };

    let damageRecords = st.damageRecords;
    if (order.damageId) {
      damageRecords = damageRecords.map(d =>
        d.id === order.damageId
          ? { ...d, status: damageStatusAfterVerification(passed), lastConfirmedAt: at }
          : d,
      );
    }

    let defects = st.defects;
    if (passed && order.defectId) {
      defects = defects.map(d =>
        d.id === order.defectId
          ? applyResolveDefect(d, actor, at, notes ?? "Repair verified by post-repair inspection")
          : d,
      );
    }

    const custodyEvent: CustodyEvent = {
      id: uid("cust"),
      vehicleId: order.vehicleId,
      at,
      kind: "workshop",
      label: passed
        ? "Post-repair verification passed"
        : "Post-repair verification failed — returned to workshop",
      actor,
      referenceId: workOrderId,
    };

    set({
      repairWorkOrders: st.repairWorkOrders.map(o => o.id === workOrderId ? updated : o),
      damageRecords,
      defects,
      custodyTimeline: [custodyEvent, ...st.custodyTimeline],
    });
    void enqueueYardMutation("repair.verify", { orderId: workOrderId, inspectionId, passed });
    return updated;
  },
}));


export function useVehicleReadiness(vehicleId: string): ReadinessResult {
  const vehicle = useYard(s => s.vehicles.find(x => x.id === vehicleId));
  const equipment = useYard(s => s.equipment[vehicleId]);
  return useMemo(() => {
    if (!vehicle) {
      return { state: "unknown", totals: { complete: 0, total: 0 }, blockers: [], restrictions: [], warnings: [], summary: "Unknown" };
    }
    return computeReadiness(vehicle, equipment);
  }, [vehicle, equipment]);
}
