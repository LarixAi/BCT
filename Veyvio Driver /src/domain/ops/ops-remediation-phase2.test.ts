import { describe, expect, it, beforeEach } from "vitest";
import {
  buildEligibleDecision,
  buildBlockedEligibility,
  eligibilityAllowsWork,
  driverAssessmentToProvisionalOutcome,
  applyOpsClassification,
  createSwapRequest,
  advanceSwap,
  swapCanResumeJourney,
  IdempotentCommandApplicator,
  createOfflineCommand,
  createDelayEvent,
  handbackIsComplete,
  createHandbackDraft,
  createPlatformEvent,
  PlatformEventBus,
  PICKUP_OUTCOME_LABELS,
} from "@veyvio/ops";
import {
  queueDriverIncidentForAdmin,
  drainDriverIncidentsForAdmin,
  resetDriverIncidentIngest,
  type ReportIncidentHubInput,
} from "@veyvio/incidents";
import { canClockInDuty } from "@/domain/duty/duty-state-machine";

describe("ops domain — Phase 2–4 remediation", () => {
  beforeEach(() => {
    resetDriverIncidentIngest();
  });

  it("eligibility decision blocks clock-in without a boolean documentsValid", () => {
    const blocked = buildBlockedEligibility("Licence review required");
    expect(eligibilityAllowsWork(blocked)).toBe(false);
    expect(
      canClockInDuty({
        lifecycleStatus: "ready",
        vehicleVerified: true,
        vehicleCheckCanStart: true,
        eligibility: blocked,
        alreadyClockedIn: false,
      }).allowed,
    ).toBe(false);

    expect(
      canClockInDuty({
        lifecycleStatus: "ready",
        vehicleVerified: true,
        vehicleCheckCanStart: true,
        eligibility: buildEligibleDecision(),
        alreadyClockedIn: false,
      }).allowed,
    ).toBe(true);
  });

  it("driver assessment is provisional; Ops classification is authoritative", () => {
    expect(driverAssessmentToProvisionalOutcome("safety_critical")).toBe("VOR");
    const defect = {
      id: "def_1",
      vehicleId: "veh_1",
      reportedByDriverId: "drv",
      description: "Brake warning",
      location: "Cab",
      driverAssessment: "safety_critical" as const,
      opsClassification: null,
      linkedEvidenceIds: [],
      createdAt: new Date().toISOString(),
    };
    const triaged = applyOpsClassification(defect, "VOR", "ops_user");
    expect(triaged.opsClassification).toBe("VOR");
    expect(triaged.classifiedBy).toBe("ops_user");
  });

  it("vehicle swap requires multi-step orchestration before resume", () => {
    let swap = createSwapRequest({
      dutyId: "duty_1",
      journeyId: "j1",
      fromVehicleId: "veh_a",
      fromRegistration: "LK23 ABC",
      reason: "VOR",
      currentSafetyStatus: "VOR",
      requestedBy: "drv",
    });
    expect(swapCanResumeJourney(swap)).toBe(false);
    swap = advanceSwap(swap, "awaiting_ops");
    swap = advanceSwap(swap, "replacement_identified", {
      replacementVehicleId: "veh_b",
      replacementRegistration: "WX21 FYV",
    });
    swap = advanceSwap(swap, "approved", {
      accessibilityValidated: true,
      capacityValidated: true,
      assignmentVersion: 2,
    });
    swap = advanceSwap(swap, "paused");
    swap = advanceSwap(swap, "old_vehicle_closed");
    swap = advanceSwap(swap, "replacement_verifying");
    swap = advanceSwap(swap, "replacement_checking");
    swap = advanceSwap(swap, "resumed");
    expect(swapCanResumeJourney(swap)).toBe(true);
  });

  it("offline applicator is idempotent by commandId", () => {
    const applicator = new IdempotentCommandApplicator();
    const command = createOfflineCommand({
      commandType: "duty.acknowledge",
      aggregateId: "duty_1",
      expectedVersion: 0,
      tenantId: "co",
      depotId: "dep",
      actorId: "drv",
      deviceId: "dev",
      payload: { dutyId: "duty_1" },
    });
    const first = applicator.apply(command, () => undefined);
    const second = applicator.apply(command, () => undefined);
    expect(first.applied).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(applicator.getVersion("duty_1")).toBe(1);
  });

  it("queues driver incidents for Admin ingest", () => {
    const payload = {
      immediateDanger: "no",
      occurredAt: new Date().toISOString(),
      location: "Depot",
      category: "near_miss",
      title: "Near miss",
      description: "Test",
      severity: "low",
      reportingSource: "driver_app",
      driverReportMetadata: {
        localIncidentId: "local_inc_1",
        stage: "initial_submitted",
        completenessScore: 40,
        formDefinitionVersion: 1,
        schemaVersion: 1,
        driverAppVersion: "test",
        originalAnswers: {},
      },
    } as ReportIncidentHubInput;

    queueDriverIncidentForAdmin(payload);
    const drained = drainDriverIncidentsForAdmin();
    expect(drained).toHaveLength(1);
    expect(drained[0]?.driverReportMetadata?.localIncidentId).toBe("local_inc_1");
    expect(drainDriverIncidentsForAdmin()).toHaveLength(0);
  });

  it("publishes named platform events with consumers", () => {
    const bus = new PlatformEventBus();
    bus.publish(
      createPlatformEvent({
        eventType: "journey.started",
        tenantId: "co",
        depotId: "dep",
        actorId: "drv",
        correlationId: "c1",
        aggregateId: "j1",
        aggregateVersion: 1,
        payload: {},
      }),
    );
    expect(bus.ofType("journey.started")[0]?.consumers).toContain("live_ops");
  });

  it("delay, handback, and stop outcome models are structured", () => {
    const delay = createDelayEvent({
      dutyId: "duty_1",
      journeyId: "j1",
      reason: "traffic",
      expectedDelayMinutes: 8,
      reportedBy: "drv",
    });
    expect(delay.chatMessageGenerated).toMatch(/late/i);

    const handback = createHandbackDraft({
      dutyId: "duty_1",
      vehicleId: "veh",
      assignmentId: "asgn",
    });
    expect(handbackIsComplete(handback)).toBe(false);
    expect(PICKUP_OUTCOME_LABELS.boarded).toBe("Boarded");
  });
});
