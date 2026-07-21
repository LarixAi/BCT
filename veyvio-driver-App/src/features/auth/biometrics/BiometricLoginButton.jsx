import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint, ScanFace } from "lucide-react";
import { checkBiometricAvailability } from "./biometric-service.js";
import { getBiometricPreference } from "./biometric-preference.js";
import { getLastBiometricDriverId } from "./biometric-session.js";

/**
 * Shown on the sign-in screen when a previous opt-in exists on this device.
 */
export default function BiometricLoginButton({ onLogin, disabled = false }) {
  const [ready, setReady] = useState(false);
  const [label, setLabel] = useState("Face ID");
  const [driverId, setDriverId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let cancelled = false;

    void (async () => {
      const lastId = getLastBiometricDriverId();
      if (!lastId) return;
      const prefs = getBiometricPreference(lastId);
      if (!prefs.enabled) return;
      const availability = await checkBiometricAvailability();
      if (cancelled || !availability.available) return;
      setDriverId(lastId);
      setLabel(prefs.label || availability.label);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !driverId) return null;

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
            const result = await onLogin?.(driverId);
            setBusy(false);
            if (result && !result.ok) {
              setError(result.message || "Biometric sign-in failed.");
            }
          })();
        }}
        className="driver-auth-social"
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {busy ? "Unlocking…" : `Unlock with ${label}`}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
