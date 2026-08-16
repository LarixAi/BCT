import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIA_DB_NAME, MEDIA_DB_VERSION, closeWalkaroundMediaConnection } from "@/lib/walkaround-media-outbox";
import { loadSyncQueue } from "@/lib/walkaround-sync.storage";
import {
  hasRequiredFailPhotoEvidence,
  shouldUploadWalkaroundPhotoNow,
  submitWalkaroundCheck,
  uploadWalkaroundPhoto,
} from "@/services/vehicle-check.service";

const storageUpload = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: (...args) => storageUpload(...args),
      }),
    },
  }),
}));

function baseInput(overrides = {}) {
  return {
    driver: { id: "drv-1", organisation_id: "co-a", membership_id: "mem-1" },
    vehicle: { id: "veh-1", registration: "YX25 VEY" },
    job: { id: "duty-1" },
    profile: {},
    checklist: {
      items: [
        {
          id: "mirrors",
          sectionKey: "cab",
          category: "visibility",
          questionTitle: "Mirrors",
          defaultSeverity: "major",
          autoBlockOnFail: false,
          requiresPhotoOnFail: false,
        },
      ],
    },
    answers: { mirrors: { status: "pass" } },
    checkType: "daily_walkaround",
    odometerReading: 45231,
    odometerPhotoDataUrl: "data:image/jpeg;base64,b2Rv",
    fuelLevel: "3/4",
    vehicleConfirmed: true,
    declarationSigned: true,
    additionalDefectNote: "",
    gps: null,
    startedAt: new Date().toISOString(),
    driverSignatureDataUrl: "data:image/png;base64,c2ln",
    session: { membershipId: "mem-1", activeCompanyId: "co-a", companyId: "co-a" },
    ...overrides,
  };
}

describe("offline walkaround submit", () => {
  beforeEach(() => {
    storageUpload.mockClear();
    vi.stubGlobal("navigator", { onLine: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not contact Supabase Storage before durable persistence while offline", async () => {
    const result = await submitWalkaroundCheck(baseInput());
    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
    expect(storageUpload).not.toHaveBeenCalled();
    expect(shouldUploadWalkaroundPhotoNow()).toBe(false);
    const queue = await loadSyncQueue("drv-1", "co-a", "mem-1");
    expect(queue).toHaveLength(1);
    expect(queue[0].idempotencyKey).toBeTruthy();
    expect(queue[0].payload.clientCheckId).toBe(queue[0].idempotencyKey);
    expect(queue[0].id).toBe(queue[0].idempotencyKey);
    expect(queue[0].payload.odometerPhotoMediaRef).toBeTruthy();
    expect(queue[0].payload.driverSignatureMediaRef).toBeTruthy();
  });

  it("returns ok:false / queued:false when durable media persistence fails", async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    closeWalkaroundMediaConnection();
    const result = await submitWalkaroundCheck(baseInput());
    expect(result.ok).toBe(false);
    expect(result.queued).toBe(false);
    expect(result.message).toMatch(/could not be saved/i);
  });

  it("queues an offline required fail photo from local evidence without a remote photoPath", async () => {
    expect(
      hasRequiredFailPhotoEvidence(
        { photoPath: null, photoDataUrl: "data:image/jpeg;base64,ZmFpbA==" },
        { photoDataUrl: "data:image/jpeg;base64,ZmFpbA==" },
      ),
    ).toBe(true);

    const result = await submitWalkaroundCheck(
      baseInput({
        checklist: {
          items: [
            {
              id: "tyres",
              sectionKey: "outside",
              category: "tyres",
              questionTitle: "Tyres",
              defaultSeverity: "critical",
              autoBlockOnFail: true,
              requiresPhotoOnFail: true,
            },
          ],
        },
        answers: {
          tyres: {
            status: "fail",
            note: "Offside front bald",
            photoPath: null,
            photoDataUrl: "data:image/jpeg;base64,ZmFpbA==",
          },
        },
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
    expect(storageUpload).not.toHaveBeenCalled();
    const queue = await loadSyncQueue("drv-1", "co-a", "mem-1");
    const item = queue.find((row) => row.payload?.answers?.tyres);
    expect(item.payload.answers.tyres.photoMediaRef).toBeTruthy();
    expect(item.payload.answers.tyres.photoPath).toBeFalsy();
  });
});

describe("online walkaround photo upload gate", () => {
  it("still allows remote upload when the device is online", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(shouldUploadWalkaroundPhotoNow()).toBe(true);
    await uploadWalkaroundPhoto({
      driver: { organisationId: "co-a", id: "drv-1" },
      vehicleId: "veh-1",
      itemId: "odometer",
      file: { name: "odo.jpg", type: "image/jpeg", arrayBuffer: async () => new Uint8Array([1, 2]).buffer },
    });
    expect(storageUpload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

