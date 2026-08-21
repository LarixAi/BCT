import { describe, expect, it } from "vitest";
import { driverAppRouteFromUrl, isDriverAuthCallbackUrl } from "@/lib/driverAuthDeepLink";

describe("driverAppRouteFromUrl", () => {
  it("maps custom-scheme operational paths", () => {
    expect(driverAppRouteFromUrl("uk.veyvio.driver://sync")).toBe("/sync");
    expect(driverAppRouteFromUrl("uk.veyvio.driver:///sync")).toBe("/sync");
    expect(driverAppRouteFromUrl("uk.veyvio.driver://duty")).toBe("/duty");
    expect(driverAppRouteFromUrl("uk.veyvio.driver:///vehicle/handback")).toBe("/vehicle/handback");
    expect(driverAppRouteFromUrl("uk.veyvio.driver://vehicle/handback")).toBe("/vehicle/handback");
    expect(driverAppRouteFromUrl("uk.veyvio.driver://notifications")).toBe("/notifications");
  });

  it("does not steal auth callbacks", () => {
    expect(isDriverAuthCallbackUrl("uk.veyvio.driver://verify")).toBe(true);
    expect(driverAppRouteFromUrl("uk.veyvio.driver://verify")).toBe(null);
  });

  it("ignores unknown hosts", () => {
    expect(driverAppRouteFromUrl("uk.veyvio.driver://unknown-place")).toBe(null);
  });

  it("does not treat Capacitor WebView localhost paths as deep links", () => {
    expect(driverAppRouteFromUrl("https://localhost/documents")).toBe(null);
    expect(driverAppRouteFromUrl("https://localhost/check")).toBe(null);
    expect(driverAppRouteFromUrl("http://127.0.0.1/vehicle")).toBe(null);
  });
});
