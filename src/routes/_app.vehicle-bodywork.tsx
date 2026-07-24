import { createFileRoute, Outlet } from "@tanstack/react-router";
import { yardPageTitle } from "@/components/brand/brand-copy";

export const Route = createFileRoute("/_app/vehicle-bodywork")({
  head: () => ({
    meta: [{ title: yardPageTitle("Vehicle Bodywork") }],
  }),
  component: () => <Outlet />,
});
