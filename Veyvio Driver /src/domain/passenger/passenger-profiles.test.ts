import { describe, expect, it } from "vitest";
import { getPassengerProfile, mobilityCategoryLabel } from "@/domain/passenger/passenger-profiles";

describe("passenger profiles", () => {
  it("includes CTauk-inspired operational personas", () => {
    expect(getPassengerProfile("pax_dalvinder")?.mobilityCategory).toBe("visual_impairment");
    expect(getPassengerProfile("pax_siobhan")?.wheelchairUser).toBe(true);
    expect(getPassengerProfile("pax_mark")?.vulnerabilityFlag).toBe(true);
    expect(getPassengerProfile("pax_angie")?.assistanceAnimal).toBe(true);
  });

  it("labels mobility categories for drivers", () => {
    expect(mobilityCategoryLabel("wheelchair_user")).toBe("Wheelchair user");
    expect(mobilityCategoryLabel("visual_impairment")).toBe("Visual impairment");
  });
});
