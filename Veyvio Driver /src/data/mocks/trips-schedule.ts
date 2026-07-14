import type { DriverAssignment, OperationalAlert, TripDetail, TripsSchedulePayload } from "@/types/trips";
import { tripPassengerFromProfile } from "@/domain/passenger/passenger-pickup";
import { PASSENGER_PROFILES } from "@/domain/passenger/passenger-profiles";
import { SCHOOL_MORNING_JOURNEY } from "@veyvio/ops";

const today = new Date().toISOString().slice(0, 10);

function schoolMorningRun(overrides?: Partial<DriverAssignment>): DriverAssignment {
  return {
    id: "asgn_school_am",
    dutyId: "duty_1",
    reference: SCHOOL_MORNING_JOURNEY.runCode,
    assignmentType: "school_run",
    status: "confirmed",
    scheduledDate: today,
    scheduledStart: "07:30",
    scheduledEnd: "09:05",
    origin: "Wembley Depot · Unit 12, Wembley Industrial Estate, HA9 0AA",
    destination: "St Mark's Primary School · Church Lane, Wembley, HA9 6RT",
    runName: SCHOOL_MORNING_JOURNEY.displayName,
    vehicleRegistration: "LK23 ABC",
    vehicleId: "veh_lk23",
    metadata: {
      passengerCount: 8,
      stopCount: 6,
      pickupCount: 6,
      dropoffCount: 2,
      wheelchairRequired: true,
      escortRequired: true,
      estimatedDuration: "1 hr 35 min",
      hasInstructions: true,
    },
    primaryActionLabel: "View trip",
    primaryActionHref: "/trips/asgn_school_am",
    ...overrides,
  };
}

function passengerTransfer(): DriverAssignment {
  return {
    id: "asgn_transfer",
    reference: "TRP-8821",
    assignmentType: "single_trip",
    status: "assigned",
    scheduledDate: today,
    scheduledStart: "10:30",
    scheduledEnd: "11:15",
    origin: "18 Carlton Avenue",
    destination: "St Thomas' Hospital",
    runName: "Passenger Transfer",
    vehicleRegistration: "LK23 ABC",
    checkInFrom: "10:15",
    metadata: {
      passengerCount: 1,
      wheelchairRequired: true,
      estimatedDuration: "45 min",
    },
    primaryActionLabel: "View trip",
    primaryActionHref: "/trips/asgn_transfer",
  };
}

function vehicleMovement(): DriverAssignment {
  return {
    id: "asgn_move",
    reference: "MOV-441",
    assignmentType: "vehicle_movement",
    status: "assigned",
    scheduledDate: today,
    scheduledStart: "13:15",
    scheduledEnd: "13:45",
    origin: "North Depot",
    destination: "Main Yard",
    runName: "Vehicle Movement",
    vehicleRegistration: "LK23 ABC",
    metadata: { estimatedDuration: "30 min" },
    primaryActionLabel: "View trip",
    primaryActionHref: "/trips/asgn_move",
  };
}

function communityAfternoonRun(): DriverAssignment {
  return {
    id: "asgn_community_7",
    dutyId: "duty_3",
    reference: "RUN-COM-7-PM",
    assignmentType: "multi_stop_run",
    status: "assigned",
    scheduledDate: today,
    scheduledStart: "13:30",
    scheduledEnd: "15:30",
    origin: "Riverside Depot",
    destination: "Riverside Depot",
    runName: "Community Route 7 — Afternoon",
    vehicleRegistration: "WX21 FYV",
    vehicleId: "veh_wx21",
    metadata: {
      passengerCount: 4,
      stopCount: 6,
      pickupCount: 4,
      wheelchairRequired: true,
      estimatedDuration: "2 hr",
      hasInstructions: true,
    },
    primaryActionLabel: "Review passengers",
    primaryActionHref: "/duties/duty_3/passengers",
  };
}

function schoolAfternoonRun(): DriverAssignment {
  return {
    id: "asgn_school_pm",
    reference: "RUN-104-PM",
    assignmentType: "school_run",
    status: "assigned",
    scheduledDate: today,
    scheduledStart: "15:00",
    scheduledEnd: "16:45",
    origin: "St Mark's Primary School",
    destination: "Wembley Depot",
    runName: "School Route 104 – Afternoon Run",
    vehicleRegistration: "LK23 ABC",
    metadata: {
      passengerCount: 8,
      stopCount: 6,
      wheelchairRequired: true,
    },
    primaryActionLabel: "View trip",
    primaryActionHref: "/trips/asgn_school_pm",
  };
}

