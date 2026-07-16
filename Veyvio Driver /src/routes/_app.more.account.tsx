import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/driver/more/AccountPage";

type MoreDemo = "normal" | "compliant";

export const Route = createFileRoute("/_app/more/account")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as MoreDemo | undefined) ?? "normal",
  }),
  head: () => ({ meta: [{ title: "Account — Veyvio Driver" }] }),
  component: MoreAccountRoute,
});

function MoreAccountRoute() {
  const { demo } = Route.useSearch();
  return <AccountPage demo={demo} />;
}
