import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Company, Depot, TenancyContext } from "@/types/tenancy";
import type { YardRole } from "@/types/permissions";
import { clearOutboxMutations } from "@/platform/storage/local-db";
import { useSyncStore } from "@/platform/sync/outbox";
import { clearYardState } from "@/platform/yard/clear-yard-state";

interface TenancyStore extends TenancyContext {
  selectCompany: (company: Company, role: YardRole) => void;
  selectDepot: (depot: Depot) => void;
  clearDepot: () => void;
  clearContext: () => void;
  isContextComplete: () => boolean;
}

const EMPTY: TenancyContext = {
  companyId: null,
  companyName: null,
  depotId: null,
  depotName: null,
  depotCode: null,
  role: null,
};

export const useTenancyStore = create<TenancyStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      selectCompany: (company, role) => {
        const previousCompanyId = get().companyId;
        if (previousCompanyId && previousCompanyId !== company.id) {
          clearYardState();
          void clearOutboxMutations().then(() => useSyncStore.getState().hydrate());
        }
        set({
          companyId: company.id,
          companyName: company.name,
          role,
          depotId: null,
          depotName: null,
          depotCode: null,
        });
      },

      selectDepot: (depot) => {
        const previousDepotId = get().depotId;
        if (previousDepotId && previousDepotId !== depot.id) {
          clearYardState();
        }
        set({
          depotId: depot.id,
          depotName: depot.name,
          depotCode: depot.code,
        });
      },

      clearDepot: () =>
        set({
          depotId: null,
          depotName: null,
          depotCode: null,
        }),

      clearContext: () => {
        clearYardState();
        void clearOutboxMutations().then(() => useSyncStore.getState().hydrate());
        set({ ...EMPTY });
      },

      isContextComplete: () => {
        const s = get();
        return !!(s.companyId && s.depotId && s.role);
      },
    }),
    {
      name: "veyvio-yard-tenancy-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getTenancySnapshot(): TenancyContext & { role: string | null } {
  return useTenancyStore.getState();
}
