import { describe, expect, it } from "vitest";
import { OfflineContextError } from "@/lib/driver-workspace-storage";
import {
  loadWalkaroundMediaDataUrl,
  persistWalkaroundMediaDataUrl,
} from "@/lib/walkaround-media-outbox";

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
    expect(await loadWalkaroundMediaDataUrl(id)).toBe(dataUrl);
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
});