/** Default: next trip + schedule (no active trip) */
export function buildMockTripsSchedule(): TripsSchedulePayload {
  return {
    operationalAlerts: [
      {
        id: "alert_check",
        type: "vehicle_check_incomplete",
        title: "Vehicle check required",
        description: "Complete the check for LK23 ABC before beginning your first trip.",
        actionLabel: "Complete vehicle check",
        actionHref: "/checks",
        priority: "blocking",
      },
    ],
    today: [
      schoolMorningRun({ status: "confirmed" }),
      passengerTransfer(),
      communityAfternoonRun(),
      vehicleMovement(),
      schoolAfternoonRun(),
    ],
    upcoming: {
      "2026-07-13": [
        {
          ...schoolMorningRun({
            id: "asgn_up_1",
            scheduledDate: "2026-07-13",
            status: "assigned",
            acknowledgementRequired: true,
            primaryActionLabel: "Acknowledge",
            primaryActionHref: "/trips/asgn_up_1",
          }),
        },
        {
          ...passengerTransfer(),
          id: "asgn_up_2",
          scheduledDate: "2026-07-13",
          scheduledStart: "14:00",
          status: "assigned",
          primaryActionHref: "/trips/asgn_up_2",
        },
        {
          ...vehicleMovement(),
          id: "asgn_up_3",
          scheduledDate: "2026-07-13",
          status: "assigned",
          primaryActionHref: "/trips/asgn_up_3",
        },
      ],
      "2026-07-14": [
        {
          ...schoolAfternoonRun(),
          id: "asgn_up_4",
          scheduledDate: "2026-07-14",
          status: "assigned",
          primaryActionHref: "/trips/asgn_up_4",
        },
        {
          ...passengerTransfer(),
          id: "asgn_up_5",
          scheduledDate: "2026-07-14",
          scheduledStart: "09:00",
          status: "assigned",
          primaryActionHref: "/trips/asgn_up_5",
        },
      ],
    },
    completed: {
      [today]: [
        {
          id: "asgn_done_1",
          reference: "RUN-102-AM",
          assignmentType: "school_run",
          status: "completed",
          scheduledDate: "2026-07-11",
          scheduledStart: "07:15",
          scheduledEnd: "08:55",
          actualStart: "07:18",
          actualEnd: "09:02",
          origin: "Wembley Depot",
          destination: "Oakfield School",
          runName: "School Morning Run",
          vehicleRegistration: "LK23 ABC",
          delayLabel: "7 min late",
          metadata: { passengerCount: 6, stopCount: 5, passengersCollected: 6 },
          primaryActionLabel: "View record",
          primaryActionHref: "/trips/history/asgn_done_1",
          debriefCompleted: true,
        },
        {
          id: "asgn_done_2",
          reference: "TRP-8801",
          assignmentType: "single_trip",
          status: "completed",
          scheduledDate: "2026-07-11",
          scheduledStart: "11:00",
          scheduledEnd: "11:40",
          actualStart: "11:00",
          actualEnd: "11:38",
          origin: "22 Park Lane",
          destination: "Royal Hospital",
          runName: "Passenger Transfer",
          vehicleRegistration: "LK23 ABC",
          metadata: { passengerCount: 1, wheelchairRequired: true },
          primaryActionLabel: "View record",
          primaryActionHref: "/trips/history/asgn_done_2",
          hadIncident: true,
          debriefRequired: true,
          debriefCompleted: false,
        },
      ],
    },
  };
}

/** Active trip pinned at top */
export function buildActiveTripsSchedule(): TripsSchedulePayload {
  const base = buildMockTripsSchedule();
  const active = schoolMorningRun({
    status: "in_progress",
    currentStop: "14 Hawthorn Road",
    nextStop: "St Mark's Primary School",
    metadata: {
      passengerCount: 8,
      stopCount: 6,
      passengersCollected: 5,
      wheelchairRequired: true,
      escortRequired: true,
    },
    primaryActionLabel: "Continue trip",
    primaryActionHref: "/trips/asgn_school_am",
  });

  return {
    ...base,
    operationalAlerts: [],
    today: [
      active,
      ...base.today.filter((a) => a.id !== "asgn_school_am"),
    ],
  };
}

