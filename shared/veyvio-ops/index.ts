export * from "./types";
export * from "./state-machines";
export * from "./commands";
export * from "./readiness";
export * from "./eligibility";
export * from "./defects";
export * from "./vehicle-swap";
export * from "./offline-applicator";
export * from "./command-transport";
export * from "./events";
export * from "./cross-app-events";
export * from "./stop-outcomes";
export * from "./delay-events";
export * from "./handback";

/** Canonical school morning journey — single source of display truth. */
export const SCHOOL_MORNING_JOURNEY = {
  journeyId: "journey_school_am",
  runId: "run_school_am",
  runCode: "RUN-104-AM",
  displayName: "School Route 104 – Morning Run",
  version: 8,
} as const;
