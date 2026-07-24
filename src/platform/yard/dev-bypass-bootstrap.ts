import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { DEFAULT_MOCK_ROLE, MOCK_COMPANIES, MOCK_DEPOTS } from "@/data/mocks/tenancy";
import { applyBootstrapToYard } from "@/platform/yard/hydrate-yard-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";

let seeded = false;

/** Synchronous BCT demo seed for VITE_DEV_BYPASS_AUTH (E2E + local dev). */
export function ensureDevBypassBootstrap(): void {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH !== "true") return;
  if (typeof window === "undefined") return;
  if (seeded) return;
  seeded = true;

  const company = MOCK_COMPANIES.find(c => c.id === "co_bct");
  const depot = MOCK_DEPOTS.find(d => d.id === "dep_bct_main");
  if (!company || !depot) return;

  const tenancy = useTenancyStore.getState();
  if (tenancy.depotId !== depot.id) {
    tenancy.selectCompany(company, DEFAULT_MOCK_ROLE);
    tenancy.selectDepot(depot);
  }

  applyBootstrapToYard(buildBootstrapPayload(company.id, depot.id, DEFAULT_MOCK_ROLE));
}
