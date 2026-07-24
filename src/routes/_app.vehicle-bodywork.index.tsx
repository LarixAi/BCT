import { createFileRoute } from "@tanstack/react-router";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { VehicleBodyworkFleetDashboard } from "@/features/vehicle-bodywork/VehicleBodyworkFleetDashboard";

export const Route = createFileRoute("/_app/vehicle-bodywork/")({
  head: () => ({
    meta: [
      { title: yardPageTitle("Vehicle Bodywork") },
      {
        name: "description",
        content: "View, report and manage bodywork damage across your fleet.",
      },
    ],
  }),
  component: VehicleBodyworkFleetDashboard,
});
