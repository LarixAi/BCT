import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChecksHeader } from "@/components/driver/checks/ChecksHeader";
import { AssignedVehicleCard } from "@/components/driver/checks/AssignedVehicleCard";
import { KnownIssuesCard } from "@/components/driver/checks/KnownIssuesCard";
import { ChecksHomeActions } from "@/components/driver/checks/ChecksHomeActions";
import {
  buildHeldChecksHome,
  buildInProgressChecksHome,
  buildReadyChecksHome,
} from "@/data/mocks/vehicle-check";
import { useDriverStore } from "@/store/driver";
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
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const storeHome = useVehicleCheckStore((s) => s.checksHome);
  const startCheck = useVehicleCheckStore((s) => s.startCheck);
  const ensureDemoSession = useVehicleCheckStore((s) => s.ensureDemoSession);

  const checksHome = useMemo(() => {
    if (demo === "in_progress") return buildInProgressChecksHome();
    if (demo === "ready") return buildReadyChecksHome();
    if (demo === "held") return buildHeldChecksHome();
    return storeHome;
  }, [demo, storeHome]);

  function handleContinueCheck() {
    ensureDemoSession();
    void navigate({ to: "/checks/walkaround" });
  }

  function handleStartCheck() {
    startCheck();
    void navigate({ to: "/checks/verify" });
  }

  return (
    <div className="animate-in-up space-y-4">
      <ChecksHeader sync={homeSummary.sync} />
      <AssignedVehicleCard home={checksHome} />
      <KnownIssuesCard issues={checksHome.knownIssues} />
      <ChecksHomeActions
        home={checksHome}
        onStartCheck={handleStartCheck}
        onContinueCheck={demo === "in_progress" ? handleContinueCheck : undefined}
      />
    </div>
  );
}
