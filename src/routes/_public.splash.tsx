import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SplashBrandMark } from "@/components/brand/SplashBrandMark";
import { resolveStartupRoute } from "@/features/startup/resolve-startup-route";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_public/splash")({
  head: () => ({
    meta: [{ title: "Veyvio Yard" }],
  }),
  component: SplashPage,
});

const APP_VERSION = "0.1.0";

function SplashPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Restoring session…");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus("Checking yard status…");
      const target = resolveStartupRoute({
        session: getSessionSnapshot(),
        tenancy: getTenancySnapshot(),
        offlineCacheAvailable: getSessionSnapshot().bootstrapComplete,
      });
      navigate({ to: target, replace: true });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-accent px-6 pt-safe pb-safe animate-in-up">
      <div className="flex flex-1 flex-col items-center justify-center">
        <SplashBrandMark status={status} version={APP_VERSION} />
      </div>
    </div>
  );
}
