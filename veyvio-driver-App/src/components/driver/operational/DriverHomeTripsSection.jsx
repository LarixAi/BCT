import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { JobHubCard } from "@/components/driver/jobs/JobsHubCards";
import { op } from "@/lib/driver-operational-theme";

export default function DriverHomeTripsSection({ isSignedOn, trips }) {
  const {
    current,
    upcoming,
    upcomingTotal,
    unclaimed,
    loading,
    error,
    hasTrips,
  } = trips;

  if (!isSignedOn) {
    return (
      <section className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Radio className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Trips appear when you&apos;re online</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign on for duty to see assigned PHV route jobs and PCO short trips on this screen.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 h-9 rounded-lg">
              <Link to="/duty">Sign on for duty</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4 space-y-3" aria-label="Today's trips">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-[#1eaeae]" />
          <h2 className="text-sm font-bold text-foreground">Today&apos;s trips</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Online
          </span>
        </div>
        <Link to="/jobs" className="inline-flex items-center gap-0.5 text-xs font-medium text-[#1eaeae]">
          All jobs
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? <DriverPageLoader label="Loading trips…" /> : null}

      {error ? (
        <div className={`p-3 text-sm text-destructive ${op.card}`}>Could not load trips. Pull to refresh.</div>
      ) : null}

      {!loading && !error && !hasTrips ? (
        <div className={`p-4 text-sm ${op.card}`}>
          <p className="font-medium text-foreground">No trips assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            New jobs from dispatch will show here while you&apos;re signed on.
          </p>
        </div>
      ) : null}

      {!loading && !error && current ? (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active trip</p>
          <JobHubCard job={current} variant="current" />
        </div>
      ) : null}

      {!loading && !error && upcoming.length > 0 ? (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming{upcomingTotal > upcoming.length ? ` · ${upcomingTotal} total` : ""}
          </p>
          <div className="space-y-3">
            {upcoming.map((job) => (
              <JobHubCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && unclaimed.length > 0 ? (
        <div className={`p-3 text-sm ${op.card}`}>
          <p className="font-medium text-foreground">
            {unclaimed.length} available job{unclaimed.length !== 1 ? "s" : ""}
          </p>
          <Link to="/jobs" className="mt-1 inline-block text-xs font-semibold text-[#1eaeae]">
            View and accept →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
