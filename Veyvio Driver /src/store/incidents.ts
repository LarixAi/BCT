import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  INCIDENT_FORM_DEFINITION_VERSION,
  INCIDENT_SCHEMA_VERSION,
  type DriverIncidentSubmission,
  type IncidentCategoryCode,
  type IncidentEvidence,
  type IncidentFieldValue,
  type TriStateAnswer,
  calculateCompleteness,
  driverSubmissionToHubInput,
  inferSeverity,
  validateDriverSubmission,
} from "@veyvio/incidents";
import { buildIncidentOperationalContext, resolveIncidentLocationLabel } from "@/domain/incidents/incident-context";
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import { isOnline } from "@/platform/device/connectivity";
import { useSessionStore } from "@/platform/auth/session-store";

export interface DriverIncidentRecord {
  localIncidentId: string;
  serverIncidentId?: string;
  incidentReference?: string;
  submission: DriverIncidentSubmission;
  syncStatus: "draft" | "pending_upload" | "submitted" | "failed";
  submittedAt?: string;
}

interface IncidentStore {
  drafts: Record<string, DriverIncidentSubmission>;
  records: DriverIncidentRecord[];
  activeDraftId: string | null;
  createDraft: (categoryCode?: IncidentCategoryCode) => string;
  setActiveDraft: (draftId: string | null) => void;
  updateDraftField: (draftId: string, key: string, value: unknown, confidence?: IncidentFieldValue<unknown>["confidence"]) => void;
  confirmDraftContext: (draftId: string, confirmed: boolean) => void;
  submitInitialReport: (draftId: string) => Promise<{ ok: true; recordId: string } | { ok: false; reason: string }>;
  updateRecordField: (recordId: string, key: string, value: unknown) => void;
  addRecordEvidence: (recordId: string, evidence: IncidentEvidence) => void;
  submitCompletionReport: (recordId: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  getRecord: (id: string) => DriverIncidentRecord | undefined;
  getIncompleteRecords: () => DriverIncidentRecord[];
}

function fieldValue<T>(
  value: T,
  userId?: string,
  confidence: IncidentFieldValue<T>["confidence"] = "REPORTED",
): IncidentFieldValue<T> {
  return {
    value,
    source: "DRIVER",
    enteredByUserId: userId,
    enteredAt: new Date().toISOString(),
    confidence,
  };
}

function createEmptyDraft(categoryCode: IncidentCategoryCode, draftId: string): DriverIncidentSubmission {
  const session = useSessionStore.getState();
  const now = new Date().toISOString();
  return {
    localIncidentId: draftId,
    idempotencyKey: draftId,
    categoryCode,
    severity: "medium",
    stage: "draft",
    schemaVersion: INCIDENT_SCHEMA_VERSION,
    formDefinitionVersion: INCIDENT_FORM_DEFINITION_VERSION,
    driverAppVersion: "0.1.0",
    reportingChannel: "driver_app",
    reportedAt: now,
    reporter: {
      userId: session.user?.id ?? "unknown",
      driverId: session.user?.driverId,
      name: session.user ? `${session.user.firstName} ${session.user.lastName}` : "Driver",
      role: "driver",
    },
    operationalContext: buildIncidentOperationalContext(),
    contextConfirmed: false,
    summary: "",
    immediateDanger: fieldValue<"unknown">("unknown"),
    answers: {},
    peopleInvolved: [],
    immediateActions: [],
    evidence: [],
    confidentialityLevel: categoryCode === "safeguarding" ? "safeguarding" : "standard",
  };
}

export const useIncidentStore = create<IncidentStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      records: [],
      activeDraftId: null,

      createDraft: (categoryCode = "other") => {
        const draftId = `inc_local_${crypto.randomUUID().slice(0, 8)}`;
        const draft = createEmptyDraft(categoryCode, draftId);
        set((state) => ({
          drafts: { ...state.drafts, [draftId]: draft },
          activeDraftId: draftId,
        }));
        return draftId;
      },

      setActiveDraft: (draftId) => set({ activeDraftId: draftId }),

      updateDraftField: (draftId, key, value, confidence) => {
        const session = useSessionStore.getState();
        set((state) => {
          const draft = state.drafts[draftId];
          if (!draft) return state;
          const entry = fieldValue(value, session.user?.id, confidence);
          const next: DriverIncidentSubmission = {
            ...draft,
            answers: { ...draft.answers, [key]: entry },
          };
          if (key === "immediateDanger") next.immediateDanger = entry as IncidentFieldValue<typeof draft.immediateDanger.value>;
          if (key === "summary") next.summary = String(value);
          if (key === "description") next.description = String(value);
          return { drafts: { ...state.drafts, [draftId]: next } };
        });
      },

      confirmDraftContext: (draftId, confirmed) => {
        set((state) => {
          const draft = state.drafts[draftId];
          if (!draft) return state;
          return {
            drafts: {
              ...state.drafts,
              [draftId]: { ...draft, contextConfirmed: confirmed },
            },
          };
        });
      },