/** No trips assigned today */
export function buildEmptyTripsSchedule(): TripsSchedulePayload {
  return {
    operationalAlerts: [],
    today: [],
    upcoming: {},
    completed: {},
  };
}

export interface TripOfficeChange {
  field: string;
  previous: string;
  current: string;
}

export function getTripOfficeChanges(assignmentId: string): TripOfficeChange[] {
  if (assignmentId === "asgn_transfer") {
    return [
      { field: "Pickup time", previous: "10:30", current: "10:50" },
      { field: "Vehicle", previous: "LK23 ABC", current: "VN71 XYZ" },
    ];
  }
  return [];
}

export function getCancelledAssignment(assignmentId: string): DriverAssignment | null {
  if (assignmentId !== "asgn_school_pm") return null;
  return {
    ...schoolAfternoonRun(),
    status: "cancelled",
    cancellationReason: "School closed for inset day. Run no longer required.",
    cancelledAt: "06:45",
    cancelledBy: "Operations desk",
    primaryActionLabel: "View cancellation",
    primaryActionHref: `/trips/cancelled/${assignmentId}`,
  };
}

/** Exception: updated trip + vehicle changed */
export function buildExceptionTripsSchedule(): TripsSchedulePayload {
  const base = buildMockTripsSchedule();
  return {
    ...base,
    operationalAlerts: [
      {
        id: "alert_vehicle",
        type: "vehicle_changed",
        title: "Vehicle changed by Operations",
        description: "Your assignment now uses VN71 XYZ. Acknowledge before starting.",
        actionLabel: "Acknowledge change",
        actionHref: "/trips/changed/asgn_transfer",
        priority: "blocking",
      },
      {
        id: "alert_updated",
        type: "trip_updated",
        title: "Trip updated by Operations",
        description: "Pickup time changed from 10:30 to 10:50 for Passenger Transfer.",
        actionLabel: "View changes",
        actionHref: "/trips/changed/asgn_transfer",
        priority: "information",
      },
    ],
    today: base.today.map((a) =>
      a.id === "asgn_transfer"
        ? {
            ...a,
            status: "updated" as const,
            scheduledStart: "10:50",
            hasOfficeChange: true,
            officeChangeSummary: "Pickup time changed from 10:30 to 10:50 by Operations.",
            acknowledgementRequired: true,
            vehicleRegistration: "VN71 XYZ",
            primaryActionLabel: "Acknowledge",
          }
        : a,
    ),
  };
}

