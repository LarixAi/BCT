import type { Vehicle } from "@/types/yard";

/** Vehicles that need action before they can enter service. */
export function countVehiclesNeedingAttention(
  vehicles: Vehicle[],
  trips: { vehicleId: string; ready: boolean }[],
): number {
  const blockedVehicleIds = new Set(
    trips.filter(t => !t.ready).map(t => t.vehicleId),
  );
  const ids = new Set<string>();
  for (const v of vehicles) {
    if (
      v.status === "VOR" ||
      v.status === "Awaiting Check" ||
      blockedVehicleIds.has(v.id)
    ) {
      ids.add(v.id);
    }
  }
  return ids.size;
}

export function homeOperationalHeadline(vehicleCount: number): string {
  if (vehicleCount === 0) return "All vehicles accounted for";
  if (vehicleCount === 1) return "One vehicle needs attention before service";
  return `${vehicleCount} vehicles need attention before service`;
}

export function homeSubtitle(vehicleCount: number, depotActionCount: number): string {
  if (vehicleCount > 0 && depotActionCount > 0) {
    return "Resolve vehicle issues and depot actions below.";
  }
  if (vehicleCount > 0) {
    return "Review status, complete checks and clear blockers before release.";
  }
  if (depotActionCount > 0) {
    return "No vehicles blocked — reviews and tasks still need action.";
  }
  return "Fleet status, departures and yard movements at a glance.";
}

