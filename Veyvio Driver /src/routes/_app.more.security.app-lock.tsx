import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { driverCopy } from "@/copy/driver-messages";
import { appLockTimeoutLabel } from "@/domain/security/security-format";
import { useSessionStore } from "@/platform/auth/session-store";
import type { AppLockTimeoutMinutes } from "@/types/security";

const TIMEOUT_OPTIONS: AppLockTimeoutMinutes[] = [1, 5, 15, 30];

export const Route = createFileRoute("/_app/more/security/app-lock")({
  head: () => ({ meta: [{ title: "App lock — Veyvio Driver" }] }),
  component: AppLockPage,
});

function AppLockPage() {
  const appLockEnabled = useSessionStore((s) => s.appLockEnabled);
  const appLockTimeoutMinutes = useSessionStore((s) => s.appLockTimeoutMinutes);
  const biometricEnabled = useSessionStore((s) => s.biometricEnabled);
  const setAppLockEnabled = useSessionStore((s) => s.setAppLockEnabled);
  const setAppLockTimeout = useSessionStore((s) => s.setAppLockTimeout);

  function handleToggle(enabled: boolean) {
    setAppLockEnabled(enabled);
    toast.success(enabled ? driverCopy.security.appLockEnabledToast : driverCopy.security.appLockDisabledToast);
  }

  return (
    <MoreSubpageLayout title="App lock" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.appLockIntro}</p>

      <HomeCard tone={appLockEnabled ? "teal" : "default"}>
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
          <div>
            <p className="font-semibold">
              {appLockEnabled ? "App lock is on" : "App lock is off"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {appLockEnabled
                ? `Veyvio Driver locks after ${appLockTimeoutMinutes} minute${appLockTimeoutMinutes === 1 ? "" : "s"} in the background.`
                : "The app stays open until you sign out or close it."}
            </p>
          </div>
        </div>
      </HomeCard>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        <label className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-medium">{driverCopy.security.appLockEnabledLabel}</span>
          <input
            type="checkbox"
            checked={appLockEnabled}
            onChange={(event) => handleToggle(event.target.checked)}
            className="size-5 accent-primary"
          />
        </label>
      </div>

      {appLockEnabled && (
        <section className="space-y-2">
          <h2 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
            {driverCopy.security.appLockTimeoutLabel}
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {TIMEOUT_OPTIONS.map((minutes) => (
              <label key={minutes} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm">{appLockTimeoutLabel(minutes)}</span>
                <input
                  type="radio"
                  name="app-lock-timeout"
                  checked={appLockTimeoutMinutes === minutes}
                  onChange={() => setAppLockTimeout(minutes)}
                  className="size-5 accent-primary"
                />
              </label>
            ))}
          </div>
          <p className="px-1 text-xs text-muted">{driverCopy.security.appLockTimeoutHint}</p>
        </section>
      )}

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-sm font-medium">{driverCopy.security.appLockRequireBiometric}</p>
        <p className="mt-1 text-sm text-muted">{driverCopy.security.appLockRequireHint}</p>
        <p className="mt-2 text-xs text-muted">
          {biometricEnabled
            ? "This phone will use biometric unlock when the app locks."
            : "This phone will ask for your password when the app locks."}
        </p>
      </div>
    </MoreSubpageLayout>
  );
}
