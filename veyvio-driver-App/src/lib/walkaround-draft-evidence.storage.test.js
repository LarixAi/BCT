import { describe, expect, it } from "vitest";
import {
  clearWalkaroundDraftEvidence,
  closeWalkaroundDraftEvidenceConnection,
  loadWalkaroundDraftEvidence,
  saveWalkaroundDraftEvidence,
} from "@/lib/walkaround-draft-evidence.storage";

const SCOPE = {
  companyId: "co-a",
  membershipId: "mem-1",
  driverId: "drv-1",
  vehicleId: "veh-1",
};

describe("walkaround draft evidence (pre-Submit)", () => {
  it("only reports saved after write-readback matches and survives a simulated restart", async () => {
    const odo = "data:image/jpeg;base64,b2Rv";
    const sig = "data:image/png;base64,c2ln";
    const saved = await saveWalkaroundDraftEvidence({
      ...SCOPE,
      odometerPhotoDataUrl: odo,
      signatureDataUrl: sig,
    });
    expect(saved.ok).toBe(true);
    expect(saved.evidence.odometerPhotoDataUrl).toBe(odo);
    expect(saved.evidence.signatureDataUrl).toBe(sig);

    closeWalkaroundDraftEvidenceConnection();

    const loaded = await loadWalkaroundDraftEvidence(SCOPE);
    expect(loaded.odometerPhotoDataUrl).toBe(odo);
    expect(loaded.signatureDataUrl).toBe(sig);
  });

  it("merges field patches without wiping the other evidence field", async () => {
    expect(
      (
        await saveWalkaroundDraftEvidence({
          ...SCOPE,
          odometerPhotoDataUrl: "data:image/jpeg;base64,b2Rv",
        })
      ).ok,
    ).toBe(true);

    const withSig = await saveWalkaroundDraftEvidence({
      ...SCOPE,
      signatureDataUrl: "data:image/png;base64,c2ln",
    });
    expect(withSig.ok).toBe(true);
    expect(withSig.evidence.odometerPhotoDataUrl).toBe("data:image/jpeg;base64,b2Rv");
    expect(withSig.evidence.signatureDataUrl).toBe("data:image/png;base64,c2ln");
  });

  it("does not claim saved without company/membership context", async () => {
    const result = await saveWalkaroundDraftEvidence({
      companyId: null,
      membershipId: "mem-1",
      driverId: "drv-1",
      vehicleId: "veh-1",
      odometerPhotoDataUrl: "data:image/jpeg;base64,b2Rv",
    });
    expect(result).toMatchObject({
      ok: false,
      code: "OFFLINE_CONTEXT_NOT_READY",
    });
  });

  it("only reports discarded after the evidence key is verified gone", async () => {
    expect(
      (
        await saveWalkaroundDraftEvidence({
          ...SCOPE,
          odometerPhotoDataUrl: "data:image/jpeg;base64,b2Rv",
        })
      ).ok,
    ).toBe(true);
    const cleared = await clearWalkaroundDraftEvidence(SCOPE);
    expect(cleared.ok).toBe(true);
    expect(await loadWalkaroundDraftEvidence(SCOPE)).toBeNull();
  });

  it("clears a single field without claiming the other was removed", async () => {
    await saveWalkaroundDraftEvidence({
      ...SCOPE,
      odometerPhotoDataUrl: "data:image/jpeg;base64,b2Rv",
      signatureDataUrl: "data:image/png;base64,c2ln",
    });
    const clearedPhoto = await saveWalkaroundDraftEvidence({
      ...SCOPE,
      odometerPhotoDataUrl: null,
    });
    expect(clearedPhoto.ok).toBe(true);
    expect(clearedPhoto.evidence.odometerPhotoDataUrl).toBeNull();
    expect(clearedPhoto.evidence.signatureDataUrl).toBe("data:image/png;base64,c2ln");
  });
});
