import { Link } from "@tanstack/react-router";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignmentTypeLabel,
  statusLabel,
  statusTone,
  toneClasses,
} from "@/domain/trips/trip-helpers";
import { formatTime } from "@/lib/utils";
import type { DriverAssignment } from "@/types/trips";
import { cn } from "@/lib/utils";
import {
  AssignmentMetadataRow,
  buildMetadataSummary,
  JourneyRoute,
  VehicleRow,
} from "./JourneyRoute";

export function TripStatusBadge({ status }: { status: DriverAssignment["status"] }) {
  const tone = statusTone(status);
  const classes = toneClasses(tone);
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", classes.badge)}>
      {statusLabel(status)}
    </span>
  );
}

interface TripAssignmentCardProps {
  assignment: DriverAssignment;
  variant?: "default" | "compact" | "next" | "active";
  showTime?: boolean;
}

export function TripAssignmentCard({
  assignment,
  variant = "default",
  showTime = true,
}: TripAssignmentCardProps) {
  const tone = statusTone(assignment.status);
  const classes = toneClasses(tone);
  const isActive = variant === "active";
  const isNext = variant === "next";
  const isCompact = variant === "compact";

  const title = assignment.runName ?? assignmentTypeLabel(assignment.assignmentType);
  const meta = buildMetadataSummary(assignment.metadata);
  const href = assignment.primaryActionHref ?? `/trips/${assignment.id}`;

  return (
    <article
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        isActive ? cn(classes.border, classes.bg, "ring-2 ring-link/20") : "border-border bg-card",
        isNext && "border-link/25 bg-link/5",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {isNext && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-link">
                Next trip · {formatTime(assignment.scheduledStart)}
              </p>
            )}
            {isActive && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-link">In progress</p>
            )}
            {showTime && !isNext && !isActive && (
              <p className="font-mono text-sm font-semibold">{formatTime(assignment.scheduledStart)}</p>
            )}
            <TripStatusBadge status={assignment.status} />
          </div>
          {!isCompact && assignment.scheduledEnd && (
            <p className="shrink-0 text-xs text-muted">
              {formatTime(assignment.scheduledStart)}–{formatTime(assignment.scheduledEnd)}
            </p>
          )}
        </div>

        <div>
          <h3 className="font-display text-base font-extrabold tracking-tight">{title}</h3>
          {!isCompact && (
            <p className="mt-0.5 text-xs text-muted">{assignmentTypeLabel(assignment.assignmentType)}</p>
          )}
        </div>

        <JourneyRoute origin={assignment.origin} destination={assignment.destination} compact={isCompact} />

        {meta && <AssignmentMetadataRow>{meta}</AssignmentMetadataRow>}
        <VehicleRow registration={assignment.vehicleRegistration} />

        {assignment.checkInFrom && (
          <p className="text-xs text-muted">Check-in from {formatTime(assignment.checkInFrom)}</p>
        )}

        {assignment.delayLabel && (
          <p className="text-xs font-medium text-warn">{assignment.delayLabel}</p>
        )}

        {assignment.hasOfficeChange && assignment.officeChangeSummary && (
          <p className="rounded-md border border-warn/30 bg-warn/5 px-2 py-1.5 text-xs text-warn">
            {assignment.officeChangeSummary}
          </p>
        )}

        {assignment.cancellationReason && (
          <p className="text-xs text-vor">
            Cancelled{assignment.cancelledBy ? ` by ${assignment.cancelledBy}` : ""}
            {assignment.cancellationReason ? `: ${assignment.cancellationReason}` : ""}
          </p>
        )}

        {!isCompact && (
          <div className={cn("flex gap-2", isActive && "flex-col sm:flex-row")}>
            <Button asChild className="flex-1" size={isActive ? "lg" : "default"}>
              <Link to={href}>{assignment.primaryActionLabel}</Link>
            </Button>
            {isActive && (
              <Button variant="outline" className="flex-1" size="lg">
                <Navigation className="size-4" />
                Navigate
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ActiveTripCard({ assignment }: { assignment: DriverAssignment }) {
  return (
    <section className="space-y-3">
      {assignment.currentStop && (
        <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Current stop</p>
          <p className="font-medium">{assignment.currentStop}</p>
          {assignment.nextStop && (
            <>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted">Next</p>
              <p className="font-medium">{assignment.nextStop}</p>
            </>
          )}
        </div>
      )}
      <TripAssignmentCard assignment={assignment} variant="active" showTime />
    </section>
  );
}

export function NextTripCard({ assignment }: { assignment: DriverAssignment }) {
  return <TripAssignmentCard assignment={assignment} variant="next" />;
}

export function CompactTripCard({ assignment }: { assignment: DriverAssignment }) {
  const href = assignment.primaryActionHref ?? `/trips/${assignment.id}`;
  const title = assignment.runName ?? assignmentTypeLabel(assignment.assignmentType);

  return (
    <Link
      to={href}
      className="flex items-start gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 transition-colors hover:bg-secondary/40"
    >
      <span className="shrink-0 font-mono text-sm font-semibold">{formatTime(assignment.scheduledStart)}</span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <TripStatusBadge status={assignment.status} />
        </div>
        <p className="truncate text-xs text-muted">
          {assignment.origin} → {assignment.destination}
        </p>
      </div>
    </Link>
  );
}
