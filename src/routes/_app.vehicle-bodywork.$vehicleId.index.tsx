import { createFileRoute } from "@tanstack/react-router";
import { VehicleBodyworkProfile } from "@/features/vehicle-bodywork/VehicleBodyworkProfile";

export const Route = createFileRoute("/_app/vehicle-bodywork/$vehicleId/")({
  component: VehicleBodyworkProfilePage,
});

function VehicleBodyworkProfilePage() {
  const { vehicleId } = Route.useParams();
  return <VehicleBodyworkProfile vehicleId={vehicleId} />;
}
