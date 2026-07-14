import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AccessibilityPreferences,
  ComplianceDocument,
  DocumentSideId,
  DriverMorePayload,
  NotificationPreferences,
} from "@/types/more";
import {
  buildMockDriverMore,
  DEFAULT_ACCESSIBILITY_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/data/mocks/driver-more";
import { buildMockDeclarations } from "@/data/mocks/driver-declarations";
import {
  applyStatementResponse,
  declarationCanSubmit,
  declarationHasReportedChanges,
  simulateDeclarationSubmit,
} from "@/domain/more/declaration-compliance";
import type { DeclarationStatementResponse, DriverDeclaration } from "@/types/declarations";
import {
  allRequiredSidesSubmitted,
  applyDocumentCompliance,
  updateDocumentSide,
} from "@/domain/more/document-compliance";
import { simulateDocumentUpload, validateDocumentUpload } from "@/domain/more/document-upload";

interface DocumentUploadInput {
  name: string;
  type: string;
  size: number;
}

interface MoreStore {
  driverMore: DriverMorePayload;
  declarations: DriverDeclaration[];
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;

  hydrateDriverMore: (payload: DriverMorePayload) => void;
  updateNotifications: (prefs: Partial<NotificationPreferences>) => void;
  updateAccessibility: (prefs: Partial<AccessibilityPreferences>) => void;
  updatePersonal: (updates: Partial<DriverMorePayload["personal"]>) => void;
  updateEmergencyContact: (updates: Partial<DriverMorePayload["emergencyContact"]>) => void;
  getDocumentById: (documentId: string) => ComplianceDocument | undefined;
  getDeclarationById: (declarationId: string) => DriverDeclaration | undefined;
  setDeclarationStatementResponse: (
    declarationId: string,
    statementId: string,
    response: DeclarationStatementResponse,
  ) => void;
  submitDeclaration: (
    declarationId: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  submitDocumentSideUpload: (
    documentId: string,
    sideId: DocumentSideId,
    file: DocumentUploadInput,
    uploadFile?: File,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
}

function mapDocuments(
  documents: ComplianceDocument[],
  documentId: string,
  updater: (document: ComplianceDocument) => ComplianceDocument,
) {
  return documents.map((document) => (document.id === documentId ? updater(document) : document));
}

export const useMoreStore = create<MoreStore>()(
  persist(
    (set) => ({
      driverMore: buildMockDriverMore(),
      declarations: buildMockDeclarations().declarations,
      notifications: DEFAULT_NOTIFICATION_PREFS,
      accessibility: DEFAULT_ACCESSIBILITY_PREFS,

      hydrateDriverMore: (payload) =>
        set({
          driverMore: {
            ...payload,
            documents: payload.documents.map((document) => applyDocumentCompliance(document)),
          },
        }),

      updateNotifications: (prefs) =>
        set((s) => ({ notifications: { ...s.notifications, ...prefs } })),

      updateAccessibility: (prefs) =>
        set((s) => ({ accessibility: { ...s.accessibility, ...prefs } })),

      updatePersonal: (updates) =>
        set((s) => ({
          driverMore: {
            ...s.driverMore,
            personal: { ...s.driverMore.personal, ...updates },
            identity: {
              ...s.driverMore.identity,
              displayName: updates.displayName ?? s.driverMore.identity.displayName,
            },
          },
        })),

      updateEmergencyContact: (updates) =>
        set((s) => ({
          driverMore: {
            ...s.driverMore,
            emergencyContact: { ...s.driverMore.emergencyContact, ...updates },
          },
        })),

      getDocumentById: (documentId) =>
        useMoreStore
          .getState()
          .driverMore.documents.find((document) => document.id === documentId),

      getDeclarationById: (declarationId) =>
        useMoreStore.getState().declarations.find((item) => item.id === declarationId),

      setDeclarationStatementResponse: (declarationId, statementId, response) =>
        set((state) => ({
          declarations: state.declarations.map((declaration) =>
            declaration.id === declarationId
              ? applyStatementResponse(declaration, statementId, response)
              : declaration,
          ),
        })),

      submitDeclaration: async (declarationId) => {
        const declaration = useMoreStore.getState().declarations.find((item) => item.id === declarationId);
        if (!declaration) return { ok: false, reason: "Declaration not found." };
        if (declaration.status === "submitted" || declaration.status === "on_file") {
          return { ok: false, reason: "This declaration is already on file." };
        }

        if (declarationHasReportedChanges(declaration)) {
          return {
            ok: false,
            reason: "Contact operations before submitting — a reported change needs review.",
          };
        }

        if (!declarationCanSubmit(declaration)) {
          return { ok: false, reason: "Confirm every statement before submitting." };
        }

        await simulateDeclarationSubmit();

        const identity = useMoreStore.getState().driverMore.identity;
        const submittedAt = new Date().toISOString();

        set((state) => ({
          declarations: state.declarations.map((item) =>
            item.id === declarationId
              ? {
                  ...item,
                  status: "submitted",
                  submittedAt,
                  submittedBy: identity.legalName,
                  auditNote: `Recorded on device · declaration version ${item.version}`,
                }
              : item,
          ),
          driverMore: {
            ...state.driverMore,
            syncStatus: {
              ...state.driverMore.syncStatus,
              lastSyncedAt: submittedAt,
              pendingUploads: state.driverMore.syncStatus.pendingUploads + 1,
            },
          },
        }));

        return { ok: true };
      },

      submitDocumentSideUpload: async (documentId, sideId, file, uploadFile) => {
        const state = useMoreStore.getState();
        const existing = state.driverMore.documents.find((document) => document.id === documentId);
        if (!existing) {
          return { ok: false, reason: "Document not found." };
        }

        const side = existing.sides.find((item) => item.sideId === sideId);
        if (side?.status === "uploading") {
          return { ok: false, reason: "This side is already uploading." };
        }

        const validation = uploadFile
          ? validateDocumentUpload(uploadFile)
          : validateDocumentUpload(new File([""], file.name, { type: file.type }));
        if (!validation.ok) {
          return validation;
        }

        const uploadedAt = new Date().toISOString();

        set((s) => ({
          driverMore: {
            ...s.driverMore,
            documents: mapDocuments(s.driverMore.documents, documentId, (document) =>
              updateDocumentSide(document, sideId, { status: "uploading" }),
            ),
            syncStatus: {
              ...s.driverMore.syncStatus,
              pendingUploads: s.driverMore.syncStatus.pendingUploads + 1,
              pendingDocuments: s.driverMore.syncStatus.pendingDocuments + 1,
            },
          },
        }));

        if (uploadFile) {
          await simulateDocumentUpload(uploadFile);
        } else {
          await simulateDocumentUpload(
            new File([new Uint8Array(file.size)], file.name, { type: file.type }),
          );
        }

        set((s) => {
          const updatedDocuments = mapDocuments(s.driverMore.documents, documentId, (document) => {
            const withSide = updateDocumentSide(document, sideId, {
              status: "pending_review",
              fileName: file.name,
              capturedAt: uploadedAt,
            });
            return {
              ...withSide,
              lastUploadedFileName: file.name,
              lastUploadedAt: uploadedAt,
            };
          });

          const updatedDocument = updatedDocuments.find((document) => document.id === documentId);
          const clearAlert =
            updatedDocument && allRequiredSidesSubmitted(updatedDocument);

          return {
            driverMore: {
              ...s.driverMore,
              documents: updatedDocuments,
              complianceAlerts: clearAlert
                ? s.driverMore.complianceAlerts.filter((alert) => alert.documentId !== documentId)
                : s.driverMore.complianceAlerts,
              syncStatus: {
                ...s.driverMore.syncStatus,
                lastSyncedAt: new Date().toISOString(),
                pendingUploads: Math.max(0, s.driverMore.syncStatus.pendingUploads - 1),
              },
            },
          };
        });

        return { ok: true };
      },
    }),
    {
      name: "veyvio-driver-more-prefs",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        notifications: s.notifications,
        accessibility: s.accessibility,
      }),
    },
  ),
);

export function useDocumentAttentionCount(): number {
  return useMoreStore((s) => s.driverMore.complianceAlerts.length);
}

export function useDeclarationAttentionCount(): number {
  return useMoreStore(
    (s) => s.declarations.filter((item) => item.status === "due" || item.status === "overdue").length,
  );
}
