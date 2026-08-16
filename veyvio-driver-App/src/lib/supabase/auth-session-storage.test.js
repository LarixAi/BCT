import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
}));

vi.mock("@capgo/capacitor-native-biometric", () => ({
  AccessControl: { NONE: 0, BIOMETRY_ANY: 1 },
  NativeBiometric: {
    getData: vi.fn(),
    setData: vi.fn(),
    deleteData: vi.fn(),
  },
}));

import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import {
  __resetDriverAuthSessionMemoryForTests,
  clearDriverAuthSessionStorage,
  custodyMode,
  driverAuthSessionStorage,
  isNativeDriverAuthCustody,
} from "./auth-session-storage.js";

describe("driver auth session storage (Wave 3E-2)", () => {
  beforeEach(() => {
    __resetDriverAuthSessionMemoryForTests();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(String(key), String(value));
      },
      removeItem: (key) => {
        store.delete(String(key));
      },
      clear: () => store.clear(),
      key: (index) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    });
    vi.mocked(NativeBiometric.getData).mockReset();
    vi.mocked(NativeBiometric.setData).mockReset();
    vi.mocked(NativeBiometric.deleteData).mockReset();
  });

  it("uses browser_dev_fallback when not native", () => {
    expect(isNativeDriverAuthCustody()).toBe(false);
    expect(custodyMode()).toBe("browser_dev_fallback");
  });

  it("persists to localStorage only on browser fallback", async () => {
    await driverAuthSessionStorage.setItem("sb-test-auth-token", '{"access_token":"a"}');
    expect(localStorage.getItem("sb-test-auth-token")).toContain("access_token");
    expect(NativeBiometric.setData).not.toHaveBeenCalled();
  });

  it("on native writes Keystore and strips localStorage copies", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    localStorage.setItem("sb-test-auth-token", "legacy");
    vi.mocked(NativeBiometric.setData).mockResolvedValue(undefined);

    await driverAuthSessionStorage.setItem("sb-test-auth-token", '{"access_token":"native"}');

    expect(NativeBiometric.setData).toHaveBeenCalled();
    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  it("migrates legacy localStorage into native on first read", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    localStorage.setItem("sb-proj-auth-token", '{"access_token":"migrated"}');
    vi.mocked(NativeBiometric.setData).mockResolvedValue(undefined);
    vi.mocked(NativeBiometric.getData).mockRejectedValue(new Error("missing"));

    const value = await driverAuthSessionStorage.getItem("sb-proj-auth-token");
    expect(value).toContain("migrated");
    expect(NativeBiometric.setData).toHaveBeenCalled();
    expect(localStorage.getItem("sb-proj-auth-token")).toBeNull();
  });

  it("clearDriverAuthSessionStorage removes legacy web keys", async () => {
    localStorage.setItem("sb-abc-auth-token", "x");
    localStorage.setItem("unrelated", "keep");
    await clearDriverAuthSessionStorage("sb-abc-auth-token");
    expect(localStorage.getItem("sb-abc-auth-token")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});
