import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { PublicShell } from "@/components/driver/shells/PublicShell";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleed =
    pathname === "/splash" ||
    pathname.startsWith("/onboarding") ||
    pathname === "/biometric-unlock";

  if (fullBleed) return <Outlet />;

  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  );
}
