import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { DutiesWorkspaceScreen } from "@/components/driver/trips/DutiesWorkspaceScreen";
import {
  buildActiveTripsSchedule,
  buildEmptyTripsSchedule,
  buildExceptionTripsSchedule,
} from "@/data/mocks/trips-schedule";
import { useDriverStore } from "@/store/driver";
import { resolveDemoParam } from "@/platform/dev/dev-guards";

type TripsDemo = "normal" | "active" | "exception" | "empty";

export const Route = createFileRoute("/_app/trips/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as TripsDemo | undefined) ?? "normal",
    dutyId: typeof search.dutyId === "string" ? search.dutyId : undefined,
  }),
  head: () => ({ meta: [{ title: "Duties — Veyvio Driver" }] }),
  component: TripsPage,
});

function TripsPage() {
  const { demo: rawDemo, dutyId } = Route.useSearch();
  const demo = resolveDemoParam(rawDemo) ?? "normal";
  const storeSchedule = useDriverStore((s) => s.tripsSchedule);

  const tripsSchedule = useMemo(() => {
    if (demo === "active") return buildActiveTripsSchedule();
    if (demo === "exception") return buildExceptionTripsSchedule();
    if (demo === "empty") return buildEmptyTripsSchedule();
    return storeSchedule;
  }, [demo, storeSchedule]);

  return <DutiesWorkspaceScreen schedule={tripsSchedule} initialDutyId={dutyId} />;
}
