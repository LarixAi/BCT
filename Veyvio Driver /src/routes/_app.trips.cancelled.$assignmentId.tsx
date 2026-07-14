import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban } from "lucide-react";
import { TripStatusBadge } from "@/components/driver/trips/TripAssignmentCard";
import { assignmentTypeLabel } from "@/domain/trips/trip-helpers";
import { getCancelledAssignment } from "@/data/mocks/trips-schedule";
import { formatTime } from "@/lib/utils";

export const Route = createFileRoute("/_app/trips/cancelled/$assignmentId")({
  head: () => ({ meta: [{ title: "Trip cancelled — Veyvio Driver" }] }),
  component: TripCancelledPage,
});

function TripCancelledPage() {
  const { assignmentId } = Route.useParams();
  const trip = getCancelledAssignment(assignmentId);

  if (!trip) {
    return (
      <div className="space-y-4">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Back to trips
        </Link>
        <p className="text-sm text-muted">Cancellation not found.</p>
      </div>
    );
  }

  const title = trip.runName ?? assignmentTypeLabel(trip.assignmentType);

  return (
    <div className="animate-in-up space-y-5 pb-6" data-testid="trip-cancelled-page">
      <header className="space-y-3">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Trips
        </Link>
        <div className="flex items-start gap-3 rounded-xl border border-vor/30 bg-vor/5 p-4">
          <Ban className="mt-0.5 size-5 shrink-0 text-vor" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-vor">Trip cancelled</p>
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted">{trip.reference}</p>
          </div>
        </div>
        <TripStatusBadge status={trip.status} />
      </header>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Reason</h2>
        <p className="text-sm leading-relaxed">{trip.cancellationReason}</p>
        {trip.cancelledAt && (
          <p className="text-xs text-muted">
            Cancelled at {formatTime(trip.cancelledAt)}
            {trip.cancelledBy ? ` by ${trip.cancelledBy}` : ""}
          </p>
        )}
      </section>

      <Link
        to="/messages/new"
        className="block w-full rounded-md border border-border py-3 text-center text-sm font-bold text-link"
      >
        Message operations
      </Link>
    </div>
  );
}
