import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.fn(() => true);
const isAvailable = vi.fn();
const verifyIdentity = vi.fn();
const setData = vi.fn();
const getSecureData = vi.fn();
const deleteData = vi.fn();

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
  beforeEach(() => {
    vi.resetModules();
    isNativePlatform.mockReturnValue(true);
    setData.mockReset();
    getSecureData.mockReset();
    deleteData.mockReset();
  });

  it("stores the refresh token with BIOMETRY_CURRENT_SET", async () => {
    setData.mockResolvedValue(undefined);
    const { saveBiometricCredential } = await import("./biometric-credential-store.js");
    await saveBiometricCredential({ driverId: "drv_1", refreshToken: "rt_abc" });
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "veyvio.driver.biometric.refresh.drv_1",
        value: "rt_abc",
        accessControl: 1,
      }),
    );
  });

  it("returns null when secure read fails", async () => {
    getSecureData.mockRejectedValue(new Error("user cancel"));
    const { getBiometricCredential } = await import("./biometric-credential-store.js");
    await expect(getBiometricCredential("drv_1")).resolves.toBeNull();
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
