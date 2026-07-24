import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { VehicleTabBar } from "@/components/condition/VehicleTabBar";

export const Route = createFileRoute("/_app/yard/$vehicleId")({
  component: VehicleLayout,
});

function VehicleLayout() {
  const { vehicleId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const vehiclesLoaded = useYard(s => s.vehicles.length > 0);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isFocusedWorkflow = pathname.includes("/check") || pathname.includes("/adblue/");
  const showTabs = vehicle && !isFocusedWorkflow;

  if (!vehicle && !isFocusedWorkflow) {
    if (!vehiclesLoaded) {
      return <p className="p-8 text-center text-muted text-sm">Loading vehicle…</p>;
    }
    return <p className="p-8 text-center text-muted text-sm">Vehicle not found.</p>;
  }

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      {showTabs && vehicle && <VehicleTabBar vehicle={vehicle} />}
      <Outlet />
    </div>
  );
}
