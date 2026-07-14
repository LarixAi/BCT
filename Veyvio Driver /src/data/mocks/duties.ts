import type { DutyDetail, DutySummary, VehicleSummary } from "@/types/duty";
import type { OutboxMutation } from "@/types/sync";
import { assertDutyTransition } from "@/domain/duty/duty-state-machine";
import { DRIVER_VEHICLE_CHECK_ITEMS } from "@/types/duty";
import { SCHOOL_MORNING_JOURNEY, readinessCoversVehicle, type VehicleReadiness } from "@veyvio/ops";

const today = new Date().toISOString().slice(0, 10);

const VEHICLE_LK23: VehicleSummary = {
  id: "veh_lk23",
  registrationNumber: "LK23 ABC",
  fleetNumber: "MB-08",
  make: "Mercedes-Benz",
  model: "Sprinter",
  seatingCapacity: 16,
  wheelchairCapacity: 1,
  fuelType: "Diesel",
  mileage: 38420,
  vorStatus: false,
  knownDefects: ["Rear nearside bodywork scratch — accepted cosmetic defect"],
};

const VEHICLE_WX21: VehicleSummary = {
  id: "veh_wx21",
  registrationNumber: "WX21 FYV",
  fleetNumber: "MB-14",
  make: "Ford",
  model: "Transit Minibus",
  seatingCapacity: 16,
  wheelchairCapacity: 1,
  fuelType: "Diesel",
  mileage: 48230,
  vorStatus: false,
  knownDefects: ["Minor scuff nearside rear panel"],
};

/** Per-vehicle readiness — a check for LK23 must never release WX21. */
const vehicleReadinessByVehicle = new Map<string, VehicleReadiness>();

export function getVehicleReadiness(vehicleId: string): VehicleReadiness | undefined {
  return vehicleReadinessByVehicle.get(vehicleId);
}

export function setVehicleReadiness(readiness: VehicleReadiness): void {
  vehicleReadinessByVehicle.set(readiness.vehicleId, readiness);
}

function buildMorningRun() {
  return {
    id: SCHOOL_MORNING_JOURNEY.runId,
    name: SCHOOL_MORNING_JOURNEY.displayName,
    status: "scheduled" as const,
    stops: [
      {
        id: "stop_depot",
        stopOrder: 1,
        name: "Depot departure",
        address: "Unit 12, Wembley Industrial Estate, London HA9 0AA",
        latitude: 51.556,
        longitude: -0.279,
        plannedArrival: "06:45",
        status: "scheduled" as const,
        passengerTasks: [],
      },
      {
        id: "stop_1",
        stopOrder: 2,
        name: "14 Hawthorn Road — Amelia Clarke",
        address: "14 Hawthorn Road, Wembley, London HA0 2QR",
        latitude: 51.55,
        longitude: -0.29,
        plannedArrival: "07:12",
        status: "scheduled" as const,
        passengerTasks: [
          {
            id: "pt_1",
            passengerId: "pax_amelia",
            passengerName: "Amelia Clarke",
            stopId: "stop_1",
            type: "pickup" as const,
            status: "scheduled" as const,
            accessibilityNotes: "Wheelchair user — rear lift and restraint",
            requiresEscort: false,
            plannedTime: "07:12",
          },
        ],
      },
      {
        id: "stop_2",
        stopOrder: 3,
        name: "St Mark's Primary School",
        address: "Church Lane, Wembley, London HA9 6RT",
        latitude: 51.55,
        longitude: -0.28,
        plannedArrival: "07:45",
        status: "scheduled" as const,
        passengerTasks: [
          {
            id: "pt_1_drop",
            passengerId: "pax_amelia",
            passengerName: "Amelia Clarke",
            stopId: "stop_2",
            type: "dropoff" as const,
            status: "scheduled" as const,
            safeguardingNotes: "Hand to reception staff only",
            requiresEscort: true,
            plannedTime: "07:45",
          },
        ],
      },
    ],
  };
}

