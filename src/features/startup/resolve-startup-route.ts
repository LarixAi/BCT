import type { SessionState } from "@/types/auth";
import type { TenancyContext } from "@/types/tenancy";
import { isOnline } from "@/platform/device/connectivity";

export type StartupRoute =
  | "/welcome/1"
  | "/sign-in"
  | "/mfa"
  | "/company-select"
  | "/depot-select"
  | "/initial-sync"
  | "/update-required"
  | "/offline-startup"
  | "/account-restricted"
  | "/biometric-unlock"
  | "/";

export interface StartupContext {
  session: SessionState;
  tenancy: TenancyContext & { role: string | null };
  mandatoryUpdateRequired?: boolean;
  permissionsGranted?: boolean;
  offlineCacheAvailable?: boolean;
}

export function resolveStartupRoute(ctx: StartupContext): StartupRoute {
  if (ctx.mandatoryUpdateRequired) return "/update-required";
  if (ctx.session.status === "suspended") return "/account-restricted";

  const sessionValid =
    ctx.session.status === "authenticated" &&
    !!ctx.session.accessToken &&
    !!ctx.session.expiresAt &&
    new Date(ctx.session.expiresAt).getTime() > Date.now();

  if (!sessionValid) {
    return ctx.session.hasSeenWelcome ? "/sign-in" : "/welcome/1";
  }

  if (!ctx.session.mfaVerified) return "/mfa";

  if (ctx.session.biometricEnabled && ctx.session.trustedDevice && !ctx.session.biometricUnlockedThisSession) {
    return "/biometric-unlock";
  }

  if (!ctx.tenancy.companyId) return "/company-select";
  if (!ctx.tenancy.depotId) return "/depot-select";

  if (ctx.permissionsGranted === false) return "/welcome/1";

  if (!ctx.session.bootstrapComplete) {
    if (!isOnline() && ctx.offlineCacheAvailable) return "/offline-startup";
    return "/initial-sync";
  }

  if (!isOnline() && ctx.offlineCacheAvailable) return "/offline-startup";

  return "/";
}
