import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripRouteTimeline } from "@/components/driver/trips/TripRouteTimeline";
import {
  getActiveJourney,
  getHeadingStop,
  journeyStartedLabel,
  nextPassengerDetail,
  stopProgressLabel,
  stopsWithProgress,
} from "@/domain/journey/journey-helpers";
import { getProfileForStop } from "@/domain/passenger/passenger-pickup";
import { PassengerPickupBrief } from "@/components/driver/passengers/PassengerPickupBrief";
import { JourneyHelpLauncher } from "@/components/driver/journey/JourneyHelpLauncher";
import { formatTime } from "@/lib/utils";
import type { DutyDetail } from "@/types/duty";

export function ActiveJourneyPanel({ duty, dutyId }: { duty: DutyDetail; dutyId: string }) {
  const heading = getHeadingStop(duty);
  const stops = stopsWithProgress(duty);
  const passenger = nextPassengerDetail(heading);
  const pickupProfile = getProfileForStop(heading);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative animate-in-up space-y-4 pb-24">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Active journey</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {getActiveJourney(duty, duty.activeJourneyId)?.name ?? duty.routeName}
          </h1>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            {mounted ? journeyStartedLabel(duty) : "In service"} · {stopProgressLabel(duty)}
          </p>
        </div>
        <Badge variant="ok">In service</Badge>
      </header>

      {duty.vehicle && heading && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-lg font-extrabold">{duty.vehicle.registrationNumber}</p>
            <p className="text-xs text-muted">{duty.vehicle.mileage.toLocaleString()} km</p>
          </div>
          <div className="mt-3 rounded-md bg-driver-blue-soft p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-link">Heading to</p>
            <p className="mt-1 text-sm font-extrabold">
              {heading.name.split("—")[0]?.trim() ?? heading.name} · {formatTime(heading.plannedArrival)}
            </p>
            <p className="mt-1 text-xs text-muted">{heading.address}</p>
            {passenger && <p className="mt-1 text-xs text-foreground/80">{passenger}</p>}
          </div>
        </section>
      )}

      {pickupProfile && <PassengerPickupBrief dutyId={dutyId} profile={pickupProfile} />}

      <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
        <Link to={`/duties/${dutyId}/nav`}>Open navigation</Link>
      </Button>

      <TripRouteTimeline stops={stops} title="Route progress" />

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">On journey actions</p>
        <div className="mt-2 space-y-2">
          {[
            { label: "Report delay", href: `/duties/${dutyId}/journey/delay` },
            { label: "Rest break", href: `/duties/${dutyId}/journey/break` },
            { label: "Report defect", href: `/duties/${dutyId}/journey/defect` },
            { label: "Add journey note", href: `/duties/${dutyId}/journey/note` },
            { label: "Vehicle swap", href: `/duties/${dutyId}/journey/swap` },
            { label: "Stop progress", href: `/duties/${dutyId}/journey/progress` },
            { label: "End journey", href: `/duties/${dutyId}/journey/end`, muted: true },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className={`block rounded-md border border-border bg-card px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest ${
                action.muted ? "text-muted" : "text-link"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <JourneyHelpLauncher dutyId={dutyId} />
    </div>
  );
}
