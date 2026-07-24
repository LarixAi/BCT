import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/more/bodywork")({
  beforeLoad: () => {
    throw redirect({ to: "/vehicle-bodywork" });
  },
});
