import { describe, expect, it } from "vitest";
import { formatRegistration, normaliseRegistration, parseVehicleQrPayload } from "./scan-qr";

describe("parseVehicleQrPayload", () => {
  it("parses plain registration", () => {
    expect(parseVehicleQrPayload("LK23 ABC")?.registration).toBe("LK23 ABC");
    expect(parseVehicleQrPayload("lk23abc")?.registration).toBe("LK23 ABC");
  });

  it("parses Veyvio vehicle tags", () => {
    expect(parseVehicleQrPayload("VEYVIO:VEH:LK23ABC:042")).toEqual({
      registration: "LK23 ABC",
      fleetNumber: "042",
      raw: "VEYVIO:VEH:LK23ABC:042",
    });
  });

  it("parses JSON payloads", () => {
    expect(
      parseVehicleQrPayload('{"registration":"LK23 ABC","fleetNumber":"042"}')?.fleetNumber,
    ).toBe("042");
  });

  it("rejects empty", () => {
    expect(parseVehicleQrPayload("")).toBeNull();
    expect(parseVehicleQrPayload("??")).toBeNull();
  });
});

describe("registration helpers", () => {
  it("compares without spaces", () => {
    expect(normaliseRegistration("lk23 abc")).toBe("LK23ABC");
  });

  it("formats modern UK plates", () => {
    expect(formatRegistration("lk23abc")).toBe("LK23 ABC");
  });
});
