import { Fingerprint, ScanFace } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";

/**
 * Full-screen app lock. Session remains; biometrics only unlock the UI.
 */
export default function BiometricLockScreen({
  label = "Face ID",
  busy = false,
  error = "",
  onUnlock,
  onUsePassword,
}) {
  const isFace = /face/i.test(label);
  const Icon = isFace ? ScanFace : Fingerprint;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[var(--ridova-navy)] text-white"
      style={{ paddingTop: DRIVER_SCREEN_TOP }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="biometric-lock-title"
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
          <Icon className="h-8 w-8 text-[var(--ridova-lime)]" aria-hidden />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ridova-lime)]">
          Veyvio Driver
        </p>
        <h1 id="biometric-lock-title" className="mt-3 text-2xl font-bold">
          Unlock with {label}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-white/70">
          Confirm it&apos;s you to continue. Your biometric data stays on this device.
        </p>

        {error ? (
          <p className="mt-4 max-w-sm rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={onUnlock}
          className={`mt-8 flex min-h-[52px] w-full max-w-xs items-center justify-center rounded-full font-semibold ${op.primaryBtn} disabled:opacity-60`}
        >
          {busy ? "Checking…" : `Use ${label}`}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onUsePassword}
          className="mt-4 min-h-[44px] text-sm font-medium text-white/75 underline-offset-4 hover:underline disabled:opacity-60"
        >
          Use password instead
        </button>
      </div>
    </div>
  );
}
