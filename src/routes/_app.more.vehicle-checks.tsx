import { createFileRoute } from "@tanstack/react-router";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { VehicleChecksHubPage } from "@/features/vehicle-checks/VehicleChecksHubPage";

export const Route = createFileRoute("/_app/more/vehicle-checks")({
  head: () => ({ meta: [{ title: yardPageTitle("Vehicle checks") }] }),
  component: VehicleChecksHubPage,
});
