import { describe, expect, it } from "vitest";
import {
  getDriverPrimaryTab,
  normalizeDriverPathname,
  shouldShowDriverBottomNav,
} from "./navigation-policy";

describe("driver bottom navigation policy", () => {
  it.each([
    ["/", "home"],
    ["/trips", "duties"],
    ["/duties", "duties"],
    ["/checks", "checks"],
    ["/messages", "messages"],
    ["/more", "more"],
  ] as const)("shows on primary hub %s", (pathname, expected) => {
    expect(shouldShowDriverBottomNav(pathname)).toBe(true);
    expect(getDriverPrimaryTab(pathname)).toBe(expected);
  });

  it.each([
    "/trips/",
    "/checks/",
    "/messages/",
    "/more/",
  ])("shows on trailing-slash hub %s", (pathname) => {
    expect(shouldShowDriverBottomNav(pathname)).toBe(true);
  });

  it.each([
    "/trips/TRP-1042",
    "/duties/DUTY-104",
    "/duties/DUTY-104/nav",
    "/duties/DUTY-104/journey/active",
    "/checks/verify",
    "/checks/walkaround",
    "/checks/defect",
    "/messages/conv_dispatch_142",
    "/messages/new",
    "/more/security",
    "/more/notifications",
    "/incidents/report",
    "/sign-in",
  ])("hides on focused route %s", (pathname) => {
    expect(shouldShowDriverBottomNav(pathname)).toBe(false);
    expect(getDriverPrimaryTab(pathname)).toBeNull();
  });

  it("normalises trailing slashes", () => {
    expect(normalizeDriverPathname("/messages/")).toBe("/messages");
  });
});
