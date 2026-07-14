import { createFileRoute } from "@tanstack/react-router";
import { NavDirectionsSheet } from "@/components/driver/journey/NavDirectionsSheet";
import { NavGuidanceBanner } from "@/components/driver/journey/NavGuidanceBanner";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/")({
  head: () => ({ meta: [{ title: "Navigation — Veyvio Driver" }] }),
  component: NavMapPage,
});

function NavMapPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const street = stop?.name.split("—")[0]?.trim() ?? "Next stop";

  return (
    <NavShell
      dutyId={dutyId}
      eta="—"
      nextStop={street}
      mapOverlay={<NavGuidanceBanner dutyId={dutyId} />}
      mapBottomSheet={<NavDirectionsSheet dutyId={dutyId} />}
    />
  );
}