export function getTripDetail(assignmentId: string): TripDetail | null {
  const all = [
    ...buildMockTripsSchedule().today,
    ...Object.values(buildMockTripsSchedule().upcoming).flat(),
    ...Object.values(buildMockTripsSchedule().completed).flat(),
    schoolMorningRun({ id: "asgn_school_am", status: "in_progress" }),
  ];

  const assignment = all.find((a) => a.id === assignmentId);
  if (!assignment) return null;

  if (assignment.id === "asgn_community_7") {
    return {
      ...assignment,
      dispatcherDepot: "Riverside Depot",
      stopTimeline: [
        { id: "s1", order: 1, name: "Riverside Depot", address: "Unit 4, Riverside Depot, Bristol BS2 0XJ", plannedTime: "13:30", status: "pending", type: "depot" },
        { id: "s2", order: 2, name: "Newcastle Street", address: "18 Newcastle Street, Bristol BS2 0QT", plannedTime: "13:45", status: "pending", type: "pickup" },
        { id: "s3", order: 3, name: "Riverside Centre", address: "Riverside Community Centre, Bristol BS1 6XG", plannedTime: "14:00", status: "pending", type: "pickup" },
        { id: "s4", order: 4, name: "Learning for Life", address: "Learning for Life Centre, Bristol BS5 6PR", plannedTime: "14:20", status: "pending", type: "pickup" },
        { id: "s5", order: 5, name: "City Centre", address: "12 Broad Quay, Bristol BS1 4DJ", plannedTime: "14:35", status: "pending", type: "pickup" },
        { id: "s6", order: 6, name: "Riverside Depot", address: "Unit 4, Riverside Depot, Bristol BS2 0XJ", plannedTime: "15:30", status: "pending", type: "depot" },
      ],
      passengers: [
        tripPassengerFromProfile(PASSENGER_PROFILES.pax_dalvinder),
        tripPassengerFromProfile(PASSENGER_PROFILES.pax_siobhan),
        tripPassengerFromProfile(PASSENGER_PROFILES.pax_mark),
        tripPassengerFromProfile(PASSENGER_PROFILES.pax_angie),
      ],
      instructions: [
        { id: "i1", category: "assistance", title: "Passenger-centred route", body: "Review each passenger profile before arriving at their stop." },
        { id: "i2", category: "pickup", title: "Wheelchair boarding", body: "Deploy ramp and confirm restraint before moving off for Siobhan." },
        { id: "i3", category: "handover", title: "Mark — Learning for Life", body: "Staff handover only. Do not leave unattended." },
        { id: "i4", category: "access", title: "Assistance dog", body: "Angie's dog Annie travels at her feet — do not separate." },
      ],
    };
  }

  if (assignment.id === "asgn_school_am" || assignment.assignmentType === "school_run") {
    return {
      ...assignment,
      dispatcherDepot: "Wembley Depot",
      stopTimeline: [
        { id: "s1", order: 1, name: "Wembley Depot", address: "Unit 12, Wembley Industrial Estate, London HA9 0AA", plannedTime: "07:30", status: "completed", type: "depot" },
        { id: "s2", order: 2, name: "14 Hawthorn Road", address: "14 Hawthorn Road, Wembley, London HA0 2QR", plannedTime: "07:42", status: "arrived", type: "pickup" },
        { id: "s3", order: 3, name: "Oak Lane", address: "22 Oak Lane, Wembley, London HA0 3PL", plannedTime: "07:48", status: "pending", type: "pickup" },
        { id: "s4", order: 4, name: "Cedar Close", address: "5 Cedar Close, Wembley, London HA0 4ST", plannedTime: "08:05", status: "pending", type: "pickup" },
        { id: "s5", order: 5, name: "St Mark's Primary School", address: "Church Lane, Wembley, London HA9 6RT", plannedTime: "08:30", status: "pending", type: "dropoff" },
        { id: "s6", order: 6, name: "Wembley Depot", address: "Unit 12, Wembley Industrial Estate, London HA9 0AA", plannedTime: "09:05", status: "pending", type: "depot" },
      ],
      passengers: [
        {
          id: "p1",
          name: "Daniel R.",
          wheelchairRequired: true,
          boardingInstructions: "Use rear lift. Secure wheelchair before departure.",
          status: "boarded",
        },
        {
          id: "pax_amelia",
          name: "Amelia Clarke",
          passengerProfileId: "pax_amelia",
          wheelchairRequired: true,
          boardingInstructions: "Rear lift and wheelchair restraint required.",
          handoverRequirements: "Hand to reception staff only at school.",
          safeguardingWarning: true,
          status: "scheduled",
        },
      ],
      instructions: [
        { id: "i1", category: "pickup", title: "Hawthorn Road", body: "Wait on nearside. Do not block driveway." },
        { id: "i2", category: "destination", title: "School entrance", body: "Use rear vehicle entrance today." },
        { id: "i3", category: "operations", title: "Route change", body: "Oak Lane pickup moved 5 minutes earlier." },
      ],
    };
  }

  if (assignment.id === "asgn_transfer" || assignment.assignmentType === "single_trip") {
    return {
      ...assignment,
      dispatcherDepot: "Wembley Depot",
      stopTimeline: [
        { id: "s1", order: 1, name: "Travel to pickup", address: assignment.origin, plannedTime: assignment.scheduledStart, status: "pending", type: "pickup" },
        { id: "s2", order: 2, name: "Travel to destination", address: assignment.destination, status: "pending", type: "dropoff" },
      ],
      passengers: [
        {
          id: "p1",
          name: "Passenger (restricted until check-in)",
          wheelchairRequired: true,
          handoverRequirements: "Hand to ward reception staff only.",
          status: "scheduled",
        },
      ],
      instructions: [
        { id: "i1", category: "access", title: "Hospital drop-off", body: "Use patient entrance B. Call ahead on arrival." },
      ],
    };
  }

  return {
    ...assignment,
    dispatcherDepot: "Wembley Depot",
    stopTimeline: [
      { id: "s1", order: 1, name: assignment.origin, address: assignment.origin, plannedTime: assignment.scheduledStart, status: "pending", type: "waypoint" },
      { id: "s2", order: 2, name: assignment.destination, address: assignment.destination, status: "pending", type: "waypoint" },
    ],
    passengers: [],
    instructions: [],
  };
}
