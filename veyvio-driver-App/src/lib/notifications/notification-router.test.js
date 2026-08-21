import { describe, expect, it, vi } from "vitest";
import { routeFromNotificationData } from "@/lib/notifications/notification-router";

describe("routeFromNotificationData", () => {
  it("routes duty published notifications to My Duty", () => {
    const navigate = vi.fn();
    routeFromNotificationData({ screen: "duty_published" }, navigate);
    expect(navigate).toHaveBeenCalledWith("/jobs");
  });

  it("routes driver.duty.published type to My Duty", () => {
    const navigate = vi.fn();
    routeFromNotificationData({ type: "driver.duty.published" }, navigate);
    expect(navigate).toHaveBeenCalledWith("/jobs");
  });

  it("routes document expiry to documents", () => {
    const navigate = vi.fn();
    routeFromNotificationData({ type: "document_expiring" }, navigate);
    expect(navigate).toHaveBeenCalledWith("/documents");
  });

  it("routes vehicle check reminders to check hub", () => {
    const navigate = vi.fn();
    routeFromNotificationData({ screen: "VehicleCheck" }, navigate);
    expect(navigate).toHaveBeenCalledWith("/check");
  });
});
