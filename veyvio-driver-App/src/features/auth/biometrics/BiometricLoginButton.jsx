import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Fingerprint, ScanFace } from "lucide-react";
import { checkBiometricAvailability } from "./biometric-service.js";
import { findEnabledBiometricEnrollment } from "./biometric-preference.js";
import { reconcileBiometricEnrollment } from "./biometric-enrollment.js";
import { getLastBiometricDriverId, rememberLastBiometricDriverId } from "./biometric-session.js";

/**
 * Resolve whether this phone can offer biometric sign-in.
 * Requires a prior Veyvio enrollment on this device (native Capacitor only).
 * Broken / incomplete enrollments are cleared silently so we don't show a dead CTA.
 * @returns {Promise<{ driverId: string, label: string } | null>}
 */
export async function resolveBiometricLoginOffer() {
  if (!Capacitor.isNativePlatform()) return null;

  const enrolled = findEnabledBiometricEnrollment(getLastBiometricDriverId());
  if (!enrolled) return null;

  const healthy = await reconcileBiometricEnrollment(enrolled.driverId);
  if (!healthy) return null;

  const availability = await checkBiometricAvailability({
    useFallback: enrolled.prefs.useDevicePinFallback !== false,
  });
  if (!availability.available) return null;

  rememberLastBiometricDriverId(enrolled.driverId);

  return {
    driverId: enrolled.driverId,
    label: enrolled.prefs.label || availability.label || "device security",
  };
}

function continueLabel(label) {
  if (/face id/i.test(label)) return "Continue with Face ID";
  if (/touch id/i.test(label)) return "Continue with Touch ID";
  if (/fingerprint/i.test(label)) return "Continue with fingerprint";
  if (/face/i.test(label)) return "Continue with face recognition";
  if (/pin|passcode|device/i.test(label)) return "Continue with device security";
  return `Continue with ${label}`;
}

/**
 * Shown on the sign-in screen when a previous opt-in exists on this device.
 */
export default function BiometricLoginButton({
  onLogin,
  disabled = false,
  /** When true, render as the primary auth action rather than a social-style button. */
  primary = false,
  onAvailabilityChange,
}) {
  const [ready, setReady] = useState(false);
  const [label, setLabel] = useState("Fingerprint");
  const [driverId, setDriverId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expiredNotice, setExpiredNotice] = useState("");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      onAvailabilityChange?.(false);
      return undefined;
    }

    let cancelled = false;

    const refreshOffer = async () => {
      const offer = await resolveBiometricLoginOffer();
      if (cancelled) return;
      if (!offer) {
        setReady(false);
        setDriverId(null);
        onAvailabilityChange?.(false);
        return;
      }
      setExpiredNotice("");
      setDriverId(offer.driverId);
      setLabel(offer.label);
      setReady(true);
      onAvailabilityChange?.(true);
    };

    void refreshOffer();

    let listener;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void refreshOffer();
    }).then((handle) => {
      listener = handle;
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshOffer();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      void listener?.remove();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [onAvailabilityChange]);

  if (!ready || !driverId) {
    if (!expiredNotice) return null;
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        {expiredNotice}
      </p>
    );
  }

  const isFace = /face/i.test(label);
  const Icon = isFace ? ScanFace : Fingerprint;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setError("");
            setExpiredNotice("");
            try {
              const result = await onLogin?.(driverId);
              if (result && !result.ok) {
                const message = result.message || "Authentication cancelled. No changes were made.";
                if (result.clearOffer) {
                  setExpiredNotice(message);
                  setReady(false);
                  setDriverId(null);
                  onAvailabilityChange?.(false);
                } else {
                  setError(message);
                }
              }
            } catch {
              setError("Sign-in did not finish. Try again, or use your password.");
            } finally {
              setBusy(false);
            }
          })();
        }}
        className={
          primary
            ? "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--ridova-lime)] px-4 text-base font-semibold text-[var(--ridova-navy)] disabled:opacity-60"
            : "driver-auth-social"
        }
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {busy ? "Unlocking…" : continueLabel(label)}
      </button>
      {busy ? (
        <p className="text-center text-xs text-muted-foreground">
          Complete the fingerprint prompt if it appears. This should only take a moment.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
