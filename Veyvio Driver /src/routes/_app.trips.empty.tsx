import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarX } from "lucide-react";
import { TripsHeader } from "@/components/driver/trips/TripsHeader";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/trips/empty")({
  head: () => ({ meta: [{ title: "No trips — Veyvio Driver" }] }),
  component: TripsEmptyPage,
});

function TripsEmptyPage() {
  const homeSummary = useDriverStore((s) => s.homeSummary);

  return (
    <div className="animate-in-up space-y-6" data-testid="trips-empty-page">
      <TripsHeader summary={homeSummary} />

      <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <CalendarX className="size-7 text-muted" strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 font-display text-xl font-extrabold tracking-tight">
          No trips assigned today
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Operations have not scheduled any work for you yet. Check back later or contact the depot
          if you expected a duty.
        </p>
        <Link
          to="/messages/new"
          className="mt-6 inline-block text-sm font-bold text-link"
        >
          Message operations
        </Link>
      </div>

      <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
        <ArrowLeft className="size-4" />
        Back to trips schedule
      </Link>
    </div>
  );
}
