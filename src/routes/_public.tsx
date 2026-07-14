import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { PublicShell } from "@/components/yard/shells/PublicShell";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  if (pathname === "/splash") return <Outlet />;

  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  );
}
