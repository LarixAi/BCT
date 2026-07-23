import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.fn(() => true);
const getPlatform = vi.fn(() => "ios");
const isAvailable = vi.fn();
const verifyIdentity = vi.fn();
const setData = vi.fn();
const getData = vi.fn();
const getSecureData = vi.fn();
const deleteData = vi.fn();
const isDataSaved = vi.fn();
const getSession = vi.fn();
const refreshSession = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
    getPlatform: () => getPlatform(),
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
  BiometricAuthError: {
    UNKNOWN_ERROR: 0,
    BIOMETRICS_UNAVAILABLE: 1,
    USER_LOCKOUT: 2,
    BIOMETRICS_NOT_ENROLLED: 3,
    USER_TEMPORARY_LOCKOUT: 4,
    AUTHENTICATION_FAILED: 10,
    APP_CANCEL: 11,
    INVALID_CONTEXT: 12,
    NOT_INTERACTIVE: 13,
    PASSCODE_NOT_SET: 14,
    SYSTEM_CANCEL: 15,
    USER_CANCEL: 16,
    USER_FALLBACK: 17,
  },
  NativeBiometric: {
    isAvailable: (...args) => isAvailable(...args),
    verifyIdentity: (...args) => verifyIdentity(...args),
    setData: (...args) => setData(...args),
    getData: (...args) => getData(...args),
    getSecureData: (...args) => getSecureData(...args),
    deleteData: (...args) => deleteData(...args),
    isDataSaved: (...args) => isDataSaved(...args),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: (...args) => getSession(...args),
      refreshSession: (...args) => refreshSession(...args),
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

const SAMPLE_REFRESH = "abcdefghijkl"; // 12-char Supabase v1-style token
const SAMPLE_REFRESH_V2 =
  "v1.refresh-token-sample-value-that-is-long-enough-for-plausible-check-001";

describe("biometric-enrollment", () => {
  beforeEach(() => {
    vi.resetModules();
    mockStorage();
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("ios");
    isAvailable.mockReset();
    verifyIdentity.mockReset();
    setData.mockReset();
    getSecureData.mockReset();
    getData.mockReset();
    deleteData.mockReset();
    isDataSaved.mockReset();
    getSession.mockReset();
    refreshSession.mockReset();
    isAvailable.mockResolvedValue({ isAvailable: true, biometryType: 2, strongBiometryIsAvailable: true });
    verifyIdentity.mockResolvedValue(undefined);
    setData.mockResolvedValue(undefined);
    isDataSaved.mockResolvedValue({ isSaved: true });
    getData.mockResolvedValue({ value: SAMPLE_REFRESH });
    // expires_at far in the future — getCurrentRefreshToken treats a session
    // near/past expiry as stale and forces a refreshSession() call instead.
    const farFutureExpiry = Math.floor(Date.now() / 1000) + 3600;
    getSession.mockResolvedValue({
      data: { session: { refresh_token: SAMPLE_REFRESH, expires_at: farFutureExpiry } },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts legacy 12-character Supabase refresh tokens", async () => {
    const { isPlausibleRefreshToken } = await import("./biometric-credential-store.js");
    expect(isPlausibleRefreshToken("abcdefghijkl")).toBe(true);
    expect(isPlausibleRefreshToken("short")).toBe(false);
    expect(isPlausibleRefreshToken(SAMPLE_REFRESH_V2)).toBe(true);
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
    getPlatform.mockReturnValue("ios");
    const { enableBiometricSignIn } = await import("./biometric-enrollment.js");
    const { getBiometricPreference } = await import("./biometric-preference.js");

    await expect(enableBiometricSignIn("drv_1")).resolves.toEqual({ ok: true, label: "Face ID" });
    expect(verifyIdentity).toHaveBeenCalled();
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "veyvio.driver.biometric.refresh.drv_1",
        value: SAMPLE_REFRESH,
        accessControl: 2,
      }),
    );
    expect(getBiometricPreference("drv_1").enabled).toBe(true);
    expect(getBiometricPreference("drv_1").deviceName).toBeTruthy();
  });

  it("enables on Android without crypto Keystore (avoids Class 2 AuthActivity crash)", async () => {
    getPlatform.mockReturnValue("android");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
    });
    getData.mockResolvedValue({ value: SAMPLE_REFRESH });
    const { enableBiometricSignIn } = await import("./biometric-enrollment.js");

    await expect(enableBiometricSignIn("drv_1")).resolves.toEqual({ ok: true, label: "Fingerprint" });
    expect(verifyIdentity).toHaveBeenCalled();
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        accessControl: 0,
        value: SAMPLE_REFRESH,
      }),
    );
  });

  it("does not mark enabled when Android storage round-trip fails", async () => {
    getPlatform.mockReturnValue("android");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
    });
    getData.mockResolvedValue({ value: "short" });
    isDataSaved.mockResolvedValue({ isSaved: false });
    const { enableBiometricSignIn } = await import("./biometric-enrollment.js");
    const { getBiometricPreference } = await import("./biometric-preference.js");

    await expect(enableBiometricSignIn("drv_1")).resolves.toMatchObject({ ok: false });
    expect(getBiometricPreference("drv_1").enabled).toBe(false);
  });

  it("keeps enrollment enabled when unlock prompt is cancelled", async () => {
    const { saveBiometricPreference, getBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", { enabled: true, label: "Fingerprint" });
    getSecureData.mockRejectedValue(Object.assign(new Error("User canceled"), { code: "16" }));
    isDataSaved.mockResolvedValue({ isSaved: true });

    const { unlockStoredRefreshToken } = await import("./biometric-enrollment.js");
    await expect(unlockStoredRefreshToken("drv_1")).rejects.toThrow(/cancelled/i);
    expect(getBiometricPreference("drv_1").enabled).toBe(true);
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
    const next = "mnopqrstuvwx";
    const farFutureExpiry = Math.floor(Date.now() / 1000) + 3600;
    getSession.mockResolvedValue({
      data: { session: { refresh_token: next, expires_at: farFutureExpiry } },
    });
    getData.mockResolvedValue({ value: next });

    const { rebindBiometricCredentialIfEnabled } = await import("./biometric-enrollment.js");
    await rebindBiometricCredentialIfEnabled("drv_1");
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        value: next,
      }),
    );
  });
});
