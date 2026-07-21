import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.fn(() => true);

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

function mockStorage() {
  /** @type {Map<string, string>} */
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
  return store;
}

describe("shouldRequireBiometricLock", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockStorage();
    isNativePlatform.mockReturnValue(true);
    const { clearBiometricUnlocked } = await import("./biometric-lock-state.js");
    clearBiometricUnlocked();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("locks on cold start when biometric sign-in is enabled", async () => {
    const { saveBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true });
    const { shouldRequireBiometricLock } = await import("./biometric-session.js");
    expect(
      shouldRequireBiometricLock({
        driverId: "drv_1",
        coldStart: true,
      }),
    ).toBe(true);
  });

  it("does not lock within the grace window after background", async () => {
    const { saveBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true, lockAfterMinutes: 2 });
    const { shouldRequireBiometricLock } = await import("./biometric-session.js");
    expect(
      shouldRequireBiometricLock({
        driverId: "drv_1",
        backgroundedForMs: 30_000,
      }),
    ).toBe(false);
  });

  it("locks after the configured background grace period", async () => {
    const { saveBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true, lockAfterMinutes: 2 });
    const { shouldRequireBiometricLock } = await import("./biometric-session.js");
    expect(
      shouldRequireBiometricLock({
        driverId: "drv_1",
        backgroundedForMs: 3 * 60 * 1000,
      }),
    ).toBe(true);
  });

  it("skips lock while navigating", async () => {
    const { saveBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true });
    const { shouldRequireBiometricLock } = await import("./biometric-session.js");
    expect(
      shouldRequireBiometricLock({
        driverId: "drv_1",
        coldStart: true,
        navigating: true,
      }),
    ).toBe(false);
  });
});