function buildCommunityRun() {
  return {
    id: "run_community",
    name: "Community Route 7 — Afternoon",
    status: "scheduled" as const,
    stops: [
      {
        id: "stop_c_depot",
        stopOrder: 1,
        name: "Depot departure",
        address: "Unit 4, Riverside Depot, Bristol BS2 0XJ",
        latitude: 51.4545,
        longitude: -2.5879,
        plannedArrival: "13:30",
        status: "scheduled" as const,
        passengerTasks: [],
      },
      {
        id: "stop_c_1",
        stopOrder: 2,
        name: "Newcastle Street — Dalvinder",
        address: "18 Newcastle Street, Bristol BS2 0QT",
        latitude: 51.455,
        longitude: -2.58,
        plannedArrival: "13:45",
        status: "scheduled" as const,
        passengerTasks: [
          {
            id: "pt_c_1",
            passengerId: "pax_dalvinder",
            passengerName: "Dalvinder Singh",
            stopId: "stop_c_1",
            type: "pickup" as const,
            status: "scheduled" as const,
            accessibilityNotes: "Visual impairment — verbal guidance",
            plannedTime: "13:45",
            requiresEscort: false,
          },
        ],
      },
      {
        id: "stop_c_2",
        stopOrder: 3,
        name: "Riverside Centre — Siobhan",
        address: "Riverside Community Centre, Bristol BS1 6XG",
        latitude: 51.45,
        longitude: -2.59,
        plannedArrival: "14:00",
        status: "scheduled" as const,
        passengerTasks: [
          {
            id: "pt_c_2",
            passengerId: "pax_siobhan",
            passengerName: "Siobhan O'Neill",
            stopId: "stop_c_2",
            type: "pickup" as const,
            status: "scheduled" as const,
            accessibilityNotes: "Wheelchair — ramp and restraint",
            plannedTime: "14:00",
            requiresEscort: false,
          },
        ],
      },
      {
        id: "stop_c_3",
        stopOrder: 4,
        name: "Learning for Life — Mark",
        address: "Learning for Life Centre, Bristol BS5 6PR",
        latitude: 51.46,
        longitude: -2.57,
        plannedArrival: "14:20",
        status: "scheduled" as const,
        passengerTasks: [
          {
            id: "pt_c_3",
            passengerId: "pax_mark",
            passengerName: "Mark Hughes",
            stopId: "stop_c_3",
            type: "pickup" as const,
            status: "scheduled" as const,
            accessibilityNotes: "Learning disability — staff handover",
            safeguardingNotes: "Vulnerable adult — confirmed handover",
            requiresEscort: true,
            plannedTime: "14:20",
          },
        ],
      },
      {
        id: "stop_c_4",
        stopOrder: 5,
        name: "City Centre — Angie",
        address: "12 Broad Quay, Bristol BS1 4DJ",
        latitude: 51.45,
        longitude: -2.6,
        plannedArrival: "14:35",
        status: "scheduled" as const,
        passengerTasks: [
          {
            id: "pt_c_4",
            passengerId: "pax_angie",
            passengerName: "Angie Thornton",
            stopId: "stop_c_4",
            type: "pickup" as const,
            status: "scheduled" as const,
            accessibilityNotes: "Assistance dog on board",
            plannedTime: "14:35",
            requiresEscort: false,
          },
        ],
      },
      {
        id: "stop_c_end",
        stopOrder: 6,
        name: "Depot return",
        address: "Unit 4, Riverside Depot, Bristol BS2 0XJ",
        latitude: 51.4545,
        longitude: -2.5879,
        plannedArrival: "15:30",
        status: "scheduled" as const,
        passengerTasks: [],
      },
    ],
  };
}

function buildDutyDetail(overrides: Partial<DutyDetail> & Pick<DutyDetail, "id" | "reference">): DutyDetail {
  const vehicle = overrides.vehicle ?? VEHICLE_LK23;
  return {
    dutyDate: today,
    startTime: "06:30",
    endTime: "09:15",
    lifecycleStatus: "viewed",
    reportingLocation: "Wembley Depot",
    routeName: SCHOOL_MORNING_JOURNEY.displayName,
    passengerCount: 8,
    escortRequired: true,
    specialInstructions: "PA travelling on board. Check wheelchair restraint before departure.",
    vehicle,
    runs: [buildMorningRun()],
    vehicleCheck: {
      status: "not_started",
      canStartDuty: false,
      pendingManagerAdvice: false,
      checklist: Object.fromEntries(DRIVER_VEHICLE_CHECK_ITEMS.map((i) => [i.id, "unset"])),
      vehicleId: vehicle.id,
      assignmentId: `asgn_${overrides.id}`,
    },
    vehicleVerified: false,
    primaryJourneyId: SCHOOL_MORNING_JOURNEY.journeyId,
    ...overrides,
  };
}

