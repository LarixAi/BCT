import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { notFound } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { VehicleTabBar } from "@/components/condition/VehicleTabBar";

export const Route = createFileRoute("/_app/yard/$vehicleId")({
  component: VehicleLayout,
});

function VehicleLayout() {
  const { vehicleId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const pathname = useRouterState({ select: s => s.location.pathname });
  const showTabs = vehicle && !pathname.includes("/check");

  if (!vehicle && !pathname.includes("/check")) throw notFound();

  return (
    <div className="space-y-3">
      {showTabs && vehicle && <VehicleTabBar vehicle={vehicle} />}
      <Outlet />
    </div>
  );
}
