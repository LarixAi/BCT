import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { DEFAULT_MOCK_ROLE, MOCK_COMPANIES, MOCK_DEPOTS } from "@/data/mocks/tenancy";
import { applyBootstrapToYard } from "@/platform/yard/hydrate-yard-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";

let seeded = false;

function isDevBypassEnabled(): boolean {
  if (import.meta.env.PROD) return false;
  return import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
}

/** Ensure BCT company/depot are selected for VITE_DEV_BYPASS_AUTH (beforeLoad). */
export function ensureDevBypassTenancy(): void {
  if (!isDevBypassEnabled()) return;
  const company = MOCK_COMPANIES.find(c => c.id === "co_bct");
  const depot = MOCK_DEPOTS.find(d => d.id === "dep_bct_main");
  if (!company || !depot) return;
  const tenancy = useTenancyStore.getState();
  if (tenancy.depotId === depot.id) return;
  tenancy.selectCompany(company, DEFAULT_MOCK_ROLE);
  tenancy.selectDepot(depot);
}

/** Synchronous BCT demo seed for VITE_DEV_BYPASS_AUTH (E2E + local dev only). */
export function ensureDevBypassBootstrap(): void {
  if (!isDevBypassEnabled()) return;
  if (typeof window === "undefined") return;
  if (seeded) return;
  seeded = true;

  ensureDevBypassTenancy();
  const company = MOCK_COMPANIES.find(c => c.id === "co_bct");
  const depot = MOCK_DEPOTS.find(d => d.id === "dep_bct_main");
  if (!company || !depot) return;

  applyBootstrapToYard(buildBootstrapPayload(company.id, depot.id, DEFAULT_MOCK_ROLE));
}
