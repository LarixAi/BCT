import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { TripRouteTimeline } from "@/components/driver/trips/TripRouteTimeline";
import {
  getActiveJourney,
  getHeadingStop,
  journeyStartedLabel,
  stopProgressLabel,
  stopsWithProgress,
} from "@/domain/journey/journey-helpers";
import { getProfileForStop } from "@/domain/passenger/passenger-pickup";
import { PassengerPickupBrief } from "@/components/driver/passengers/PassengerPickupBrief";
import { formatTime } from "@/lib/utils";
import type { DutyDetail } from "@/types/duty";

const JOURNEY_ACTIONS = (dutyId: string) =>
  [
    { label: "Report delay", href: `/duties/${dutyId}/journey/delay` },
    { label: "Rest break", href: `/duties/${dutyId}/journey/break` },
    { label: "Report defect", href: `/duties/${dutyId}/journey/defect` },
    { label: "Journey note", href: `/duties/${dutyId}/journey/note` },
    { label: "Vehicle swap", href: `/duties/${dutyId}/journey/swap` },
    { label: "Stop progress", href: `/duties/${dutyId}/journey/progress` },
    { label: "Safety help", href: `/duties/${dutyId}/help` },
    { label: "End journey", href: `/duties/${dutyId}/journey/end`, muted: true },
  ] as const;

export function ActiveJourneyPanel({ duty, dutyId }: { duty: DutyDetail; dutyId: string }) {
  const journeyName = getActiveJourney(duty, duty.activeJourneyId)?.name ?? duty.routeName;
  const heading = getHeadingStop(duty);
  const stops = stopsWithProgress(duty);
  const pickupProfile = getProfileForStop(heading);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const statusLine = mounted
    ? `${journeyStartedLabel(duty)} · ${stopProgressLabel(duty)}`
    : `In service · ${stopProgressLabel(duty)}`;

  return (
    <FocusedPageShell
      title={journeyName}
      subtitle={statusLine}
      backTo="/trips"
      backLabel="Duties"
      eyebrow="Active journey"
      footer={
        <div className="space-y-2">
          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to={`/duties/${dutyId}/nav`}>Open navigation</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full font-bold">
            <Link to={`/duties/${dutyId}/journey/end`}>End journey</Link>
          </Button>
        </div>
      }
    >
      <div className="animate-in-up space-y-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="ok">In service</Badge>
          {duty.vehicle ? (
            <p className="font-mono text-sm font-extrabold tracking-wide">
              {duty.vehicle.registrationNumber}
            </p>
          ) : null}
        </div>

        {duty.vehicle && heading ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Heading to</p>
              <p className="text-xs text-muted tabular-nums">
                {duty.vehicle.mileage.toLocaleString()} km
              </p>
            </div>
            <p className="mt-2 font-display text-lg font-extrabold leading-snug">
              {heading.name.split("—")[0]?.trim() ?? heading.name}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-link">
              Planned {formatTime(heading.plannedArrival)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{heading.address}</p>
          </section>
        ) : null}

        {pickupProfile ? <PassengerPickupBrief dutyId={dutyId} profile={pickupProfile} /> : null}

        <section data-testid="active-route-progress" className="rounded-xl border border-border bg-card p-4">
          <TripRouteTimeline stops={stops} title="Route progress" />
        </section>

        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">On journey</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {JOURNEY_ACTIONS(dutyId).map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={
                  action.muted
                    ? "col-span-2 rounded-xl border border-border bg-card px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-wide text-muted"
                    : "rounded-xl border border-border bg-card px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-wide text-link"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </FocusedPageShell>
  );
}