      submitInitialReport: async (draftId) => {
        const draft = get().drafts[draftId];
        if (!draft) return { ok: false, reason: "Incident draft not found." };
        if (!draft.contextConfirmed) {
          return { ok: false, reason: "Confirm the vehicle, journey, and location before submitting." };
        }

        const locationLabel = await resolveIncidentLocationLabel();
        const now = new Date().toISOString();
        const session = useSessionStore.getState();
        const online = isOnline();

        const submission: DriverIncidentSubmission = {
          ...draft,
          occurredAt: now,
          reportedAt: now,
          locallyCapturedAt: online ? undefined : now,
          location: {
            label: locationLabel,
            driverConfirmed: true,
          },
          stage: "initial_submitted",
          severity: inferSeverity(draft.categoryCode, draft.answers, draft.immediateDanger),
          summary:
            draft.summary.trim() ||
            `${draft.categoryCode.replace(/_/g, " ")} reported during duty`,
          operationalContext: {
            ...draft.operationalContext,
            onlineAtSubmission: online,
          },
        };

        const validationIssues = validateDriverSubmission(submission, "initial");
        if (validationIssues.length > 0) {
          return { ok: false, reason: validationIssues[0]?.message ?? "Complete the emergency report first." };
        }

        const hubPayload = driverSubmissionToHubInput(submission);
        await enqueueDriverMutation("incident.report", hubPayload, submission.idempotencyKey);

        const record: DriverIncidentRecord = {
          localIncidentId: draftId,
          submission,
          syncStatus: online ? "submitted" : "pending_upload",
          submittedAt: now,
          incidentReference: `INC-${now.slice(0, 4)}-${draftId.slice(-5).toUpperCase()}`,
        };

        set((state) => ({
          records: [record, ...state.records.filter((r) => r.localIncidentId !== draftId)],
          drafts: Object.fromEntries(Object.entries(state.drafts).filter(([id]) => id !== draftId)),
          activeDraftId: state.activeDraftId === draftId ? null : state.activeDraftId,
        }));

        return { ok: true, recordId: draftId };
      },

      updateRecordField: (recordId, key, value) => {
        const session = useSessionStore.getState();
        set((state) => {
          const records = state.records.map((record) => {
            if (record.localIncidentId !== recordId) return record;
            const entry = fieldValue(value, session.user?.id);
            const submission: DriverIncidentSubmission = {
              ...record.submission,
              stage: "completing",
              answers: { ...record.submission.answers, [key]: entry },
            };
            if (key === "description") submission.description = String(value);
            return { ...record, submission };
          });
          return { records };
        });
      },

      addRecordEvidence: (recordId, evidence) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.localIncidentId === recordId
              ? {
                  ...record,
                  submission: {
                    ...record.submission,
                    stage: "completing",
                    evidence: [...record.submission.evidence, evidence],
                  },
                }
              : record,
          ),
        }));
      },

      submitCompletionReport: async (recordId) => {
        const record = get().records.find((r) => r.localIncidentId === recordId);
        if (!record) return { ok: false, reason: "Incident not found on this device." };

        const completeness = calculateCompleteness(record.submission);
        const blockingIssues = validateDriverSubmission(record.submission, "complete").filter(
          (issue) => issue.stage === "complete",
        );

        if (blockingIssues.length > 0) {
          return { ok: false, reason: blockingIssues[0]?.message ?? "Complete the required fields first." };
        }

        const declaration = record.submission.answers.declarationConfirmed?.value;
        if (declaration !== "yes") {
          return { ok: false, reason: "Confirm the declaration before submitting the full report." };
        }

        const now = new Date().toISOString();
        const submission: DriverIncidentSubmission = {
          ...record.submission,
          stage: completeness.overall >= 85 ? "complete" : "completing",
          reportedAt: now,
          description: record.submission.description ?? record.submission.summary,
        };

        const hubPayload = {
          ...driverSubmissionToHubInput(submission),
          updateType: "completion" as const,
        };
        await enqueueDriverMutation(
          "incident.report",
          hubPayload,
          `${submission.idempotencyKey}-completion`,
        );

        set((state) => ({
          records: state.records.map((r) =>
            r.localIncidentId === recordId ? { ...r, submission, syncStatus: isOnline() ? "submitted" : "pending_upload" } : r,
          ),
        }));

        return { ok: true };
      },

      getRecord: (id) => get().records.find((r) => r.localIncidentId === id || r.serverIncidentId === id),

      getIncompleteRecords: () =>
        get().records.filter((record) => record.submission.stage !== "complete"),
    }),
    {
      name: "veyvio-driver-incidents-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        drafts: state.drafts,
        records: state.records,
      }),
    },
  ),
);

export function triStateLabel(value?: TriStateAnswer): string {
  switch (value) {
    case "yes":
      return "Yes";
    case "no":
      return "No";
    case "unknown":
      return "Unknown";
    case "not_yet_confirmed":
      return "Not yet confirmed";
    case "not_applicable":
      return "Not applicable";
    default:
      return "—";
  }
}
