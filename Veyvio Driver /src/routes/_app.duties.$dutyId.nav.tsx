import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/duties/$dutyId/nav")({
  component: () => <Outlet />,
});
