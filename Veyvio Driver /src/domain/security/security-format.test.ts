import { describe, expect, it } from "vitest";
import { appLockTimeoutLabel, formatRelativeSecurityTime } from "@/domain/security/security-format";

describe("formatRelativeSecurityTime", () => {
  it("returns just now for recent timestamps", () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeSecurityTime(iso)).toBe("Just now");
  });

  it("returns minutes for sub-hour gaps", () => {
    const iso = new Date(Date.now() - 12 * 60_000).toISOString();
    expect(formatRelativeSecurityTime(iso)).toBe("12 min ago");
  });
});

describe("appLockTimeoutLabel", () => {
  it("labels one minute distinctly", () => {
    expect(appLockTimeoutLabel(1)).toBe("After 1 minute");
    expect(appLockTimeoutLabel(5)).toBe("After 5 minutes");
  });
});
