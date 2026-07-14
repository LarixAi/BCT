import type { IncidentCategoryCode } from "./categories";
import type { DriverIncidentSubmission, IncidentFieldValue, TriStateAnswer } from "./types";
import { calculateCompleteness } from "./completeness";
import { isSafeguardingCategory } from "./categories";

/** Bridge type aligned with Veyvio Admin ReportIncidentHubInput — kept here for cross-app mapping. */
export interface ReportIncidentHubInput {
  immediateDanger: "yes" | "emergency_contacted" | "no" | "unknown";
  occurredAt: string;
  location: string;
  depotId?: string;
  category: IncidentCategoryCode;
  title: string;
  description: string;
  severity: import("./types").IncidentSeverity;
  reportingSource?: "driver_app" | "yard_app" | "staff_portal" | "admin" | "customer" | "school" | "police" | "telematics" | "anonymous";
  vehicleId?: string;
  driverId?: string;
  driverName?: string;
  runReference?: string;
  isSafeguarding?: boolean;
  markVehicleVor?: boolean;
  createDefect?: boolean;
  immediateActionsTaken?: string[];
  passengerInvolved?: boolean;
  bookingReference?: string;
  passengerIds?: string[];
  manifestId?: string;
  driverReportMetadata?: {
    localIncidentId: string;
    stage: DriverIncidentSubmission["stage"];
    completenessScore: number;
    formDefinitionVersion: number;
    schemaVersion: number;
    driverAppVersion: string;
    originalAnswers: Record<string, IncidentFieldValue<unknown>>;
    offlineCapture?: {
      occurredAt: string;
      locallySubmittedAt: string;
      serverReceivedAt: string;
    };
  };
  updateType?: "initial" | "completion";
}

function triToImmediateDanger(value: string): ReportIncidentHubInput["immediateDanger"] {
  if (value === "yes" || value === "emergency_contacted" || value === "no" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function fieldValue<T>(answers: Record<string, IncidentFieldValue<unknown>>, key: string): T | undefined {
  return answers[key]?.value as T | undefined;
}

export function driverSubmissionToHubInput(submission: DriverIncidentSubmission): ReportIncidentHubInput {
  const completeness = calculateCompleteness(submission);
  const injury = fieldValue<TriStateAnswer>(submission.answers, "injuryReported");
  const passengerId = fieldValue<string>(submission.answers, "passengerId");

  const immediateActions: string[] = [];
  if (fieldValue<TriStateAnswer>(submission.answers, "controlContacted") === "yes") {
    immediateActions.push("Control contacted");
  }
  if (fieldValue<TriStateAnswer>(submission.answers, "firstAidProvided") === "yes") {
    immediateActions.push("First aid provided");
  }
  if (submission.immediateDanger.value === "emergency_contacted") {
    immediateActions.push("Emergency services contacted");
  }

  return {
    immediateDanger: triToImmediateDanger(submission.immediateDanger.value),
    occurredAt: submission.occurredAt ?? submission.reportedAt,
    location: submission.location?.label ?? "Location not confirmed",
    depotId: submission.operationalContext.depotId,
    category: submission.categoryCode,
    title: submission.summary,
    description: submission.description ?? submission.summary,
    severity: submission.severity,
    reportingSource: "driver_app",
    vehicleId: submission.operationalContext.vehicleId,
    driverId: submission.operationalContext.driverId,
    driverName: submission.operationalContext.driverName,
    runReference: submission.operationalContext.runReference,
    isSafeguarding: isSafeguardingCategory(submission.categoryCode),
    createDefect: submission.linkedDefectRequested,
    markVehicleVor: fieldValue<TriStateAnswer>(submission.answers, "journeyCanContinue") === "no",
    immediateActionsTaken: immediateActions,
    passengerInvolved: Boolean(passengerId) || injury === "yes",
    passengerIds: passengerId ? [passengerId] : undefined,
    driverReportMetadata: {
      localIncidentId: submission.localIncidentId,
      stage: submission.stage,
      completenessScore: completeness.overall,
      formDefinitionVersion: submission.formDefinitionVersion,
      schemaVersion: submission.schemaVersion,
      driverAppVersion: submission.driverAppVersion,
      originalAnswers: {
        ...submission.answers,
        immediateDanger: submission.immediateDanger,
      },
      ...(submission.locallyCapturedAt
        ? {
            offlineCapture: {
              occurredAt: submission.occurredAt ?? submission.reportedAt,
              locallySubmittedAt: submission.locallyCapturedAt,
              serverReceivedAt: submission.reportedAt,
            },
          }
        : {}),
    },
    updateType: submission.stage === "complete" ? "completion" : "initial",
  };
}
