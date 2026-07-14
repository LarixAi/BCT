import type { ReactNode } from "react";
import type { YardPermission } from "@/types/permissions";
import { useCan } from "@/platform/permissions/use-can";

interface PermissionGateProps {
  permission: YardPermission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const allowed = useCan(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
