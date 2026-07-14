import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/more/sync")({
  beforeLoad: () => {
    throw redirect({ to: "/more/offline-sync" });
  },
});
