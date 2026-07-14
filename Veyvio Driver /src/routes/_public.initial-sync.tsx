import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AUTH_FLOW_STEPS, AUTH_FLOW_TOTAL_STEPS } from "@/components/auth/auth-flow";
import { AuthCard, AuthPage, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { AuthStepHeader } from "@/components/auth/AuthStepHeader";
import { driverCopy } from "@/copy/driver-messages";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { runBootstrapSync } from "@/platform/sync/sync-engine";

const SYNC_ITEMS = [
  "Today's duties",
  "Route and stop details",
  "Passenger manifest",
  "Vehicle assignments",
  "Operational messages",
  "Document warnings",
  "Permissions",
];

export const Route = createFileRoute("/_public/initial-sync")({
  head: () => ({ meta: [{ title: "Synchronising — Veyvio Driver" }] }),
  component: InitialSyncPage,
});

function InitialSyncPage() {
  const navigate = useNavigate();
  const completeBootstrap = useSessionStore((s) => s.completeBootstrap);
  const companyId = useTenancyStore((s) => s.companyId);
  const depotId = useTenancyStore((s) => s.depotId);
  const driverId = useTenancyStore((s) => s.driverId);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (failed || !companyId || !depotId || !driverId) return;

    let cancelled = false;
    const progressTimer = window.setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 150);

    void (async () => {
      const result = await runBootstrapSync(companyId, depotId, driverId);
      if (cancelled) return;
      window.clearInterval(progressTimer);

      if (!result.ok) {
        setFailed(true);
        setError(result.error ?? "Synchronisation failed");
        setProgress(0);
        return;
      }

      setProgress(100);
      completeBootstrap();
      window.setTimeout(() => {
        const onboardingDone = useSessionStore.getState().hasCompletedDriverOnboarding;
        navigate({ to: onboardingDone ? "/" : "/onboarding/1" });
      }, 400);
    })();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
    };
  }, [failed, companyId, depotId, driverId, completeBootstrap, navigate]);

  return (
    <AuthPage>
      <AuthStepHeader
        step={AUTH_FLOW_STEPS.sync}
        totalSteps={AUTH_FLOW_TOTAL_STEPS}
        title={driverCopy.auth.syncTitle}
        subtitle={driverCopy.auth.syncSupporting}
      />

      <AuthCard className="space-y-5">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-link transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <ul className="space-y-2 text-left text-xs text-muted">
          {SYNC_ITEMS.map((item, i) => (
            <li key={item} className={progress > i * 11 ? "font-medium text-foreground" : ""}>
              {progress > i * 11 ? "✓" : "·"} {item}
            </li>
          ))}
        </ul>
        {failed && (
          <div className="space-y-3">
            <p className="text-sm text-vor">{error}</p>
            <AuthPrimaryButton
              onClick={() => {
                setFailed(false);
                setError(null);
                setProgress(0);
              }}
            >
              {driverCopy.auth.syncRetry}
            </AuthPrimaryButton>
          </div>
        )}
      </AuthCard>
    </AuthPage>
  );
}
