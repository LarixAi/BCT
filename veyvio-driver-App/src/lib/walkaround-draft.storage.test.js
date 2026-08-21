import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWalkaroundDraft,
  draftStorageKey,
  loadWalkaroundDraft,
  saveWalkaroundDraft,
} from "@/lib/walkaround-draft.storage";

function installMemoryLocalStorage() {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: (key) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    },
  });
  return store;
}

describe("walkaround draft save honesty", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only reports saved after write-readback matches what was written", () => {
    const result = saveWalkaroundDraft("drv-1", "veh-1", {
      odometer: "48350",
      answers: { mirrors: { status: "pass" } },
      currentIndex: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.draft.odometer).toBe("48350");
    expect(result.draft.syncStatus).toBe("local");
    expect(result.draft.savedAt).toEqual(expect.any(String));

    const loaded = loadWalkaroundDraft("drv-1", "veh-1");
    expect(loaded.odometer).toBe("48350");
    expect(loaded.answers.mirrors.status).toBe("pass");
    expect(localStorage.getItem(draftStorageKey("drv-1", "veh-1"))).toContain("48350");
  });

  it("does not claim saved when localStorage setItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    });
    const result = saveWalkaroundDraft("drv-1", "veh-1", { odometer: "1" });
    expect(result).toMatchObject({
      ok: false,
      code: "DRAFT_SAVE_FAILED",
    });
    expect(result.message).toMatch(/could not be saved/i);
  });

  it("does not claim saved when readback does not match the write", () => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key) => {
        // Corrupt / drop the payload so readback fails.
        store.set(key, '{"odometer":"tampered"}');
      },
      removeItem: (key) => {
        store.delete(key);
      },
    });
    const result = saveWalkaroundDraft("drv-1", "veh-1", { odometer: "48350" });
    expect(result).toMatchObject({
      ok: false,
      code: "DRAFT_SAVE_VERIFY_FAILED",
    });
    expect(result.message).toMatch(/could not be verified/i);
  });

  it("only reports discarded after the draft key is verified gone", () => {
    expect(saveWalkaroundDraft("drv-1", "veh-1", { odometer: "10" }).ok).toBe(true);
    const cleared = clearWalkaroundDraft("drv-1", "veh-1");
    expect(cleared.ok).toBe(true);
    expect(loadWalkaroundDraft("drv-1", "veh-1")).toBeNull();
  });

  it("does not claim discarded when remove fails verification", () => {
    const store = new Map([[draftStorageKey("drv-1", "veh-1"), '{"odometer":"10"}']]);
    vi.stubGlobal("localStorage", {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value);
      },
      removeItem: () => {
        // Pretend remove succeeded but leave the key.
      },
    });
    const cleared = clearWalkaroundDraft("drv-1", "veh-1");
    expect(cleared).toMatchObject({
      ok: false,
      code: "DRAFT_CLEAR_VERIFY_FAILED",
    });
    expect(cleared.message).toMatch(/could not be discarded/i);
  });
});
