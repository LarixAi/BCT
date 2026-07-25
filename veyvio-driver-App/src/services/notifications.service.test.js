import { describe, expect, it } from "vitest";
import { resolveDriverNotificationPath } from "./notifications.service.js";

describe("resolveDriverNotificationPath", () => {
  it("routes duty published notifications to jobs", () => {
    expect(
      resolveDriverNotificationPath("/jobs", {
        notification_type: "driver.duty.published",
        title: "Duty published",
      }),
    ).toBe("/jobs");
  });

  it("routes compliance warnings to documents when licence mentioned", () => {
    expect(
      resolveDriverNotificationPath(null, {
        notification_type: "driver.compliance.warning",
        body: "Driving licence expires in 14 days",
      }),
    ).toBe("/documents");
  });

  it("routes VOR alerts to vehicle hub", () => {
    expect(
      resolveDriverNotificationPath("/vehicle", {
        notification_type: "driver.vehicle.vor",
        title: "AB12 CDE marked VOR",
      }),
    ).toBe("/vehicle");
  });

  it("routes awaiting inspection to vehicle hub", () => {
    expect(
      resolveDriverNotificationPath(null, {
        notification_type: "driver.vehicle.awaiting_check",
        body: "Damage report needs yard inspection",
      }),
    ).toBe("/vehicle");
  });
});
