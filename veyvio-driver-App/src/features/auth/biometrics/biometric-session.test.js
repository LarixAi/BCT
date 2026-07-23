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

describe("shouldRebindBiometricCredential", () => {
  // Regression test for a real bug: Supabase rotates the refresh token on every
  // use, including routine background TOKEN_REFRESHED while the app just sits
  // open. The fix only ever excluded TOKEN_REFRESHED from rebinding (to dodge a
  // Samsung boot crash), so the Keychain/Keystore copy went stale on every
  // routine refresh — fingerprint sign-in would then fail and silently disable
  // itself, forcing the driver back to password + "set up fingerprint again".
  it("always rebinds on an explicit sign-in, booted or not", async () => {
    const { shouldRebindBiometricCredential } = await import("./biometric-session.js");
    expect(shouldRebindBiometricCredential("SIGNED_IN", false)).toBe(true);
    expect(shouldRebindBiometricCredential("SIGNED_IN", true)).toBe(true);
  });

  it("skips the first TOKEN_REFRESHED right after cold launch", async () => {
    const { shouldRebindBiometricCredential } = await import("./biometric-session.js");
    expect(shouldRebindBiometricCredential("TOKEN_REFRESHED", false)).toBe(false);
  });

  it("rebinds later TOKEN_REFRESHED events once the app has finished booting", async () => {
    const { shouldRebindBiometricCredential } = await import("./biometric-session.js");
    expect(shouldRebindBiometricCredential("TOKEN_REFRESHED", true)).toBe(true);
  });

  it("ignores unrelated auth events", async () => {
    const { shouldRebindBiometricCredential } = await import("./biometric-session.js");
    expect(shouldRebindBiometricCredential("USER_UPDATED", true)).toBe(false);
    expect(shouldRebindBiometricCredential("SIGNED_OUT", true)).toBe(false);
  });
});
