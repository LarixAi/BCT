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
import { getMockDutyDetail } from "@/data/mocks/duties";
import { isOnline } from "@/platform/device/connectivity";
import { useSyncStore } from "@/platform/sync/outbox";
import type { VehicleHandbackRecord } from "@veyvio/ops";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";

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
  completeOpenJourney: (dutyId: string) => Promise<void>;
  completeEndJourney: (dutyId: string) => Promise<void>;
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
      const cached = get().dutyDetails[dutyId] ?? getMockDutyDetail(dutyId);
      const duty = cached ?? (await fetchDutyDetail(dutyId));
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

  setActiveDuty: (dutyId) => set({ activeDutyId: dutyId }),

  setDrivingSafetyMode: (enabled) => set({ drivingSafetyMode: enabled }),

  updateDutyDetail: (duty) => {
    // Optimistic / UI projection only — mock Map is written solely by CommandTransport
    set((s) => ({
      dutyDetails: { ...s.dutyDetails, [duty.id]: duty },
      duties: s.duties.map((d) =>
        d.id === duty.id ? { ...d, lifecycleStatus: duty.lifecycleStatus } : d,
      ),
    }));
  },

  projectDuty: (duty) => {
    set((s) => ({
      dutyDetails: { ...s.dutyDetails, [duty.id]: duty },
      duties: s.duties.map((d) =>
        d.id === duty.id ? { ...d, lifecycleStatus: duty.lifecycleStatus } : d,
      ),
    }));
  },

  getDuty: (dutyId) => get().dutyDetails[dutyId] ?? getMockDutyDetail(dutyId),

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

  completeOpenJourney: async (dutyId) => {
    const existing = get().getDuty(dutyId);
    if (!existing?.clockedInAt) {
      throw new Error("Clock into the duty before opening a journey.");
    }
    const journeyId = existing.primaryJourneyId ?? existing.runs[0]?.id;
    await dispatchOperationalCommand({
      type: "journey.start",
      payload: { dutyId, journeyId },
      idempotencyKey: `journey.${dutyId}.${journeyId}.start`,
    });
    const duty = await get().loadDuty(dutyId);
    if (duty.lifecycleStatus !== "in_progress") {
      throw new Error("Journey could not be opened. Check your connection and try again.");
    }
    set({ homeSummary: buildActiveJourneyHomeSummary(), activeDutyId: dutyId });
  },

  completeEndJourney: async (dutyId) => {
    const existing = get().getDuty(dutyId);
    const journeyId = existing?.primaryJourneyId ?? existing?.runs[0]?.id;
    const draft = get().endJourneyDrafts[dutyId];
    const vehicleId = existing?.vehicle?.id;
    if (draft?.handback && vehicleId) {
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
    await dispatchOperationalCommand({
      type: "journey.complete",
      payload: {
        dutyId,
        journeyId,
        vehicleId,
        handback: draft?.handback,
        handoverNote: draft?.handoverNote,
        odometer: draft?.odometer,
        fuelLevel: draft?.fuelLevel,
      },
      idempotencyKey: `journey.${dutyId}.${journeyId}.complete`,
    });
    await get().loadDuty(dutyId);
    set(() => ({
      homeSummary: buildMockHomeSummary({ sync: syncFromStore() }),
      activeDutyId: null,
    }));
  },
}));
