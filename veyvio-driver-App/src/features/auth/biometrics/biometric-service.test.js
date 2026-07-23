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

describe("biometric-service", () => {
  beforeEach(() => {
    vi.resetModules();
    isNativePlatform.mockReturnValue(true);
    isAvailable.mockReset();
    verifyIdentity.mockReset();
  });

  it("reports unavailable on web", async () => {
    isNativePlatform.mockReturnValue(false);
    const { checkBiometricAvailability } = await import("./biometric-service.js");
    await expect(checkBiometricAvailability()).resolves.toEqual({
      available: false,
      label: "Biometric authentication",
    });
  });

  it("maps Face ID for display", async () => {
    isAvailable.mockResolvedValue({ isAvailable: true, biometryType: 2 });
    const { checkBiometricAvailability } = await import("./biometric-service.js");
    await expect(checkBiometricAvailability()).resolves.toMatchObject({
      available: true,
      label: "Face ID",
    });
  });

  it("returns false when verifyIdentity throws", async () => {
    verifyIdentity.mockRejectedValue(new Error("cancelled"));
    const { verifyDriverIdentity } = await import("./biometric-service.js");
    await expect(verifyDriverIdentity()).resolves.toBe(false);
  });
});

describe("biometric-credential-store", () => {
  const SAMPLE = "abcdefghijkl";
  const SAMPLE_LONG = "v1.refresh-token-sample-value-that-is-long-enough-for-plausible-check-001";

  beforeEach(() => {
    vi.resetModules();
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("ios");
    setData.mockReset();
    getSecureData.mockReset();
    getData.mockReset();
    verifyIdentity.mockReset();
    deleteData.mockReset();
  });

  it("stores the refresh token with BIOMETRY_ANY when strong biometrics exist on iOS", async () => {
    getPlatform.mockReturnValue("ios");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
    });
    setData.mockResolvedValue(undefined);
    const { saveBiometricCredential } = await import("./biometric-credential-store.js");
    await saveBiometricCredential({ driverId: "drv_1", refreshToken: SAMPLE });
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "veyvio.driver.biometric.refresh.drv_1",
        value: SAMPLE,
        accessControl: 2,
      }),
    );
  });

  it("never uses crypto Keystore on Android even when strong biometrics are reported", async () => {
    getPlatform.mockReturnValue("android");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
    });
    setData.mockResolvedValue(undefined);
    getData.mockResolvedValue({ value: SAMPLE });
    const { saveBiometricCredential } = await import("./biometric-credential-store.js");
    await saveBiometricCredential({ driverId: "drv_1", refreshToken: SAMPLE });
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        accessControl: 0,
      }),
    );
  });

  it("stores without crypto on Class 2 weak biometrics", async () => {
    getPlatform.mockReturnValue("ios");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: false,
    });
    setData.mockResolvedValue(undefined);
    getData.mockResolvedValue({ value: SAMPLE_LONG });
    const { saveBiometricCredential } = await import("./biometric-credential-store.js");
    await saveBiometricCredential({ driverId: "drv_1", refreshToken: SAMPLE_LONG });
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        accessControl: 0,
      }),
    );
  });

  it("treats user cancel as cancelled, not missing", async () => {
    getPlatform.mockReturnValue("ios");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
    });
    getSecureData.mockRejectedValue(Object.assign(new Error("User canceled"), { code: "16" }));
    const { readBiometricCredential, classifyBiometricCredentialError } = await import(
      "./biometric-credential-store.js"
    );
    expect(classifyBiometricCredentialError(Object.assign(new Error("x"), { code: "16" }))).toBe(
      "cancelled",
    );
    await expect(readBiometricCredential("drv_1")).resolves.toMatchObject({
      kind: "cancelled",
    });
  });

  it("treats missing keystore entry as missing", async () => {
    getPlatform.mockReturnValue("ios");
    isAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
    });
    getSecureData.mockRejectedValue(
      Object.assign(new Error("No protected data found"), { code: "21" }),
    );
    const { readBiometricCredential } = await import("./biometric-credential-store.js");
    await expect(readBiometricCredential("drv_1")).resolves.toMatchObject({
      kind: "missing",
    });
  });
});

describe("biometric-preference", () => {
  /** @type {Map<string, string>} */
  let store;

  beforeEach(async () => {
    store = new Map();
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists enabled metadata without secrets", async () => {
    const { saveBiometricPreference, getBiometricPreference } = await import("./biometric-preference.js");
    saveBiometricPreference("drv_1", {
      enabled: true,
      enabledAt: "2026-07-19T20:30:00.000Z",
      label: "Face ID",
    });
    expect(getBiometricPreference("drv_1")).toMatchObject({
      enabled: true,
      label: "Face ID",
      lockAfterMinutes: 2,
    });
    const raw = localStorage.getItem("veyvio.driver.biometric.prefs.v1");
    expect(raw).not.toContain("rt_");
    expect(raw).not.toContain("password");
  });
});
