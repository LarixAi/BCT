import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.fn(() => true);
const isAvailable = vi.fn();
const verifyIdentity = vi.fn();
const setData = vi.fn();
const getSecureData = vi.fn();
const deleteData = vi.fn();
const getSession = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

vi.mock("@capgo/capacitor-native-biometric", () => ({
  BiometryType: {
    NONE: 0,
    TOUCH_ID: 1,
    FACE_ID: 2,
    FINGERPRINT: 3,
    FACE_AUTHENTICATION: 4,
    IRIS_AUTHENTICATION: 5,
    MULTIPLE: 6,
    DEVICE_CREDENTIAL: 7,
  },
  AccessControl: {
    NONE: 0,
    BIOMETRY_CURRENT_SET: 1,
    BIOMETRY_ANY: 2,
  },
  NativeBiometric: {
    isAvailable: (...args) => isAvailable(...args),
    verifyIdentity: (...args) => verifyIdentity(...args),
    setData: (...args) => setData(...args),
    getSecureData: (...args) => getSecureData(...args),
    deleteData: (...args) => deleteData(...args),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: (...args) => getSession(...args),
    },
  }),
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

describe("biometric-enrollment", () => {
  beforeEach(() => {
    vi.resetModules();
    mockStorage();
    isNativePlatform.mockReturnValue(true);
    isAvailable.mockReset();
    verifyIdentity.mockReset();
    setData.mockReset();
    getSession.mockReset();
    isAvailable.mockResolvedValue({ isAvailable: true, biometryType: 2 });
    verifyIdentity.mockResolvedValue(undefined);
    setData.mockResolvedValue(undefined);
    getSession.mockResolvedValue({ data: { session: { refresh_token: "rt_live" } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers enrollment when pending and biometrics available", async () => {
    const { shouldOfferBiometricEnrollment } = await import("./biometric-enrollment.js");
    await expect(shouldOfferBiometricEnrollment("drv_1")).resolves.toBe(true);
  });

  it("does not offer when driver chose don't ask again", async () => {
    const { saveBiometricPreference, PROMPT_DONT_ASK } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { promptStatus: PROMPT_DONT_ASK });
    const { shouldOfferBiometricEnrollment } = await import("./biometric-enrollment.js");
    await expect(shouldOfferBiometricEnrollment("drv_1")).resolves.toBe(false);
  });

  it("does not offer while remind-after is in the future", async () => {
    const { saveBiometricPreference, PROMPT_REMIND } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", {
      promptStatus: PROMPT_REMIND,
      remindAfter: new Date(Date.now() + 60_000).toISOString(),
    });
    const { shouldOfferBiometricEnrollment } = await import("./biometric-enrollment.js");
    await expect(shouldOfferBiometricEnrollment("drv_1")).resolves.toBe(false);
  });

  it("enables biometric sign-in after verify + stores refresh token", async () => {
    const { enableBiometricSignIn } = await import("./biometric-enrollment.js");
    const { getBiometricPreference } = await import("./biometric-preference.js");

    await expect(enableBiometricSignIn("drv_1")).resolves.toEqual({ ok: true, label: "Face ID" });
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "veyvio.driver.biometric.refresh.drv_1",
        value: "rt_live",
        accessControl: 1,
      }),
    );
    expect(getBiometricPreference("drv_1").enabled).toBe(true);
    expect(getBiometricPreference("drv_1").deviceName).toBeTruthy();
  });

  it("removes local trusted device biometric state", async () => {
    const { saveBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true, label: "Face ID", deviceName: "Work phone" });
    localStorage.setItem("veyvio.driver.biometric.lastDriverId", "drv_1");

    const { removeTrustedDeviceLocally } = await import("./biometric-enrollment.js");
    const { getBiometricPreference, PROMPT_DONT_ASK } = await import("./biometric-preference.js");
    await removeTrustedDeviceLocally("drv_1");

    expect(deleteData).toHaveBeenCalled();
    expect(getBiometricPreference("drv_1").enabled).toBe(false);
    expect(getBiometricPreference("drv_1").promptStatus).toBe(PROMPT_DONT_ASK);
    expect(localStorage.getItem("veyvio.driver.biometric.lastDriverId")).toBeNull();
  });

  it("rebinds stored refresh token when already enabled", async () => {
    const { saveBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true, label: "Face ID" });
    getSession.mockResolvedValue({ data: { session: { refresh_token: "rt_new" } } });

    const { rebindBiometricCredentialIfEnabled } = await import("./biometric-enrollment.js");
    await rebindBiometricCredentialIfEnabled("drv_1");
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "rt_new",
      }),
    );
  });
});
