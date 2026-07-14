import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SplashBrandMark } from "@/components/brand/SplashBrandMark";
import { resolveStartupRoute } from "@/features/startup/resolve-startup-route";
import { seedDevContext } from "@/platform/dev/seed-dev-context";
import { isDevAuthBypassEnabled } from "@/platform/dev/dev-guards";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";

const DEV_BYPASS = isDevAuthBypassEnabled();

export const Route = createFileRoute("/_public/splash")({
  head: () => ({ meta: [{ title: "Veyvio Driver" }] }),
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Restoring session…");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus("Checking duty status…");
      if (DEV_BYPASS) {
        seedDevContext();
        navigate({ to: "/", replace: true });
        return;
      }

      const session = getSessionSnapshot();
      const sessionValid =
        session.status === "authenticated" &&
        !!session.accessToken &&
        !!session.expiresAt &&
        new Date(session.expiresAt).getTime() > Date.now();

      if (!sessionValid && !session.hasSeenWelcome) {
        navigate({ to: "/welcome/1", replace: true });
        return;
      }

      const target = resolveStartupRoute({
        session,
        tenancy: getTenancySnapshot(),
        offlineCacheAvailable: session.bootstrapComplete,
      });
      navigate({ to: target, replace: true });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-accent px-6 pb-safe pt-safe animate-in-up">
      {/* Midnight field with subtle Driver Blue glow — product atmosphere, not flat black */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(47,107,255,0.22),transparent_55%),radial-gradient(ellipse_at_50%_100%,rgba(142,197,255,0.12),transparent_45%)]"
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <SplashBrandMark status={status} />
      </div>
      <p className="relative pb-6 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
        Veyvio
      </p>
    </div>
  );
}
