import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { TripStatusBadge } from "@/components/driver/trips/TripAssignmentCard";
import { assignmentTypeLabel } from "@/domain/trips/trip-helpers";
import { getTripDetail, getTripOfficeChanges } from "@/data/mocks/trips-schedule";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/trips/changed/$assignmentId")({
  head: () => ({ meta: [{ title: "Trip updated — Veyvio Driver" }] }),
  component: TripChangedPage,
});

function TripChangedPage() {
  const { assignmentId } = Route.useParams();
  const navigate = useNavigate();
  const trip = getTripDetail(assignmentId);
  const changes = getTripOfficeChanges(assignmentId);

  if (!trip) {
    return (
      <div className="space-y-4">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Back to trips
        </Link>
        <p className="text-sm text-muted">Assignment not found.</p>
      </div>
    );
  }

  const title = trip.runName ?? assignmentTypeLabel(trip.assignmentType);

  const handleAcknowledge = () => {
    navigate({ to: `/trips/${assignmentId}` });
  };

  return (
    <div className="animate-in-up space-y-5 pb-6" data-testid="trip-changed-page">
      <header className="space-y-3">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Trips
        </Link>
        <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-warn">
              Updated by Operations
            </p>
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted">{trip.reference}</p>
          </div>
        </div>
        <TripStatusBadge status={trip.status} />
      </header>

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">What changed</h2>
        <ul className="space-y-2">
          {changes.map((change) => (
            <li
              key={change.field}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <p className="font-bold">{change.field}</p>
              <p className="mt-1 text-muted">
                <span className="line-through">{change.previous}</span>
                {" → "}
                <span className="font-semibold text-foreground">{change.current}</span>
              </p>
            </li>
          ))}
        </ul>
        {trip.officeChangeSummary && (
          <p className="text-sm text-muted">{trip.officeChangeSummary}</p>
        )}
      </section>

      <Button className="w-full" onClick={handleAcknowledge}>
        Acknowledge and view trip
      </Button>
    </div>
  );
}