function createInitialDutyStore(): Map<string, DutyDetail> {
  return new Map<string, DutyDetail>([
    [
      "duty_1",
      buildDutyDetail({
        id: "duty_1",
        reference: "MON-SCH-104-AM",
        vehicle: VEHICLE_LK23,
        primaryJourneyId: SCHOOL_MORNING_JOURNEY.journeyId,
      }),
    ],
    [
      "duty_2",
      buildDutyDetail({
        id: "duty_2",
        reference: "MON-SCH-104-PM",
        startTime: "14:30",
        endTime: "17:00",
        lifecycleStatus: "published",
        routeName: "School Route 104 – Afternoon Run",
        primaryJourneyId: "journey_school_pm",
        runs: [
          {
            ...buildMorningRun(),
            id: "run_afternoon",
            name: "School Route 104 – Afternoon Run",
          },
        ],
      }),
    ],
    [
      "duty_3",
      buildDutyDetail({
        id: "duty_3",
        reference: "MON-COM-7-PM",
        startTime: "13:15",
        endTime: "15:45",
        routeName: "Community Route 7",
        passengerCount: 4,
        escortRequired: false,
        specialInstructions: "Passenger-centred route — check accessibility needs before each pickup.",
        lifecycleStatus: "delivered",
        vehicle: VEHICLE_WX21,
        primaryJourneyId: "journey_community_7",
        runs: [buildCommunityRun()],
        vehicleCheck: {
          status: "not_started",
          canStartDuty: false,
          pendingManagerAdvice: false,
          checklist: Object.fromEntries(DRIVER_VEHICLE_CHECK_ITEMS.map((i) => [i.id, "unset"])),
          vehicleId: "veh_wx21",
          assignmentId: "asgn_community_7",
        },
      }),
    ],
  ]);
}

const dutyStore = createInitialDutyStore();

export const MOCK_DUTIES: DutySummary[] = Array.from(dutyStore.values()).map((d) => ({
  id: d.id,
  reference: d.reference,
  dutyDate: d.dutyDate,
  startTime: d.startTime,
  endTime: d.endTime,
  lifecycleStatus: d.lifecycleStatus,
  reportingLocation: d.reportingLocation,
  routeName: d.routeName,
  passengerCount: d.passengerCount,
  escortRequired: d.escortRequired,
  specialInstructions: d.specialInstructions,
  vehicle: d.vehicle,
}));

export function getMockDutyDetail(dutyId: string): DutyDetail | null {
  return dutyStore.get(dutyId) ?? null;
}

/** Keep mock applicator state aligned with UI/store when check flow patches duty locally. */
export function syncMockDutyDetail(duty: DutyDetail): void {
  dutyStore.set(duty.id, structuredClone(duty));
}

/** Rebuild duties from seed — undoes in-memory mutations from demo / outbox applies. */
export function resetMockDutyStoreForTests(): void {
  vehicleReadinessByVehicle.clear();
  const fresh = createInitialDutyStore();
  dutyStore.clear();
  for (const [id, duty] of fresh.entries()) {
    dutyStore.set(id, duty);
  }
}

