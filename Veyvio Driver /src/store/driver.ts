import { create } from "zustand";
import type { DutyDetail, DutySummary } from "@/types/duty";
import type { DriverHomeSummary } from "@/types/home";
import type { TripDetail, TripsSchedulePayload } from "@/types/trips";
import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import { buildMockHomeSummary, buildActiveJourneyHomeSummary } from "@/data/mocks/home-summary";
import { buildMockTripsSchedule, getTripDetail } from "@/data/mocks/trips-schedule";
import { buildMockVehicleChecksHome } from "@/data/mocks/vehicle-check";
import { buildMockMessagesInbox } from "@/data/mocks/messages-inbox";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { useMoreStore } from "@/store/more";
import { useMessagesStore } from "@/store/messages";
import { buildMockDriverMore } from "@/data/mocks/driver-more";
import { fetchDutyDetail } from "@/platform/api/driver-api";
import { getMockDutyDetail, syncMockDutyDetail } from "@/data/mocks/duties";
import { isOnline } from "@/platform/device/connectivity";
import { useSyncStore } from "@/platform/sync/outbox";
import type { VehicleHandbackRecord } from "@veyvio/ops";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";
import {
  custodyEndsAfterJourney,
  getActiveJourneyId,
  getNextJourney,
} from "@/domain/journey/active-journey";

/** Prefer whichever duty projection is further through prep / live service. */
function prepProgressScore(duty: DutyDetail): number {
  let score = 0;
  if (["acknowledged", "ready", "in_progress", "completed"].includes(duty.lifecycleStatus)) {
    score += 1;
  }
  if (duty.vehicleVerified) score += 2;
  if (duty.vehicleCheck.status === "cleared" && duty.vehicleCheck.canStartDuty) score += 4;
  if (duty.clockedInAt) score += 8;
  if (duty.lifecycleStatus === "in_progress") score += 16;
  if (duty.lifecycleStatus === "completed") score += 32;
  return score;
}

function pickFresherDuty(
  a: DutyDetail | null | undefined,
  b: DutyDetail | null | undefined,
): DutyDetail | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return prepProgressScore(a) >= prepProgressScore(b) ? a : b;
}

interface OpenJourneyDraft {
  odometer: string;
  fuelLevel: string;
}

interface EndJourneyDraft extends OpenJourneyDraft {
  handoverNote: string;
  handback?: VehicleHandbackRecord;
}

interface DriverStore {
  duties: DutySummary[];
  activeDutyId: string | null;
  /** Preferred active journey for the active duty (lifecycle — not runs[0]). */
  activeJourneyId: string | null;
  dutyDetails: Record<string, DutyDetail>;
  openJourneyDrafts: Record<string, OpenJourneyDraft>;
  endJourneyDrafts: Record<string, EndJourneyDraft>;
  homeSummary: DriverHomeSummary;
  tripsSchedule: TripsSchedulePayload;
  messages: BootstrapPayload["messages"];
  documentWarnings: BootstrapPayload["documentWarnings"];
  drivingSafetyMode: boolean;
  loading: boolean;
  error: string | null;
  hydrateFromBootstrap: (payload: BootstrapPayload) => void;
  loadDuty: (dutyId: string) => Promise<DutyDetail>;
  setActiveDuty: (dutyId: string | null) => void;
  setActiveJourney: (journeyId: string | null) => void;
  setDrivingSafetyMode: (enabled: boolean) => void;
  /** Optimistic client projection only — never writes the mock server Map. */
  updateDutyDetail: (duty: DutyDetail) => void;
  /** Authoritative projection after transport accept/reject reconcile. */
  projectDuty: (duty: DutyDetail) => void;
  getDuty: (dutyId: string) => DutyDetail | null;
  acknowledgeOperationalNotice: () => void;
  refreshHomeSync: () => void;
  getTripDetail: (assignmentId: string) => TripDetail | null;
  setOpenJourneyDraft: (dutyId: string, draft: OpenJourneyDraft) => void;
  setEndJourneyDraft: (dutyId: string, draft: EndJourneyDraft) => void;
  completeOpenJourney: (dutyId: string, journeyId?: string) => Promise<void>;
  /** Ends the active journey. Handback only when custody genuinely ends. */
  completeEndJourney: (dutyId: string, options?: { withHandback?: boolean }) => Promise<void>;
  submitVehicleHandback: (dutyId: string, handback: VehicleHandbackRecord) => Promise<void>;
}

function syncFromStore(): DriverHomeSummary["sync"] {
  const sync = useSyncStore.getState();
  return {
    online: isOnline(),
    lastSyncedAt: sync.lastSyncedAt ?? undefined,
    pendingChangeCount: sync.pendingCount,
  };
}

