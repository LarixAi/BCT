import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ChecksWorkspaceScreen } from "@/components/driver/checks/ChecksWorkspaceScreen";
import {
  buildHeldChecksHome,
  buildInProgressChecksHome,
  buildReadyChecksHome,
} from "@/data/mocks/vehicle-check";
import { reconcileReleasedCheckToDriver } from "@/domain/vehicle-check/complete-check-flow";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { resolveDemoParam } from "@/platform/dev/dev-guards";

type ChecksDemo = "normal" | "in_progress" | "ready" | "held";

export const Route = createFileRoute("/_app/checks/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as ChecksDemo | undefined) ?? "normal",
  }),
  head: () => ({ meta: [{ title: "Vehicle checks — Veyvio Driver" }] }),
  component: ChecksHomePage,
});

function ChecksHomePage() {
  const { demo: rawDemo } = Route.useSearch();
  const demo = resolveDemoParam(rawDemo) ?? "normal";
  const navigate = useNavigate();
  const storeHome = useVehicleCheckStore((s) => s.checksHome);
  const activeSession = useVehicleCheckStore((s) => s.activeSession);
  const startCheck = useVehicleCheckStore((s) => s.startCheck);
  const ensureDemoSession = useVehicleCheckStore((s) => s.ensureDemoSession);

  const checksHome = useMemo(() => {
    if (demo === "in_progress") return buildInProgressChecksHome();
    if (demo === "ready") return buildReadyChecksHome();
    if (demo === "held") return buildHeldChecksHome();
    return storeHome;
  }, [demo, storeHome]);

  // Checks can show "released" from persist while Duties/home still require a check
  useEffect(() => {
    reconcileReleasedCheckToDriver(checksHome, activeSession);
  }, [checksHome, activeSession]);

  function handleContinueCheck() {
    ensureDemoSession();
    void navigate({
      to: "/checks/walkaround",
      search: { section: undefined, item: undefined, step: undefined },
    });
  }

  function handleStartCheck() {
    startCheck();
    void navigate({ to: "/checks/verify" });
  }

  return (
    <ChecksWorkspaceScreen
      home={checksHome}
      onStartCheck={handleStartCheck}
      onContinueCheck={demo === "in_progress" ? handleContinueCheck : undefined}
    />
  );
}
