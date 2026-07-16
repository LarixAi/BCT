import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckResultScreen } from "@/components/driver/checks/CheckResultScreen";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { buildReadyChecksHome } from "@/data/mocks/vehicle-check";
import { Button } from "@/components/ui/button";
import { resolveDemoParam } from "@/platform/dev/dev-guards";

export const Route = createFileRoute("/_app/checks/result")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as "ready" | undefined) ?? undefined,
  }),
  head: () => ({ meta: [{ title: "Check result — Veyvio Driver" }] }),
  component: CheckResultPage,
});

function CheckResultPage() {
  const { demo: rawDemo } = Route.useSearch();
  const demo = resolveDemoParam(rawDemo);
  const session = useVehicleCheckStore((s) => s.activeSession);
  const checksHome = useVehicleCheckStore((s) => s.checksHome);

  if (demo === "ready" || (!session?.outcome && checksHome.vehicle.gateStatus === "ready_for_service")) {
    const home = buildReadyChecksHome();
    const mockSession = {
      id: "vc_done",
      vehicleId: home.vehicle.vehicleId,
      dutyId: home.dutyId,
      vehicleAssignmentId: home.vehicleAssignmentId,
      templateVersion: "psv-walkaround-v1",
      phase: "submitted" as const,
      verified: true,
      dashboardPhotoTaken: true,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      itemResults: {},
      defects: [],
      outcome: "nil_defects" as const,
      checkReference: home.vehicle.lastCompletedCheck?.reference ?? "VC-20260712-10482",
      syncStatus: "synced" as const,
    };
    return (
      <FocusedPageShell title="Check result" backTo="/checks" backLabel="Checks" eyebrow="Walkaround">
        <div className="animate-in-up">
          <CheckResultScreen session={mockSession} home={home} />
        </div>
      </FocusedPageShell>
    );
  }

  if (!session?.outcome) {
    return (
      <FocusedPageShell title="Check result" backTo="/checks" backLabel="Checks" eyebrow="Walkaround">
        <div className="space-y-4">
          <p className="text-sm text-muted">No submitted check result.</p>
          <Button asChild>
            <Link to="/checks">Back to checks</Link>
          </Button>
        </div>
      </FocusedPageShell>
    );
  }

  return (
    <FocusedPageShell title="Check result" backTo="/checks" backLabel="Checks" eyebrow="Walkaround">
      <div className="animate-in-up">
        <CheckResultScreen session={session} home={checksHome} />
      </div>
    </FocusedPageShell>
  );
}
