import { isMockAuth } from "@/platform/auth/auth-config";
import { useSessionStore } from "@/platform/auth/session-store";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { clearYardState } from "@/platform/yard/clear-yard-state";

/** Leave the current company and depot; refresh invited companies for the picker. */
export async function beginCompanySwitch(): Promise<void> {
  clearYardState();
  useTenancyStore.getState().clearContext();
  usePermissionStore.getState().reset();
  await useSessionStore.getState().prepareCompanySwitch();
}

/** Leave the current depot while keeping the same company. */
export function beginDepotSwitch(): void {
  clearYardState();
  useTenancyStore.getState().clearDepot();
  useSessionStore.setState({ bootstrapComplete: false });
}
