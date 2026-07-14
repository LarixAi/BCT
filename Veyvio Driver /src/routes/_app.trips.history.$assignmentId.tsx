import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripStatusBadge } from "@/components/driver/trips/TripAssignmentCard";
import { TripJobSummaryCard, TripRouteTimeline } from "@/components/driver/trips/TripRouteTimeline";
import { assignmentTypeLabel } from "@/domain/trips/trip-helpers";
import { getTripDetail } from "@/data/mocks/trips-schedule";

export const Route = createFileRoute("/_app/trips/history/$assignmentId")({
  head: () => ({ meta: [{ title: "Trip record — Veyvio Driver" }] }),
  loader: ({ params }) => ({ trip: getTripDetail(params.assignmentId) }),
  component: TripHistoryDetailPage,
});

function TripHistoryDetailPage() {
  const { assignmentId } = Route.useParams();
  const loaderTrip = Route.useLoaderData()?.trip;
  const trip = loaderTrip ?? getTripDetail(assignmentId);

  if (!trip) {
    return (
      <div className="space-y-4">
        <Link to="/trips/history" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Trip history
        </Link>
        <p className="text-sm text-muted">Record not found.</p>
      </div>
    );
  }

  const title = trip.runName ?? assignmentTypeLabel(trip.assignmentType);
  const stops = trip.stopTimeline ?? [];

  return (
    <div className="animate-in-up space-y-5 pb-6" data-testid="trip-history-detail">
      <header className="space-y-3">
        <Link to="/trips/history" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Trip history
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Completed record · {trip.reference}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TripStatusBadge status={trip.status} />
            <Badge variant="default">{assignmentTypeLabel(trip.assignmentType)}</Badge>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Journey summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {trip.actualStart && trip.actualEnd && (
            <p>
              Actual: <span className="font-semibold">{trip.actualStart}–{trip.actualEnd}</span>
              {trip.delayLabel && (
                <span className="ml-2 text-warn">{trip.delayLabel}</span>
              )}
            </p>
          )}
          <p className="font-mono font-bold">{trip.vehicleRegistration}</p>
          {trip.debriefCompleted && (
            <p className="flex items-center gap-1 text-ok">
              <CheckCircle2 className="size-4" />
              Debrief completed
            </p>
          )}
          {trip.debriefRequired && !trip.debriefCompleted && (
            <p className="flex items-center gap-1 text-warn">
              <AlertTriangle className="size-4" />
              Debrief still required
            </p>
          )}
          {trip.hadIncident && (
            <p className="text-vor">Incident reported on this journey</p>
          )}
        </CardContent>
      </Card>

      {stops.length > 0 && (
        <TripRouteTimeline stops={stops} data-testid="trip-full-route" />
      )}

      <TripJobSummaryCard trip={trip} />
    </div>
  );
}
