import { create } from "zustand";
import type { YardPermission } from "@/types/permissions";

interface PermissionStore {
  permissions: YardPermission[];
  setPermissions: (permissions: YardPermission[]) => void;
  can: (permission: YardPermission) => boolean;
  reset: () => void;
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  permissions: [],

  setPermissions: (permissions) => set({ permissions }),

  can: (permission) => get().permissions.includes(permission),

  reset: () => set({ permissions: [] }),
}));
