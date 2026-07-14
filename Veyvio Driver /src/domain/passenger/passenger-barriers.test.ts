import { describe, expect, it } from "vitest";
import {
  BARRIER_PERSPECTIVES,
  getBarrierPerspective,
  getBarrierPerspectiveForProfile,
} from "@/domain/passenger/passenger-barriers";

describe("passenger barriers", () => {
  it("includes CTauk-aligned perspectives for all four names", () => {
    const names = BARRIER_PERSPECTIVES.map((item) => item.name);
    expect(names).toEqual(["Bethany", "Dalvinder", "Mark", "Siobhan"]);
  });

  it("links operational profiles to barrier perspectives", () => {
    expect(getBarrierPerspectiveForProfile("pax_dalvinder")?.name).toBe("Dalvinder");
    expect(getBarrierPerspectiveForProfile("pax_mark")?.driverTakeaway).toMatch(/Speak directly/);
    expect(getBarrierPerspectiveForProfile("pax_siobhan")?.barrierCategories).toContain("environment");
  });

  it("resolves perspective by id", () => {
    expect(getBarrierPerspective("perspective_bethany")?.role).toBe("parent_carer");
  });
});
