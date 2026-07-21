import { getSupabaseClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth-errors";
import { getDriverSessionContext } from "@/services/session.service";
import { unlockStoredRefreshToken, invalidateBiometricAccess } from "./biometric-enrollment.js";
import { markBiometricUnlocked } from "./biometric-lock-state.js";
import { rememberLastBiometricDriverId } from "./biometric-session.js";
import { saveBiometricCredential } from "./biometric-credential-store.js";

/**
 * Signed-out recovery: unlock the protected refresh token and rebuild a server session.
 * Eligibility (suspended, revoked, etc.) is still enforced by Command on session load.
 * @param {string} driverId
 */
export async function signInDriverWithBiometrics(driverId) {
  if (!driverId) {
    return { ok: false, message: "Biometric sign-in must be set up again." };
  }

  let refreshToken;
  try {
    refreshToken = await unlockStoredRefreshToken(driverId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Biometric sign-in failed.";
    return { ok: false, message };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    await invalidateBiometricAccess(driverId).catch(() => undefined);
    return {
      ok: false,
      message: formatAuthError(error?.message ?? "Your saved session expired. Sign in with your password."),
    };
  }

  if (data.session.refresh_token) {
    await saveBiometricCredential({
      driverId,
      refreshToken: data.session.refresh_token,
    }).catch(() => undefined);
  }

  const context = await getDriverSessionContext();
  if (context?.routeTarget === "session_error" || context?.routeTarget === "not_driver" || !context?.driver) {
    await supabase.auth.signOut().catch(() => undefined);
    await invalidateBiometricAccess(driverId).catch(() => undefined);
    return {
      ok: false,
      message:
        context?.linkError ??
        "This account can no longer sign in. Ask your transport manager if you need access.",
    };
  }

  rememberLastBiometricDriverId(driverId);
  markBiometricUnlocked();
  return { ok: true, context };
}
