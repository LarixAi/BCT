import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { runBootstrapSync } from "@/platform/sync/sync-engine";
import { YardAuthPrimaryButton, YardMobileAuthLayout } from "@/components/auth/YardMobileAuthLayout";
import type { YardRole } from "@/types/permissions";

const SYNC_ITEMS = [
  "Vehicles",
  "Yard bays and zones",
  "Vehicle statuses",
  "Movements",
  "Equipment records",
  "Open checks",
  "Defects and VOR cases",
  "Permissions",
];

export const Route = createFileRoute("/_public/initial-sync")({
  head: () => ({ meta: [{ title: "Synchronising — Veyvio Yard" }] }),
  component: InitialSyncPage,
});

function InitialSyncPage() {
  const navigate = useNavigate();
  const completeBootstrap = useSessionStore(s => s.completeBootstrap);
  const companyId = useTenancyStore(s => s.companyId);
  const depotId = useTenancyStore(s => s.depotId);
  const role = useTenancyStore(s => s.role) as YardRole | null;
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (failed || !companyId || !depotId) return;

    let cancelled = false;
    const progressTimer = window.setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 150);

    void (async () => {
      const result = await runBootstrapSync(companyId, depotId, role ?? "yard_manager");
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
      window.setTimeout(() => navigate({ to: "/" }), 400);
    })();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
    };
  }, [failed, companyId, depotId, role, completeBootstrap, navigate]);

  return (
    <YardMobileAuthLayout
      title="Synchronising yard data"
      subtitle="Loading depot records into local storage for offline operation."
      showBrand={false}
      animate
    >
      <div className="yard-auth-progress" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>

      <ul className="mt-4 space-y-1 text-left text-xs text-[#9ca3af]">
        {SYNC_ITEMS.map((item, i) => (
          <li key={item} className={progress > i * 11 ? "text-[#0b0e14]" : undefined}>
            ✓ {item}
          </li>
        ))}
      </ul>

      {failed ? (
        <div className="yard-auth-form-stack mt-4">
          <p className="yard-auth-error">{error}</p>
          <YardAuthPrimaryButton
            ready
            onClick={() => {
              setFailed(false);
              setError(null);
              setProgress(0);
            }}
          >
            Retry synchronisation
          </YardAuthPrimaryButton>
        </div>
      ) : null}
    </YardMobileAuthLayout>
  );
}
