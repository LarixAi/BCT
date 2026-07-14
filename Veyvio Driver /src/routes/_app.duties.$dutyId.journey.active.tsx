import { createFileRoute, redirect } from "@tanstack/react-router";
import { ActiveJourneyPanel } from "@/components/driver/journey/ActiveJourneyPanel";
import { seedActiveDutyDemo } from "@/platform/dev/seed-active-duty";
import { canSeedOperationalDemo, resolveDemoParam } from "@/platform/dev/dev-guards";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/active")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as string | undefined) ?? undefined,
  }),
  head: () => ({ meta: [{ title: "Active journey — Veyvio Driver" }] }),
  beforeLoad: ({ params, search }) => {
    const demo = resolveDemoParam(search.demo);
    if (demo === "active" && canSeedOperationalDemo()) {
      seedActiveDutyDemo(params.dutyId);
      return;
    }
    const duty = useDriverStore.getState().getDuty(params.dutyId);
    if (duty && duty.lifecycleStatus !== "in_progress") {
      throw redirect({ to: `/duties/${params.dutyId}/journey/open` });
    }
  },
  component: ActiveJourneyPage,
});

function ActiveJourneyPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  if (!duty) return <p className="text-sm text-muted">Loading journey…</p>;

  return <ActiveJourneyPanel duty={duty} dutyId={dutyId} />;
}
