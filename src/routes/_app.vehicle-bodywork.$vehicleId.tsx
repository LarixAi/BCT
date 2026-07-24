import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/vehicle-bodywork/$vehicleId")({
  component: () => <Outlet />,
});
