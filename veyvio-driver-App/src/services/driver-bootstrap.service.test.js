import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const commandDriverBootstrap = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: { getSession },
  }),
}));

vi.mock("@/lib/command-api", () => ({
  commandDriverBootstrap: (...args) => commandDriverBootstrap(...args),
}));

describe("loadDriverBootstrap cache", () => {
  beforeEach(async () => {
    vi.resetModules();
    getSession.mockReset();
    commandDriverBootstrap.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    commandDriverBootstrap.mockResolvedValue({
      ok: true,
      bootstrap: { identity: { driverId: "d1" }, duties: [{ id: "duty-1" }] },
    });
  });

  it("dedupes concurrent callers and serves a short TTL cache", async () => {
    const mod = await import("@/services/driver-bootstrap.service");
    mod.invalidateDriverBootstrapCache();

    const [a, b] = await Promise.all([
      mod.loadDriverBootstrap({ depotId: "depot-1" }),
      mod.loadDriverBootstrap({ depotId: "depot-1" }),
    ]);

    expect(commandDriverBootstrap).toHaveBeenCalledTimes(1);
    expect(a.ok).toBe(true);
    expect(b.bootstrap?.duties?.[0]?.id).toBe("duty-1");

    const cached = await mod.loadDriverBootstrap({ depotId: "depot-2" });
    expect(commandDriverBootstrap).toHaveBeenCalledTimes(1);
    expect(cached.bootstrap?.duties?.[0]?.id).toBe("duty-1");

    const forced = await mod.loadDriverBootstrap({ depotId: "depot-2", force: true });
    expect(commandDriverBootstrap).toHaveBeenCalledTimes(2);
    expect(forced.ok).toBe(true);
  });

  it("seeds cache from an existing session bootstrap", async () => {
    const mod = await import("@/services/driver-bootstrap.service");
    mod.invalidateDriverBootstrapCache();
    mod.seedDriverBootstrapCache({ identity: { driverId: "seeded" }, duties: [] }, "depot-9");

    const result = await mod.loadDriverBootstrap({ depotId: "depot-9" });
    expect(commandDriverBootstrap).not.toHaveBeenCalled();
    expect(result.bootstrap?.identity?.driverId).toBe("seeded");
  });
});
