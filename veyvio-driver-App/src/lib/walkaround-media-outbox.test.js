import { describe, expect, it } from "vitest";
import { OfflineContextError } from "@/lib/driver-workspace-storage";
import {
  MEDIA_DB_NAME,
  MEDIA_DB_VERSION,
  closeWalkaroundMediaConnection,
  loadWalkaroundMediaDataUrl,
  persistWalkaroundMediaDataUrl,
} from "@/lib/walkaround-media-outbox";

function openNamed(name, version, { createMedia = false } = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      if (createMedia && !request.result.objectStoreNames.contains("media")) {
        request.result.createObjectStore("media");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("walkaround-media-outbox durability", () => {
  it("persists required evidence in IndexedDB and reloads after a simulated restart", async () => {
    const dataUrl = "data:image/jpeg;base64,Ym9keQ==";
    const id = await persistWalkaroundMediaDataUrl({
      dataUrl,
      companyId: "co-a",
      membershipId: "mem-1",
      kind: "odometer",
    });
    expect(id).toContain("driver:co-a:mem-1:media:");
    closeWalkaroundMediaConnection();
    expect(await loadWalkaroundMediaDataUrl(id, { companyId: "co-a", membershipId: "mem-1" })).toBe(dataUrl);
  });

  it("creates the media store on a fresh database", async () => {
    const id = await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,Zm9v",
      companyId: "co-a",
      membershipId: "mem-1",
      kind: "odometer",
    });
    closeWalkaroundMediaConnection();
    const db = await openNamed(MEDIA_DB_NAME, MEDIA_DB_VERSION);
    expect(db.version).toBe(2);
    expect(db.objectStoreNames.contains("media")).toBe(true);
    db.close();
    expect(id).toBeTruthy();
  });

  it("upgrades a v1 database with zero stores to v2 and creates media", async () => {
    const emptyV1 = await openNamed(MEDIA_DB_NAME, 1, { createMedia: false });
    expect(emptyV1.version).toBe(1);
    expect(emptyV1.objectStoreNames.contains("media")).toBe(false);
    emptyV1.close();
    closeWalkaroundMediaConnection();

    const id = await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,YmFy",
      companyId: "co-a",
      membershipId: "mem-1",
      kind: "signature",
    });
    expect(id).toBeTruthy();
    closeWalkaroundMediaConnection();
    const upgraded = await openNamed(MEDIA_DB_NAME, MEDIA_DB_VERSION);
    expect(upgraded.version).toBe(2);
    expect(upgraded.objectStoreNames.contains("media")).toBe(true);
    upgraded.close();
  });

  it("preserves existing v1 media records across the v2 upgrade", async () => {
    const v1 = await openNamed(MEDIA_DB_NAME, 1, { createMedia: true });
    await new Promise((resolve, reject) => {
      const tx = v1.transaction("media", "readwrite");
      tx.objectStore("media").put(
        {
          id: "driver:co-a:mem-1:media:keep-me",
          companyId: "co-a",
          membershipId: "mem-1",
          kind: "odometer",
          blobBytes: [1, 2, 3],
          mimeType: "image/jpeg",
        },
        "driver:co-a:mem-1:media:keep-me",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    v1.close();
    closeWalkaroundMediaConnection();

    await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,bmV3",
      companyId: "co-a",
      membershipId: "mem-1",
      kind: "signature",
    });
    const kept = await loadWalkaroundMediaDataUrl("driver:co-a:mem-1:media:keep-me", {
      companyId: "co-a",
      membershipId: "mem-1",
    });
    expect(kept).toMatch(/^data:image\/jpeg/);
  });

  it("refuses to persist required evidence without tenant context", async () => {
    await expect(
      persistWalkaroundMediaDataUrl({
        dataUrl: "data:image/jpeg;base64,Ym9keQ==",
        companyId: null,
        membershipId: "mem-1",
        kind: "photo",
      }),
    ).rejects.toBeInstanceOf(OfflineContextError);
  });

  it("fails closed when a current-version database has no media store", async () => {
    const empty = await openNamed(MEDIA_DB_NAME, MEDIA_DB_VERSION, { createMedia: false });
    expect(empty.objectStoreNames.contains("media")).toBe(false);
    empty.close();
    closeWalkaroundMediaConnection();
    await expect(
      persistWalkaroundMediaDataUrl({
        dataUrl: "data:image/jpeg;base64,Ym9keQ==",
        companyId: "co-a",
        membershipId: "mem-1",
        kind: "odometer",
      }),
    ).rejects.toMatchObject({ name: "DurableStorageError", code: "OFFLINE_STORAGE_SCHEMA_INVALID" });
  });
});
