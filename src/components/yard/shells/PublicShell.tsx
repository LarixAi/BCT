import type { ReactNode } from "react";

/** Public routes render their own auth shell (driver-style white layout). */
export function PublicShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
