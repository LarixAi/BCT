import { describe, expect, it } from "vitest";
import {
  isChecksNavActive,
  isMoreNavActive,
  isVehiclesNavActive,
  isYardNavActive,
} from "@/domain/yard/nav-routes";
import { statusLabel } from "@/domain/yard/status-display";

describe("nav-routes", () => {
  it("matches brand bottom navigation sections", () => {
    expect(isChecksNavActive("/checks")).toBe(true);
    expect(isChecksNavActive("/yard/v3/check")).toBe(true);
    expect(isVehiclesNavActive("/yard")).toBe(true);
    expect(isVehiclesNavActive("/yard/v1")).toBe(true);
    expect(isVehiclesNavActive("/yard/map")).toBe(false);
    expect(isYardNavActive("/yard/map")).toBe(true);
    expect(isYardNavActive("/scan")).toBe(true);
    expect(isMoreNavActive("/tasks")).toBe(true);
    expect(isMoreNavActive("/inspections/damage-review")).toBe(true);
  });
});

describe("status-display", () => {
  it("uses brand-facing status labels", () => {
    expect(statusLabel("Available")).toBe("Ready");
    expect(statusLabel("Awaiting Check")).toBe("Check due");
    expect(statusLabel("VOR")).toBe("VOR");
  });
});
