import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { homeCardOrder } from "@/domain/home/home-helpers";
import { useDriverStore } from "@/store/driver";
import { HomeHeader } from "@/components/driver/home/HomeHeader";
import { DeviceReadinessBanner } from "@/features/driver-focus/DeviceReadinessBanner";
import { DutyStatusCard } from "@/components/driver/home/DutyStatusCard";
import { CurrentWorkCard } from "@/components/driver/home/CurrentWorkCard";
import { VehicleAssignmentCard } from "@/components/driver/home/VehicleAssignmentCard";
import { ScheduleTimeline } from "@/components/driver/home/ScheduleTimeline";
import { RequiredActionsSection } from "@/components/driver/home/RequiredActionsSection";
import { OperationalNoticeCard } from "@/components/driver/home/OperationalNoticeCard";
import { EndOfDutyCard, BlockedCard } from "@/components/driver/home/EndOfDutyCard";
import { IncidentHomePanel } from "@/components/driver/home/IncidentHomePanel";
import type { HomeCardId } from "@/domain/home/home-helpers";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Home — Veyvio Driver" }] }),
  component: HomePage,
});

function HomePage() {
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const acknowledgeNotice = useDriverStore((s) => s.acknowledgeOperationalNotice);
  const refreshHomeSync = useDriverStore((s) => s.refreshHomeSync);

  useEffect(() => {
    refreshHomeSync();
    const id = window.setInterval(refreshHomeSync, 30_000);
    return () => window.clearInterval(id);
  }, [refreshHomeSync]);

  const order = useMemo(() => homeCardOrder(homeSummary), [homeSummary]);

  const cards: Record<HomeCardId, React.ReactNode> = {
    block: <BlockedCard summary={homeSummary} />,
    current_work: <CurrentWorkCard summary={homeSummary} />,
    required_action: <RequiredActionsSection actions={homeSummary.requiredActions} />,
    duty_status: <DutyStatusCard summary={homeSummary} />,
    vehicle: <VehicleAssignmentCard summary={homeSummary} />,
    schedule: <ScheduleTimeline items={homeSummary.todaySchedule} />,
    notice: homeSummary.latestOperationalNotice ? (
      <OperationalNoticeCard
        notice={homeSummary.latestOperationalNotice}
        onAcknowledge={acknowledgeNotice}
      />
    ) : null,
    end_of_duty: <EndOfDutyCard />,
  };

  return (
    <div className="space-y-4">
      <HomeHeader summary={homeSummary} />
      <DeviceReadinessBanner />
      <IncidentHomePanel />

      {order.map((id) => {
        const card = cards[id];
        if (!card) return null;
        return <div key={id}>{card}</div>;
      })}
    </div>
  );
}