export const useDriverStore = create<DriverStore>((set, get) => ({
  duties: [],
  activeDutyId: null,
  activeJourneyId: null,
  dutyDetails: {},
  openJourneyDrafts: {},
  endJourneyDrafts: {},
  homeSummary: buildMockHomeSummary(),
  tripsSchedule: buildMockTripsSchedule(),
  messages: [],
  documentWarnings: [],
  drivingSafetyMode: false,
  loading: false,
  error: null,

  hydrateFromBootstrap: (payload) => {
    set({
      duties: payload.duties,
      messages: payload.messages,
      documentWarnings: payload.documentWarnings,
      homeSummary: payload.homeSummary ?? buildMockHomeSummary({ sync: syncFromStore() }),
      tripsSchedule: payload.tripsSchedule ?? buildMockTripsSchedule(),
    });
    useVehicleCheckStore.getState().hydrateChecksHome(
      payload.vehicleChecksHome ?? buildMockVehicleChecksHome(),
    );
    useMessagesStore.getState().hydrateInbox(payload.messagesInbox ?? buildMockMessagesInbox());
    useMoreStore.getState().hydrateDriverMore(payload.driverMore ?? buildMockDriverMore());
  },

  loadDuty: async (dutyId) => {
    set({ loading: true, error: null });
    try {
      const fromMock = getMockDutyDetail(dutyId);
      const fromStore = get().dutyDetails[dutyId];
      const raw =
        pickFresherDuty(fromMock, fromStore) ?? (await fetchDutyDetail(dutyId));
      const duty = structuredClone(raw);
      // Keep Map aligned with the fresher projection so later reads cannot rewind clock-in / prep
      syncMockDutyDetail(duty);
      set((s) => ({
        dutyDetails: { ...s.dutyDetails, [dutyId]: duty },
        loading: false,
      }));
      return duty;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load duty", loading: false });
      throw e;
    }
  },

  setActiveDuty: (dutyId) =>
    set((s) => ({
      activeDutyId: dutyId,
      activeJourneyId: dutyId ? s.activeJourneyId : null,
    })),

  setActiveJourney: (journeyId) => set({ activeJourneyId: journeyId }),

  setDrivingSafetyMode: (enabled) => set({ drivingSafetyMode: enabled }),

  updateDutyDetail: (duty) => {
    // Keep mock Map aligned so later loadDuty does not rewind optimistic prep / check clears
    const next = structuredClone(duty);
    syncMockDutyDetail(next);
    set((s) => ({
      dutyDetails: { ...s.dutyDetails, [duty.id]: next },
      duties: s.duties.map((d) =>
        d.id === duty.id ? { ...d, lifecycleStatus: duty.lifecycleStatus } : d,
      ),
    }));
  },

  projectDuty: (duty) => {
    // Prefer the further-ahead of transport projection vs current prep (never rewind clock-in)
    const current = get().dutyDetails[duty.id] ?? getMockDutyDetail(duty.id);
    const chosen = pickFresherDuty(duty, current) ?? duty;
    const next = structuredClone(chosen);
    syncMockDutyDetail(next);
    set((s) => ({
      dutyDetails: { ...s.dutyDetails, [duty.id]: next },
      duties: s.duties.map((d) =>
        d.id === duty.id ? { ...d, lifecycleStatus: next.lifecycleStatus } : d,
      ),
    }));
  },

  getDuty: (dutyId) =>
    pickFresherDuty(get().dutyDetails[dutyId], getMockDutyDetail(dutyId)),

  acknowledgeOperationalNotice: () =>
    set((s) => ({
      homeSummary: s.homeSummary.latestOperationalNotice
        ? {
            ...s.homeSummary,
            latestOperationalNotice: {
              ...s.homeSummary.latestOperationalNotice,
              acknowledged: true,
            },
            requiredActions: s.homeSummary.requiredActions.filter((a) => a.id !== "ra_notice"),
          }
        : s.homeSummary,
    })),

  refreshHomeSync: () =>
    set((s) => ({
      homeSummary: { ...s.homeSummary, sync: syncFromStore() },
    })),

  getTripDetail: (assignmentId) => getTripDetail(assignmentId),

  setOpenJourneyDraft: (dutyId, draft) =>
    set((s) => ({
      openJourneyDrafts: { ...s.openJourneyDrafts, [dutyId]: draft },
    })),

  setEndJourneyDraft: (dutyId, draft) =>
    set((s) => ({
      endJourneyDrafts: { ...s.endJourneyDrafts, [dutyId]: draft },
    })),

  completeOpenJourney: async (dutyId, journeyIdArg) => {
    // Heal: stale Zustand can lose clockedInAt / release while mock (or prior UI) still has them
    let existing = get().getDuty(dutyId);
    if (!existing) {
      throw new Error("Duty could not be loaded. Return to Duties and try again.");
    }

    const mock = getMockDutyDetail(dutyId);
    let healed = { ...existing };
    let dirty = false;

    if (!healed.clockedInAt && (mock?.clockedInAt || healed.fitForDutyDeclaredAt)) {
      healed = {
        ...healed,
        clockedInAt: mock?.clockedInAt ?? healed.fitForDutyDeclaredAt,
        fitForDutyDeclaredAt:
          healed.fitForDutyDeclaredAt ?? mock?.fitForDutyDeclaredAt ?? mock?.clockedInAt,
      };
      dirty = true;
    }

    if (
      !(healed.vehicleCheck.canStartDuty && healed.vehicleCheck.status === "cleared") &&
      mock?.vehicleCheck.canStartDuty
    ) {
      healed = {
        ...healed,
        vehicleVerified: true,
        vehicleCheck: {
          ...healed.vehicleCheck,
          ...mock.vehicleCheck,
          canStartDuty: true,
          status: mock.vehicleCheck.status === "cleared" ? "cleared" : healed.vehicleCheck.status,
        },
      };
      dirty = true;
    }

    if (dirty) {
      get().updateDutyDetail(healed);
      existing = healed;
    }

    if (!existing.clockedInAt) {
      throw new Error("Clock into the duty before opening a journey.");
    }
    if (!existing.vehicleCheck.canStartDuty) {
      throw new Error(
        "Finish the vehicle check for this assignment before opening the journey.",
      );
    }

    const journeyId =
      journeyIdArg ?? getActiveJourneyId(existing, get().activeJourneyId ?? existing.activeJourneyId);
    await dispatchOperationalCommand({
      type: "journey.start",
      payload: { dutyId, journeyId },
      idempotencyKey: `journey.${dutyId}.${journeyId}.start`,
    });
    const duty = await get().loadDuty(dutyId);
    if (duty.lifecycleStatus !== "in_progress") {
      throw new Error(
        "Journey could not be opened. Return to Duties, confirm prep is complete, then try again.",
      );
    }
    set({
      homeSummary: buildActiveJourneyHomeSummary(),
      activeDutyId: dutyId,
      activeJourneyId: journeyId,
    });
  },

  completeEndJourney: async (dutyId, options) => {
    const existing = get().getDuty(dutyId);
    if (!existing) return;
    const journeyId = getActiveJourneyId(existing, get().activeJourneyId ?? existing.activeJourneyId);
    const draft = get().endJourneyDrafts[dutyId];
    const vehicleId = existing.vehicle?.id;
    const endsCustody =
      Boolean(options?.withHandback) && custodyEndsAfterJourney(existing, journeyId);

    await dispatchOperationalCommand({
      type: "journey.complete",
      payload: {
        dutyId,
        journeyId,
        vehicleId,
        handoverNote: draft?.handoverNote,
        odometer: draft?.odometer,
        fuelLevel: draft?.fuelLevel,
      },
      idempotencyKey: `journey.${dutyId}.${journeyId}.complete`,
    });

    if (endsCustody && draft?.handback && vehicleId) {
      await dispatchOperationalCommand({
        type: "vehicle.handback",
        payload: {
          dutyId,
          vehicleId,
          assignmentId: draft.handback.assignmentId,
          handback: draft.handback,
        },
        idempotencyKey: `vehicle.handback.${dutyId}.${draft.handback.id}`,
      });
    }

    const duty = await get().loadDuty(dutyId);
    const next = getNextJourney(duty);
    set({
      homeSummary: next
        ? buildActiveJourneyHomeSummary()
        : buildMockHomeSummary({ sync: syncFromStore() }),
      activeDutyId: dutyId,
      activeJourneyId: next ? (next.journeyId ?? next.id) : null,
    });
  },

  submitVehicleHandback: async (dutyId, handback) => {
    const existing = get().getDuty(dutyId);
    const vehicleId = existing?.vehicle?.id;
    if (!vehicleId) throw new Error("No vehicle on this duty to hand back.");
    await dispatchOperationalCommand({
      type: "vehicle.handback",
      payload: {
        dutyId,
        vehicleId,
        assignmentId: handback.assignmentId,
        handback,
      },
      idempotencyKey: `vehicle.handback.${dutyId}.${handback.id}`,
    });
    await get().loadDuty(dutyId);
  },
}));
