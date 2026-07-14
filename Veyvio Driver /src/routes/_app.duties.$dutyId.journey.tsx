import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/duties/$dutyId/journey")({
  component: () => <Outlet />,
});