function n(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export const yardCopy = {
  home: {
    boardLabel: "Depot board",
    needsAttention: "Needs attention",
    allClearTitle: "No vehicles require attention",
    allClearHint: "Check departures or run a yard check if you're starting a shift.",
    myTasks: "My tasks",
    zoneOccupancy: "Zone occupancy",
    departureLine: "Departure line",
    departureSub: "next 90 min",
    yardInventory: "Yard inventory",
    quickLinks: {
      yardMap: "Yard map",
      arrivals: "Arrivals",
      scan: "Scan",
    },
  },

  welcome: {
    stepLabel: (step: number) => `Step ${step} of 3`,
    authorisedNote: "Veyvio Yard is available to authorised transport teams only.",
    pages: [
      {
        step: 1,
        title: "Control the yard with confidence",
        message:
          "See vehicle readiness, complete checks, record damage, manage equipment and keep every movement accountable.",
        next: "/welcome/2" as const,
      },
      {
        step: 2,
        title: "Keep unsafe vehicles off the road",
        message:
          "Complete yard checks, report defects, mark vehicles VOR and maintain a complete safety record.",
        next: "/welcome/3" as const,
        prev: "/welcome/1" as const,
      },
      {
        step: 3,
        title: "Every movement accounted for",
        message:
          "Track bays, departures, equipment and handovers — one trusted record from inspection to release.",
        prev: "/welcome/2" as const,
      },
    ],
  },

  auth: {
    signInTitle: "Sign in",
    signInSupporting: "Available to authorised transport teams only.",
    signInFailed: "Sign in failed. Check your credentials and try again.",
    signingIn: "Signing in…",
    offlineAuth: "Offline — sign in when connection returns",
    weakConnection: "Weak connection",
    online: "Online",
  },

  empty: {
    noOpenDefects: "No open defects",
    nothingAwaitingCheck: "No vehicles awaiting a yard check",
    noVorCases: "No vehicles are currently VOR",
    noDamageReview: "No open damage records",
    noDamageReviewHint: "Driver damage reports will appear here for Yard review.",
    noInspectionsPending: "No inspections awaiting action",
  },

  buttons: {
    completeYardCheck: "Complete yard check",
    recordDamageReport: "Record damage report",
    markVehicleVor: "Mark vehicle VOR",
    returnToService: "Return to service",
    keepVor: "Keep VOR",
    confirmMove: "Confirm move",
    signIn: "Sign in",
    continue: "Continue",
    back: "Back",
  },

  confirm: {
    markVor: (reg: string) => ({
      title: `Mark ${reg} as VOR?`,
      description:
        "This will remove the vehicle from the available fleet and notify Operations.",
    }),
    releaseVor: (reg: string) => ({
      title: `Return ${reg} to service?`,
      description:
        "Confirm repairs are verified and safety-critical defects are cleared before release.",
    }),
    rtsCheck: (reg: string) => ({
      title: `Approve return to service for ${reg}?`,
      description:
        "This records a return-to-service yard check and may clear the vehicle from VOR.",
    }),
    safetyDefectVor: (reg: string) => ({
      title: `Mark ${reg} as VOR?`,
      description:
        "A safety-critical defect will open a VOR case and remove the vehicle from service.",
    }),
  },

  vor: {
    expansion: "VOR — Vehicle off road. The vehicle cannot enter service until cleared.",
  },

  sync: {
    title: "Sync queue",
    emptyQueue: "No updates waiting to sync. Changes made offline will appear here.",
    loading: "Loading queue…",
    retryPending: "Retry pending",
    syncing: "Syncing…",
    workingOffline: "You are working offline",
    savedOnDevice: "Changes are being saved on this device",
    connectionRestored: "Connection restored. Updates are syncing",
    allSynced: "All updates are now synced",
    syncFailed: "Some updates could not sync",
    pendingUpdates: (count: number) =>
      count === 1 ? "1 update waiting to sync" : `${count} updates waiting to sync`,
    badge: {
      offline: "Working offline",
      syncing: (count: number) => (count > 0 ? `Syncing · ${count}` : "Syncing"),
      failed: "Sync failed",
      synced: "Synced",
      ready: "Ready",
    },
    viewQueue: "View sync queue",
  },

  toast: {
    check: {
      complete: (reg: string) => `Vehicle check completed — ${reg}`,
      completeEverySection: "Complete every section before continuing.",
      rtsBlocked: "Return-to-service blocked — resolve outstanding repairs and defects first",
      savedVor: (vorCount: number) =>
        `Vehicle held VOR — ${n(vorCount, "case opened", "cases opened")}`,
      auditMissed: (count: number) =>
        `Spot audit — ${n(count, "missed defect found", "missed defects found")}`,
      defectsRaised: (count: number) =>
        `Check saved — ${n(count, "defect raised", "defects raised")}`,
    },
    move: {
      toBay: (reg: string, bayId: string) => `${reg} moved to ${bayId}`,
      parked: (reg: string, bayId: string) => `${reg} parked at ${bayId}`,
      staged: (reg: string, bayId: string) => `${reg} staged at ${bayId}`,
    },
    vor: {
      opened: (reg: string) => `Vehicle marked VOR — ${reg}`,
      openedWithCase: (reg: string, caseId: string) => `Vehicle marked VOR — ${reg} (${caseId})`,
      statusChanged: (caseId: string, target: string) => `VOR ${caseId} → ${target}`,
    },
    defect: {
      raised: (reg: string) => `Defect raised on ${reg}`,
      resolved: "Defect marked resolved",
      couldNotResolve: (reason: string) => reason,
      repairOrderRaised: "Repair work order raised",
      repairStarted: "Repair started",
      awaitingVerification: "Repair complete — verification required",
    },
    equipment: {
      assigned: (label: string, reg: string) => `${label} assigned to ${reg}`,
      unassigned: (label: string, dest: string) => `${label} unassigned → ${dest}`,
      restocked: (count: number, reg: string) =>
        `Restocked ${n(count, "item", "items")} on ${reg}`,
      issue: (label: string, issue: string) => `${label} — ${issue}`,
    },
    departure: {
      released: (tripCode: string) => `${tripCode} released for departure`,
      leftDepot: (tripCode: string) => `${tripCode} left the depot — bay is now empty`,
    },
    task: {
      completed: "Task completed",
      accepted: "Task accepted",
      assigned: (name: string) => `Assigned to ${name}`,
    },
    shift: {
      notesRequired: "Add handover notes before completing",
      handoverRecorded: "Shift handover recorded",
    },
    inspection: {
      selectZone: "Select a body zone first.",
      damageRecorded: "Damage record added",
      baselineApproved: "Baseline approved — vehicle condition snapshot created",
      repairVerificationPassed: "Repair verification passed",
      repairVerificationFailed: "Repair failed verification — returned to workshop",
      completed: "Inspection completed",
      reviewRecorded: "Damage review recorded",
    },
    driverReport: {
      fieldsRequired: "Select vehicle, zone and describe the damage",
      filed: "Damage report filed — awaiting Yard review",
    },
    scan: {
      noMatch: (value: string) => `No vehicle or item found for “${value}”`,
    },
  },
} as const;
