import { describe, expect, it } from "vitest";
import { parseDutyNavUrl } from "@/features/driver-focus/TripDeepLinkHandler";
import { tripNavDeepLink } from "@/platform/native/plugins/trip-overlay-plugin";

describe("trip deep links", () => {
  it("builds custom scheme nav links", () => {
    expect(tripNavDeepLink("duty_1")).toBe("veyvio-driver://duties/duty_1/nav");
  });

  it("parses custom scheme urls", () => {
    expect(parseDutyNavUrl("veyvio-driver://duties/duty_1/nav")).toBe("duty_1");
  });

  it("parses https app paths", () => {
    expect(parseDutyNavUrl("https://command.veyvio.app/duties/duty_2/nav")).toBe("duty_2");
  });
});