export function mutateMockDuty(mutation: OutboxMutation): void {
  const payload = mutation.payload as Record<string, unknown>;
  const dutyId = payload.dutyId as string | undefined;
  if (!dutyId) return;

  const duty = dutyStore.get(dutyId);
  if (!duty) return;

  switch (mutation.type) {
    case "duty.acknowledge": {
      if (duty.lifecycleStatus === "delivered") duty.lifecycleStatus = "viewed";
      if (duty.lifecycleStatus === "viewed") duty.lifecycleStatus = "acknowledged";
      duty.lifecycleStatus = "ready";
      break;
    }
    case "vehicle.verify": {
      duty.vehicleVerified = true;
      break;
    }
    case "vehicle.check.submit": {
      const vehicleId = (payload.vehicleId as string) ?? duty.vehicle?.id;
      const assignmentId =
        (payload.assignmentId as string) ?? duty.vehicleCheck.assignmentId ?? `asgn_${dutyId}`;
      const checkSessionId = (payload.checkSessionId as string) ?? `vc_${dutyId}`;
      const checklist = payload.checklist as Record<string, string> | undefined;
      const outcome = payload.outcome as string | undefined;
      const hasDefect = checklist
        ? Object.values(checklist).some((v) => v === "defect")
        : Boolean(payload.hasDefect);
      const outcomeReleased =
        outcome === "RELEASED_NO_DEFECTS" ||
        outcome === "RELEASED_WITH_ACCEPTED_DEFECTS" ||
        (!outcome && !hasDefect);

      if (vehicleId) {
        setVehicleReadiness({
          vehicleId,
          assignmentId,
          checkSessionId,
          status: outcomeReleased ? "released" : "held",
          validFrom: new Date().toISOString(),
          outcome: outcomeReleased
            ? outcome === "RELEASED_WITH_ACCEPTED_DEFECTS"
              ? "RELEASED_WITH_ACCEPTED_DEFECTS"
              : "RELEASED_NO_DEFECTS"
            : "HELD_PENDING_REVIEW",
        });
      }

      // Only clear THIS duty if the check vehicle matches the assigned vehicle
      const covers = readinessCoversVehicle(
        vehicleId ? vehicleReadinessByVehicle.get(vehicleId) : undefined,
        duty.vehicle?.id ?? "",
        duty.vehicleCheck.assignmentId,
      );

      if (covers || (vehicleId && vehicleId === duty.vehicle?.id && outcomeReleased)) {
        duty.vehicleCheck = {
          ...duty.vehicleCheck,
          status: outcomeReleased ? "cleared" : "awaiting_decision",
          canStartDuty: outcomeReleased,
          pendingManagerAdvice: hasDefect && !outcomeReleased,
          checklist:
            (checklist as DutyDetail["vehicleCheck"]["checklist"]) ?? duty.vehicleCheck.checklist,
          vehicleId,
          assignmentId,
          checkSessionId,
        };
        if (outcomeReleased) duty.vehicleVerified = true;
      }
      break;
    }
    case "duty.clock_in": {
      const vehicleId = duty.vehicle?.id;
      const readiness = vehicleId ? getVehicleReadiness(vehicleId) : undefined;
      const checkCleared =
        duty.vehicleCheck.canStartDuty ||
        readinessCoversVehicle(readiness, vehicleId ?? "", duty.vehicleCheck.assignmentId) ||
        (readiness?.status === "released" && readiness.vehicleId === vehicleId);
      const verified = duty.vehicleVerified || checkCleared;

      if (!verified || !checkCleared) {
        throw new Error("Cannot clock in — vehicle not verified or check not cleared for this vehicle.");
      }

      // If the walkaround cleared readiness in UI but mock duty lagged, heal it here
      if (!duty.vehicleCheck.canStartDuty && checkCleared) {
        duty.vehicleVerified = true;
        duty.vehicleCheck.status = "cleared";
        duty.vehicleCheck.canStartDuty = true;
        if (readiness) {
          duty.vehicleCheck.vehicleId = readiness.vehicleId;
          duty.vehicleCheck.assignmentId = readiness.assignmentId;
          duty.vehicleCheck.checkSessionId = readiness.checkSessionId;
        }
      }

      if (duty.lifecycleStatus !== "ready" && duty.lifecycleStatus !== "acknowledged") {
        throw new Error("Cannot clock in — duty is not acknowledged/ready.");
      }
      const now = new Date().toISOString();
      duty.clockedInAt = now;
      duty.fitForDutyDeclaredAt = now;
      break;
    }
    case "duty.start": {
      // Legacy alias: clock in only — does NOT start a journey
      if (!duty.clockedInAt) {
        const now = new Date().toISOString();
        duty.clockedInAt = now;
        duty.fitForDutyDeclaredAt = now;
      }
      break;
    }
    case "journey.start": {
      if (!duty.clockedInAt) {
        throw new Error("Cannot start journey before clocking into the duty.");
      }
      if (!duty.vehicleCheck.canStartDuty) {
        throw new Error("Cannot start journey — vehicle not released for this assignment.");
      }
      const journeyId = payload.journeyId as string | undefined;
      if (duty.lifecycleStatus !== "in_progress") {
        if (duty.lifecycleStatus === "acknowledged") {
          assertDutyTransition("acknowledged", "ready");
          duty.lifecycleStatus = "ready";
        }
        if (duty.lifecycleStatus !== "ready") {
          throw new Error(`Cannot start journey from duty status ${duty.lifecycleStatus}`);
        }
        assertDutyTransition("ready", "in_progress");
        duty.lifecycleStatus = "in_progress";
        duty.startedAt = new Date().toISOString();
      }
      const run =
        duty.runs.find((r) => r.id === journeyId) ??
        duty.runs.find((r) => r.id === SCHOOL_MORNING_JOURNEY.runId) ??
        duty.runs[0];
      if (run) {
        run.status = "active";
        if (run.stops[0]) run.stops[0].status = "completed";
        if (run.stops[1]) run.stops[1].status = "approaching";
      }
      break;
    }
    case "journey.complete": {
      const journeyId = payload.journeyId as string | undefined;
      for (const run of duty.runs) {
        if (!journeyId || run.id === journeyId || run.id === SCHOOL_MORNING_JOURNEY.runId) {
          run.status = "completed";
        }
      }
      const allDone = duty.runs.every((r) => r.status === "completed");
      if (allDone) {
        // Do not auto-complete duty — handback / completeDuty is separate
        duty.lifecycleStatus = "in_progress";
      }
      break;
    }
    case "vehicle.handback": {
      const handback = payload.handback as
        | { custodyAction?: string; locationOrBay?: string; completedAt?: string }
        | undefined;
      duty.vehicleHandback = {
        completedAt: handback?.completedAt ?? new Date().toISOString(),
        locationOrBay: handback?.locationOrBay ?? "",
        custodyAction: handback?.custodyAction ?? "returned_to_yard",
      };
      break;
    }
    case "stop.arrive": {
      const stopId = payload.stopId as string;
      for (const run of duty.runs) {
        const stop = run.stops.find((s) => s.id === stopId);
        if (stop) stop.status = "arrived";
      }
      break;
    }
    case "passenger.outcome": {
      const stopId = payload.stopId as string | undefined;
      const taskId = payload.taskId as string | undefined;
      const passengerId = payload.passengerId as string | undefined;
      const pickupOutcome = payload.pickupOutcome as string | undefined;
      const dropoffOutcome = payload.dropoffOutcome as string | undefined;
      const outcome =
        (payload.outcome as string | undefined) ??
        pickupOutcome ??
        dropoffOutcome ??
        "boarded";
      const statusMap: Record<string, DutyDetail["runs"][0]["stops"][0]["passengerTasks"][0]["status"]> = {
        boarded: "boarded",
        not_ready: "not_ready",
        no_show: "no_show",
        refused: "refused",
        cancelled: "cancelled",
        unreachable: "no_show",
        unsafe_to_board: "escalated",
        transport_not_required: "cancelled",
        wrong_location: "escalated",
        handed_over: "handed_over",
        independent_drop_off: "dropped_off",
        handover_delayed: "not_ready",
        authorised_person_absent: "escalated",
        drop_off_refused: "refused",
        alternative_drop_off_authorised: "handed_over",
        safeguarding_escalation: "escalated",
      };
      const mapped = statusMap[outcome] ?? "escalated";
      const terminalTaskStatuses = new Set([
        "boarded",
        "no_show",
        "refused",
        "cancelled",
        "escalated",
        "dropped_off",
        "handed_over",
      ]);
      // Outcomes that leave the stop open (driver still waiting)
      const keepStopOpen = new Set(["not_ready"]);

      for (const run of duty.runs) {
        for (const stop of run.stops) {
          if (stopId && stop.id !== stopId) continue;

          const task = taskId
            ? stop.passengerTasks.find((t) => t.id === taskId)
            : stop.passengerTasks.find((t) => t.passengerId === passengerId);
          if (task) task.status = mapped;

          if (keepStopOpen.has(outcome)) {
            if (stop.status === "scheduled" || stop.status === "approaching") {
              stop.status = "arrived";
            }
            continue;
          }

          const tasksResolved =
            stop.passengerTasks.length === 0 ||
            stop.passengerTasks.every((t) => terminalTaskStatuses.has(t.status));

          if (!tasksResolved) continue;

          stop.status = "completed";
          const idx = run.stops.findIndex((s) => s.id === stop.id);
          const nextStop = idx >= 0 ? run.stops[idx + 1] : undefined;
          if (
            nextStop &&
            (nextStop.status === "scheduled" || nextStop.status === "approaching")
          ) {
            nextStop.status = "approaching";
          }
        }
      }
      break;
    }
    case "defect.report": {
      // Driver assessment only — opsClassification stays null until Ops triages
      duty.vehicleCheck.pendingManagerAdvice = true;
      const assessment = payload.driverAssessment as string | undefined;
      if (assessment === "safety_critical" && duty.vehicle) {
        duty.vehicle.vorStatus = true;
        duty.vehicleCheck.canStartDuty = false;
        duty.vehicleCheck.status = "awaiting_decision";
      }
      break;
    }
    case "incident.report": {
      break;
    }
    case "duty.complete": {
      duty.lifecycleStatus = "completed";
      duty.completedAt = new Date().toISOString();
      if (duty.runs[0]) duty.runs[0].status = "completed";
      break;
    }
  }

  dutyStore.set(dutyId, { ...duty });
}
