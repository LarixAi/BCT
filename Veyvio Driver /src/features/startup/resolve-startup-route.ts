import type { SessionState } from "@/types/auth";
import type { TenancyContext } from "@/types/tenancy";
import { isOnline } from "@/platform/device/connectivity";

export type StartupRoute =
  | "/sign-in"
  | "/mfa"
  | "/company-select"
  | "/depot-select"
  | "/initial-sync"
  | "/biometric-unlock"
  | "/";

export interface StartupContext {
  session: SessionState;
  tenancy: TenancyContext;
  offlineCacheAvailable?: boolean;
}

export function resolveStartupRoute(ctx: StartupContext): StartupRoute {
  const sessionValid =
    ctx.session.status === "authenticated" &&
    !!ctx.session.accessToken &&
    !!ctx.session.expiresAt &&
    new Date(ctx.session.expiresAt).getTime() > Date.now();

  if (!sessionValid) return "/sign-in";
  if (!ctx.session.mfaVerified) return "/mfa";
  if (!ctx.tenancy.companyId) return "/company-select";
  if (!ctx.tenancy.depotId) return "/depot-select";

  if (!ctx.session.bootstrapComplete) {
    if (!isOnline() && ctx.offlineCacheAvailable) return "/";
    return "/initial-sync";
  }

  if (ctx.session.biometricEnabled && !ctx.session.biometricUnlockedThisSession) {
    return "/biometric-unlock";
  }

  return "/";
}
