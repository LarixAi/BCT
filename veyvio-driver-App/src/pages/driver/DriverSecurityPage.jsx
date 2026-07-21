import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint, ScanFace, Shield } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import { SettingsDetailRows, SettingsToggle } from "@/components/driver/settings/settings-shared";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  checkBiometricAvailability,
  disableBiometricSignIn,
  enableBiometricSignIn,
  getBiometricPreference,
  LOCK_AFTER_OPTIONS_MINUTES,
  removeTrustedDeviceLocally,
  saveBiometricPreference,
} from "@/features/auth/biometrics";

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DriverSecurityPage({ driver }) {
  const { logout } = useDriverSupabaseAuth();
  const driverId = driver?.id;
  const [prefs, setPrefs] = useState(() => getBiometricPreference(driverId));
  const [availability, setAvailability] = useState({ available: false, label: "Biometric authentication" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const refreshPrefs = () => setPrefs(getBiometricPreference(driverId));

  useEffect(() => {
    setPrefs(getBiometricPreference(driverId));
    if (!Capacitor.isNativePlatform()) {
      setAvailability({ available: false, label: "Biometric authentication" });
      return;
    }
    const pinFallback = getBiometricPreference(driverId).useDevicePinFallback !== false;
    void checkBiometricAvailability({ useFallback: pinFallback }).then(setAvailability);
  }, [driverId]);

  const label = prefs.label || availability.label || "Face ID";
  const isFace = /face/i.test(label);
  const Icon = isFace ? ScanFace : Fingerprint;
  const native = Capacitor.isNativePlatform();

  const detailRows = useMemo(
    () => [
      { label: "Status", value: prefs.enabled ? "Enabled" : "Off" },
      { label: "Method", value: prefs.enabled ? label : "—" },
      { label: "Trusted device", value: prefs.deviceName || "—" },
      { label: "Enabled", value: formatWhen(prefs.enabledAt) },
      { label: "Last unlock", value: formatWhen(prefs.lastUnlockAt) },
    ],
    [prefs, label],
  );

  async function toggleEnabled() {
    if (!driverId || busy) return;
    setBusy(true);
    setError("");
    setMessage("");

    if (prefs.enabled) {
      await disableBiometricSignIn(driverId);
      refreshPrefs();
      setMessage("Biometric sign-in turned off on this device.");
      setBusy(false);
      return;
    }

    const result = await enableBiometricSignIn(driverId);
    refreshPrefs();
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(`${result.label} is ready for unlock on this device.`);
  }

  function setLockAfter(minutes) {
    if (!driverId) return;
    saveBiometricPreference(driverId, { lockAfterMinutes: minutes });
    refreshPrefs();
  }

  function togglePinFallback() {
    if (!driverId) return;
    const next = !prefs.useDevicePinFallback;
    saveBiometricPreference(driverId, { useDevicePinFallback: next });
    refreshPrefs();
    void checkBiometricAvailability({ useFallback: next }).then(setAvailability);
  }

  function saveDeviceName(value) {
    if (!driverId) return;
    const trimmed = value.trim().slice(0, 48);
    saveBiometricPreference(driverId, { deviceName: trimmed || null });
    refreshPrefs();
  }

  async function removeDevice() {
    if (!driverId || busy) return;
    setBusy(true);
    setError("");
    await removeTrustedDeviceLocally(driverId);
    setBusy(false);
    await logout();
  }

  return (
    <div className={`min-h-dvh ${op.pageBg} ${op.text}`}>
      <DriverOperationalHeader title="Security" subtitle="Biometric unlock and trusted device" backTo="/more" />
      <DriverPageContainer>
        <div className={`flex items-start gap-3 p-4 ${op.card}`}>
          <div className={op.iconWrap}>
            <Shield className={`h-5 w-5 ${op.iconTeal}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Biometric sign-in</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Use {label} or fingerprint to unlock Veyvio Driver. Your face or fingerprint stays on this
              device. Veyvio never receives biometric data.
            </p>
          </div>
          <SettingsToggle
            checked={prefs.enabled}
            onChange={() => void toggleEnabled()}
            aria-label={prefs.enabled ? "Disable biometric sign-in" : "Enable biometric sign-in"}
          />
        </div>

        {!native ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Biometric unlock is available in the iOS and Android Driver apps.
          </p>
        ) : null}

        {native && !availability.available && !prefs.enabled ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {label} is not available on this device. Enrol a fingerprint, Face ID, or device PIN in your
            phone settings first.
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            {message}
          </p>
        ) : null}

        <DriverSectionTitle>Status</DriverSectionTitle>
        <SettingsDetailRows rows={detailRows} />

        <DriverSectionTitle>Require authentication after</DriverSectionTitle>
        <div className={`flex flex-wrap gap-2 p-3 ${op.card}`}>
          {LOCK_AFTER_OPTIONS_MINUTES.map((minutes) => {
            const active = (prefs.lockAfterMinutes || 2) === minutes;
            return (
              <button
                key={minutes}
                type="button"
                disabled={!prefs.enabled || busy}
                onClick={() => setLockAfter(minutes)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold disabled:opacity-50 ${
                  active ? op.tabActive : `${op.card} border-border text-muted-foreground`
                }`}
              >
                {minutes} min
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Returning within this time does not ask for {label}. Cold starts always require unlock when
          biometric sign-in is on.
        </p>

        <DriverSectionTitle>Options</DriverSectionTitle>
        <div className={`${op.listCard}`}>
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Use device PIN as fallback</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Allow the phone PIN, pattern or password if biometrics fail.
              </p>
            </div>
            <SettingsToggle
              checked={prefs.useDevicePinFallback !== false}
              onChange={togglePinFallback}
              aria-label="Use device PIN as fallback"
            />
          </div>
          <div className="border-t border-border px-4 py-4">
            <label htmlFor="trusted-device-name" className="text-[15px] font-semibold">
              Trusted device name
            </label>
            <input
              id="trusted-device-name"
              type="text"
              value={prefs.deviceName || ""}
              onChange={(e) => saveDeviceName(e.target.value)}
              placeholder={isFace ? "e.g. Larone’s iPhone" : "e.g. Work Android"}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
            />
          </div>
        </div>

        <DriverSectionTitle>This device</DriverSectionTitle>
        <div className={`space-y-3 p-4 ${op.card}`}>
          <div className="flex items-center gap-3">
            <div className={op.iconWrap}>
              <Icon className={`h-5 w-5 ${op.iconTeal}`} aria-hidden />
            </div>
            <div>
              <p className="text-[15px] font-semibold">{prefs.deviceName || "This phone"}</p>
              <p className="text-xs text-muted-foreground">
                {prefs.enabled ? `${label} trusted on this device` : "Not enrolled for biometric unlock"}
              </p>
            </div>
          </div>

          {confirmRemove ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p>
                This clears biometric unlock on this phone and signs you out. You will need your password
                next time. Admin device revoke will follow in a later update.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeDevice()}
                  className="min-h-[44px] flex-1 rounded-full bg-red-600 font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Removing…" : "Remove and sign out"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmRemove(false)}
                  className="min-h-[44px] flex-1 rounded-full border border-border bg-card font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
              className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-red-200 bg-red-50 font-semibold text-red-700 disabled:opacity-60"
            >
              Remove this device
            </button>
          )}
        </div>
      </DriverPageContainer>
    </div>
  );
}
