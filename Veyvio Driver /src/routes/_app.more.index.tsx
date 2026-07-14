import { createFileRoute } from "@tanstack/react-router";
import { MoreHubPage } from "@/components/driver/more/MoreHub";

type MoreDemo = "normal" | "compliant";

export const Route = createFileRoute("/_app/more/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as MoreDemo | undefined) ?? "normal",
  }),
  head: () => ({ meta: [{ title: "More — Veyvio Driver" }] }),
  component: MoreIndexPage,
});

function MoreIndexPage() {
  const { demo } = Route.useSearch();
  return <MoreHubPage demo={demo} />;
}
