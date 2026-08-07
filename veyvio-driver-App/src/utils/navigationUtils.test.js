import { describe, expect, it } from "vitest";
import { getNearestStepIndex } from "@/utils/navigationUtils";

// Three steps heading east along the equator so metre distances are easy to reason about.
const steps = [
  { endLocation: { latLng: { latitude: 0, longitude: 0 } } }, // step 0 ends here
  { endLocation: { latLng: { latitude: 0, longitude: 0.001 } } }, // step 1 ends ~111m east
  { endLocation: { latLng: { latitude: 0, longitude: 0.002 } } }, // step 2 ends ~222m east
];

describe("getNearestStepIndex", () => {
  it("advances forward when the driver is closer to a later step", () => {
    const nearStep2 = { latitude: 0, longitude: 0.0019 };
    expect(getNearestStepIndex(nearStep2, steps, 1)).toBe(2);
  });

  it("never regresses behind currentStepIndex, even when an earlier step's endpoint is geometrically closer", () => {
    // The driver is essentially back at step 0's endpoint (GPS noise/jitter) while
    // already on step 1 — a naive global-nearest search would jump back to 0,
    // which is exactly the bug that made the app repeat the previous instruction.
    const nearStep0 = { latitude: 0, longitude: 0.00001 };
    expect(getNearestStepIndex(nearStep0, steps, 1)).toBe(1);
  });

  it("stays on the current step when it is still the nearest of the remaining steps", () => {
    const midStep1 = { latitude: 0, longitude: 0.0006 };
    expect(getNearestStepIndex(midStep1, steps, 1)).toBe(1);
  });

  it("defaults currentStepIndex to 0 for an initial call", () => {
    const nearStep0 = { latitude: 0, longitude: 0.00001 };
    expect(getNearestStepIndex(nearStep0, steps)).toBe(0);
  });

  it("clamps an out-of-range currentStepIndex to the last step", () => {
    const anyPoint = { latitude: 0, longitude: 0.0015 };
    expect(getNearestStepIndex(anyPoint, steps, 99)).toBe(2);
  });
});
