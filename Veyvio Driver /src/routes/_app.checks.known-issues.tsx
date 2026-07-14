import { createFileRoute, Link } from "@tanstack/react-router";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { HomeCard, HomeCardLabel } from "@/components/driver/home/HomeCard";

export const Route = createFileRoute("/_app/checks/known-issues")({
  head: () => ({ meta: [{ title: "Known issues — Veyvio Driver" }] }),
  component: KnownIssuesPage,
});

function KnownIssuesPage() {
  const issues = useVehicleCheckStore((s) => s.checksHome.knownIssues);

  return (
    <div className="animate-in-up space-y-4">
      <Link to="/checks" className="text-sm text-link">
        ← Checks
      </Link>
      <header>
        <h1 className="font-display text-xl font-extrabold">Known vehicle issues</h1>
        <p className="text-sm text-muted">
          Existing records from onboarding and previous inspections. These cannot be cleared by the driver.
        </p>
      </header>

      <HomeCard>
        <HomeCardLabel>Bodywork condition</HomeCardLabel>
        <ul className="mt-3 space-y-3">
          {issues.bodyworkRecords.map((r) => (
            <li key={r.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted">Recorded {r.recordedAt}</p>
            </li>
          ))}
        </ul>
      </HomeCard>

      <p className="text-xs text-muted">
        {issues.openSafetyDefectCount === 0
          ? "No open safety defects on this vehicle."
          : `${issues.openSafetyDefectCount} open safety defect(s) require Yard review.`}
      </p>
    </div>
  );
}
