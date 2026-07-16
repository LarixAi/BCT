import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDriverStore } from "@/store/driver";
import { CleanHomeScreen } from "@/components/driver/home/CleanHomeScreen";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Home — Veyvio Driver" }] }),
  component: HomePage,
});

/**
 * Clean Home — status strip is the first thing on screen.
 * Banners / incidents live inside CleanHomeScreen under the hero, not above it.
 */
function HomePage() {
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const refreshHomeSync = useDriverStore((s) => s.refreshHomeSync);

  useEffect(() => {
    refreshHomeSync();
    const id = window.setInterval(refreshHomeSync, 30_000);
    return () => window.clearInterval(id);
  }, [refreshHomeSync]);

  return <CleanHomeScreen summary={homeSummary} />;
}
