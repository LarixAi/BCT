import { describe, expect, it } from "vitest";
import { buildTripOverlayPayload } from "@/platform/driver-focus/build-trip-presentation";
import { getMockDutyDetail } from "@/data/mocks/duties";

describe("buildTripOverlayPayload", () => {
  it("uses street-only next stop label without passenger names", () => {
    const duty = getMockDutyDetail("duty_1");
    const payload = buildTripOverlayPayload({
      duty,
      dutyId: "duty_1",
      workflow: "en_route_pickup",
      dutyPaused: false,
      etaLabel: "6 min",
      distanceLabel: "2.1 miles",
    });

    expect(payload.nextStopLabel).not.toContain("—");
    expect(payload.passengerProgressLabel).toMatch(/\d+ of \d+ completed/);
    expect(payload.tripStateLabel).toBe("Travelling to pickup");
  });

  it("shows paused state without sensitive details", () => {
    const duty = getMockDutyDetail("duty_1");
    const payload = buildTripOverlayPayload({
      duty,
      dutyId: "duty_1",
      workflow: "duty_paused",
      dutyPaused: true,
    });

    expect(payload.tripStateLabel).toBe("Trip paused");
  });
});
