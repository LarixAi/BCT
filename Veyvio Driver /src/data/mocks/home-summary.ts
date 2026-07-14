import type { DriverHomeSummary } from "@/types/home";
import { formaliseKnownDefect, SCHOOL_MORNING_JOURNEY } from "@veyvio/ops";

const ACCEPTED_SCRATCH = formaliseKnownDefect({
  id: "def_1",
  description: "Rear nearside bodywork scratch",
  location: "Rear nearside panel",
  blocksUse: false,
  acceptedBy: "Yard supervisor — Willesden",
  acceptedAt: "2026-07-10T09:15:00.000Z",
  restrictions: "Cosmetic only — no speed or passenger restriction",
});

/** Default demo summary: duty scheduled, vehicle check required, next journey assigned. */
export function buildMockHomeSummary(overrides?: Partial<DriverHomeSummary>): DriverHomeSummary {
  const now = new Date();
  const syncedAt = new Date(now.getTime() - 45_000).toISOString();

  return {
    driver: {
      id: "drv_larone",
      displayName: "Larone",
      companyName: "Ridgeway School Transport",
      depotName: "Wembley Depot",
      complianceStatus: "clear",
      unreadNotifications: 2,
    },
    operationalState: "vehicle_check_required",
    duty: {
      status: "scheduled",
      scheduledStart: "2026-07-13T06:45:00",
      scheduledStartLabel: "13 July, 06:45",
      drivingMinutes: 0,
      dutyMinutes: 0,
      dutyId: "duty_1",
    },
    vehicleAssignment: {
      vehicleId: "veh_lk23",
      registration: "LK23 ABC",
      fleetNumber: "MB-08",
      make: "Mercedes-Benz",
      model: "Sprinter",
      vehicleType: "16-seat accessible minibus",
      roadworthinessStatus: "roadworthy",
      checkStatus: "required",
      assignmentId: "asgn_school_am",
      openDefectCount: 1,
      mileage: 38420,
      fuelOrChargeLevel: "72%",
      depotLocation: "Wembley Depot — Bay 4",
      defects: [
        {
          id: ACCEPTED_SCRATCH.id,
          title: ACCEPTED_SCRATCH.description,
          recordedAt: "2026-07-10",
          blocksUse: ACCEPTED_SCRATCH.blocksUse,
          location: ACCEPTED_SCRATCH.location,
          classification: ACCEPTED_SCRATCH.classification,
          acceptedBy: ACCEPTED_SCRATCH.acceptedBy,
          acceptedAt: ACCEPTED_SCRATCH.acceptedAt,
          restrictions: ACCEPTED_SCRATCH.restrictions,
        },
      ],
    },
    nextTrip: {
      id: SCHOOL_MORNING_JOURNEY.journeyId,
      dutyId: "duty_1",
      name: SCHOOL_MORNING_JOURNEY.displayName,
      startTime: "07:20",
      endTime: "09:05",
      vehicleRegistration: "LK23 ABC",
      firstPickupTime: "07:35",
      passengerCount: 8,
      wheelchairPassengerCount: 1,
      passengerAssistantName: "Sarah M.",
      phase: "not_started",
    },
    todaySchedule: [
      { id: "s1", time: "06:45", label: "Start duty", status: "ready" },
      { id: "s2", time: "07:20", label: SCHOOL_MORNING_JOURNEY.displayName, status: "upcoming" },
      { id: "s3", time: "09:30", label: "Return to depot", status: "upcoming" },
      { id: "s4", time: "10:00", label: "Break", status: "upcoming" },
      { id: "s5", time: "12:15", label: "Passenger transfer", status: "upcoming" },
      { id: "s5b", time: "13:30", label: "Community Route 7", status: "upcoming" },
      { id: "s6", time: "15:00", label: "School Route 104 – Afternoon Run", status: "upcoming" },
      { id: "s7", time: "17:20", label: "End-of-duty checks", status: "upcoming" },
    ],
    requiredActions: [
      {
        id: "ra_check",
        priority: "work_blocking",
        title: "Vehicle check overdue",
        description: `Complete the vehicle check for LK23 ABC before starting ${SCHOOL_MORNING_JOURNEY.displayName}.`,
        actionLabel: "Start vehicle check",
        href: "/checks",
      },
      {
        id: "ra_passengers",
        priority: "journey_related",
        title: "Review passenger needs",
        description: "Community Route 7 has four passengers with different accessibility requirements.",
        actionLabel: "View passengers",
        href: "/duties/duty_3/passengers",
      },
      {
        id: "ra_notice",
        priority: "journey_related",
        title: "Read operational notice",
        description: "Temporary entrance change at Oakfield School.",
        actionLabel: "Read notice",
      },
      {
        id: "ra_doc",
        priority: "compliance",
        title: "Document expiring",
        description: "Your driver qualification card expires in 21 days.",
        actionLabel: "View documents",
        href: "/more",
      },
    ],
    latestOperationalNotice: {
      id: "notice_1",
      title: "Route 104 entrance changed",
      body: "Use the rear vehicle entrance at Oakfield School today.",
      requiresAcknowledgement: true,
      acknowledged: false,
    },
    sync: {
      online: true,
      lastSyncedAt: syncedAt,
      pendingChangeCount: 0,
    },
    ...overrides,
  };
}

/** Active journey — en route to first pickup. */
export function buildActiveJourneyHomeSummary(): DriverHomeSummary {
  return buildMockHomeSummary({
    operationalState: "journey_active",
    duty: {
      status: "on_duty",
      actualStart: new Date(Date.now() - 2.3 * 3600000).toISOString(),
      drivingMinutes: 86,
      dutyMinutes: 138,
      nextBreakDueAt: "10:15",
      dutyId: "duty_1",
    },
    activeTrip: {
      id: SCHOOL_MORNING_JOURNEY.journeyId,
      dutyId: "duty_1",
      name: SCHOOL_MORNING_JOURNEY.displayName,
      startTime: "07:20",
      vehicleRegistration: "LK23 ABC",
      phase: "en_route_pickup",
      estimatedArrival: "07:32",
      scheduledArrival: "07:35",
      delayLabel: "On time",
      milesRemaining: 1.8,
      passengerCount: 8,
      wheelchairPassengerCount: 1,
    },
    nextTrip: undefined,
    requiredActions: [],
    vehicleAssignment: {
      ...buildMockHomeSummary().vehicleAssignment!,
      checkStatus: "passed",
      assignmentId: "asgn_school_am",
      checkSessionId: "vc_lk23_session",
    },
  });
}

/** QA: simulate failed sync without polluting the default demo. */
export function buildSyncFailedHomeSummary(): DriverHomeSummary {
  return buildMockHomeSummary({
    sync: {
      online: true,
      lastSyncedAt: new Date(Date.now() - 120_000).toISOString(),
      pendingChangeCount: 2,
    },
  });
}
