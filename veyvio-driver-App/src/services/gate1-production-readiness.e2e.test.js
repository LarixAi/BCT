import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  externalizeWalkaroundPayloadMedia,
  hydrateWalkaroundPayloadMedia,
  releaseWalkaroundPayloadMedia,
} from "@/lib/walkaround-media-outbox";
import {
  clearMessageDraft,
  loadMessageDraft,
  saveMessageDraft,
} from "@/lib/driver-sensitive-storage";
import { canSignOnForDuty, getDutySignOnBlockers } from "@/lib/driver-sign-on-gate";
import { isPhvModuleEnabled } from "@/lib/phv-module-enabled";
import { describeOfflineQueue } from "@/services/driver-sync-status.service";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";

describe("gate1 production readiness e2e", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = value;
      },
      removeItem(key) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps PHV/Base44 module disabled by default", () => {
    expect(isPhvModuleEnabled()).toBe(false);
  });

  it("blocks sign-on when bootstrap eligibility or vehicle check fails", () => {
    const blockers = getDutySignOnBlockers({
      bootstrap: { eligibility: { allowed: false, blockers: ["Licence expired"] } },
      duty: { vehicleCheck: { canStartDuty: false, status: "not_started" } },
    });
    expect(blockers.length).toBeGreaterThan(0);
    expect(canSignOnForDuty({ bootstrap: { eligibility: { allowed: true, blockers: [] } }, duty: {} })).toBe(
      true,
    );
  });

  it("externalizes walkaround photos into media refs for offline queue", async () => {
    const payload = {
      driver: { id: "drv-1" },
      vehicle: { id: "veh-1" },
      odometerPhotoDataUrl: "data:image/jpeg;base64,Ym9keQ==",
      driverSignatureDataUrl: "data:image/png;base64,c2ln",
      answers: {
        tyres: { status: "fail", photoDataUrl: "data:image/jpeg;base64,dHlyZQ==" },
      },
    };

    const externalized = await externalizeWalkaroundPayloadMedia(payload, {
      companyId: "co-a",
      membershipId: "mem-1",
    });

    expect(externalized.odometerPhotoDataUrl).toBeUndefined();
    expect(externalized.odometerPhotoMediaRef).toBeTruthy();
    expect(externalized.answers.tyres.photoDataUrl).toBeUndefined();
    expect(externalized.answers.tyres.photoMediaRef).toBeTruthy();

    const hydrated = await hydrateWalkaroundPayloadMedia(externalized, {
      companyId: "co-a",
      membershipId: "mem-1",
    });
    expect(hydrated.odometerPhotoDataUrl).toContain("data:image/jpeg;base64,");
    expect(hydrated.answers.tyres.photoDataUrl).toContain("data:image/jpeg;base64,");

    await releaseWalkaroundPayloadMedia(externalized);
  });

  it("stores message drafts in workspace IndexedDB, not localStorage keys", async () => {
    await saveMessageDraft("co-a", "mem-1", {
      subject: "Need help",
      message: "Passenger issue on route 12",
      audience: "dispatch",
    });
    const draft = await loadMessageDraft("co-a", "mem-1");
    expect(draft?.subject).toBe("Need help");
    expect(Object.keys(localStorage.store).some((key) => key.includes("Passenger"))).toBe(false);
    await clearMessageDraft("co-a", "mem-1");
    expect(await loadMessageDraft("co-a", "mem-1")).toBeNull();
  });

  it("counts defects, incidents, and messages in the offline queue summary", async () => {
    await enqueueOpsCommand("drv-1", { type: "defect", payload: {} }, "co-a", "mem-1");
    await enqueueOpsCommand("drv-1", { type: "incident", payload: {} }, "co-a", "mem-1");
    await enqueueOpsCommand(
      "drv-1",
      { type: "message_reply", payload: { conversationId: "t1", body: "ok" } },
      "co-a",
      "mem-1",
    );

    const summary = await describeOfflineQueue("drv-1", "co-a", "mem-1");
    expect(summary.opsCommands).toBe(3);
    expect(summary.defects).toBe(1);
    expect(summary.incidents).toBe(1);
  });

  it("surfaces walkaround sign-on rejection without implying duty is active", () => {
    const result = {
      result: "passed",
      queued: false,
      checkId: "chk-1",
      signOnBlocked: true,
      signOnMessage: "Licence expired — contact dispatch",
    };
    expect(result.signOnBlocked).toBe(true);
    expect(result.autoSignedOn).toBeUndefined();
    expect(result.signOnMessage).toContain("Licence");
  });

  it("keeps Base44 vite plugin off unless VITE_ENABLE_BASE44 is true", async () => {
    const { readFile } = await import("node:fs/promises");
    const configSource = await readFile(new URL("../../vite.config.js", import.meta.url), "utf8");
    expect(configSource).toContain("enableBase44");
    expect(configSource).toContain("VITE_ENABLE_BASE44");
    expect(configSource).toContain("useLegacyBase44");
    expect(configSource).toContain("base44Client.stub.js");
    expect(configSource).toContain("base44-sdk.stub.js");
    expect(process.env.VITE_ENABLE_BASE44).not.toBe("true");
  });

  it("fail-closed Base44 stub throws when legacy PHV paths are touched", async () => {
    const { base44 } = await import("@/api/base44Client.stub.js");
    expect(() => base44.entities.Driver.list()).toThrow(/PHV\/Base44 path/);
    expect(() => base44.auth.me()).toThrow(/PHV\/Base44 path/);
  });

  it("does not mirror yard parking platform events into localStorage", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("./yard-parking.service.js", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("veyvio.ops.platform.events.yard.v1");
    expect(source).not.toContain("localStorage.setItem");
  });
});
