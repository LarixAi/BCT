import {
  canInviteDriver,
  canManageDriverAccess,
  canOffboardDriver,
  canSuspendDriver,
  canUnlockDriver,
} from '@/lib/drivers/permissions'

export function useDriverAccessPermissions(permissions: string[]) {
  return {
    canInvite: canInviteDriver(permissions) || canManageDriverAccess(permissions),
    canManage: canManageDriverAccess(permissions),
    canSuspend: canSuspendDriver(permissions),
    canUnlock: canUnlockDriver(permissions),
    canOffboard: canOffboardDriver(permissions),
  }
}

export type DriverAccessPermissions = ReturnType<typeof useDriverAccessPermissions>
