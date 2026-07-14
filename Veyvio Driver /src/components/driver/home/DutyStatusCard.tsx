import { Link } from "@tanstack/react-router";
import { dutyPrimaryAction, dutyStatusHeadline, dutyStatusTone, formatDuration } from "@/domain/home/home-helpers";
import type { DriverHomeSummary } from "@/types/home";
import { Button } from "@/components/ui/button";
import { HomeCard, HomeCardLabel, HomeCardTitle, HomeDetailRow } from "./HomeCard";

export function DutyStatusCard({ summary }: { summary: DriverHomeSummary }) {
  const tone = dutyStatusTone(summary.operationalState, summary.driver.complianceStatus);
  const primary = dutyPrimaryAction(summary);
  const { duty, vehicleAssignment } = summary;
  const isOnDuty = duty.status === "on_duty" || summary.operationalState === "journey_active";

  return (
    <HomeCard tone={tone}>
      <HomeCardLabel>Duty status</HomeCardLabel>
      <HomeCardTitle>{dutyStatusHeadline(summary)}</HomeCardTitle>

      {!isOnDuty && (
        <dl className="mt-3 space-y-2">
          {duty.scheduledStartLabel && (
            <HomeDetailRow label="Next scheduled duty" value={duty.scheduledStartLabel} />
          )}
          <HomeDetailRow label="Assigned depot" value={summary.driver.depotName} />
          {vehicleAssignment && (
            <HomeDetailRow label="Assigned vehicle" value={vehicleAssignment.registration} />
          )}
        </dl>
      )}

      {isOnDuty && (
        <dl className="mt-3 space-y-2">
          {duty.actualStart && (
            <HomeDetailRow
              label="Started"
              value={new Date(duty.actualStart).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            />
          )}
          <HomeDetailRow label="Duty time" value={formatDuration(duty.dutyMinutes)} />
          <HomeDetailRow label="Driving time" value={formatDuration(duty.drivingMinutes)} />
          {duty.nextBreakDueAt && <HomeDetailRow label="Next break due" value={duty.nextBreakDueAt} />}
        </dl>
      )}

      {summary.operationalState === "on_break" && (
        <p className="mt-2 text-sm text-warn">18 minutes remaining</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {primary && (
          primary.href ? (
            <Button asChild className="h-12 w-full bg-accent font-bold uppercase tracking-widest text-white hover:bg-accent/90">
              <Link to={primary.href}>{primary.label}</Link>
            </Button>
          ) : (
            <Button className="h-12 w-full bg-accent font-bold uppercase tracking-widest text-white hover:bg-accent/90">
              {primary.label}
            </Button>
          )
        )}
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/trips">View today&apos;s schedule</Link>
        </Button>
      </div>
    </HomeCard>
  );
}
