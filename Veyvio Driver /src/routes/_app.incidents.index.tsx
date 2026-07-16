import { createFileRoute, Link } from "@tanstack/react-router";
import { categoryLabel, driverReportStageLabel } from "@veyvio/incidents";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { useIncidentStore } from "@/store/incidents";

export const Route = createFileRoute("/_app/incidents/")({
  head: () => ({ meta: [{ title: "Incidents — Veyvio Driver" }] }),
  component: IncidentsIndexPage,
});

function IncidentsIndexPage() {
  const records = useIncidentStore((s) => s.records);

  return (
    <MoreSubpageLayout title="Incidents" backTo="/">
      <p className="text-sm text-muted">
        Operational incidents reported from this device. Control receives the same record shown in Admin Command.
      </p>
      <Link
        to="/incidents/report"
        className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-primary text-sm font-extrabold text-primary-foreground shadow"
      >
        Report incident
      </Link>
      {records.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">No incidents reported from this phone yet.</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <Link
              key={record.localIncidentId}
              to="/incidents/$incidentId"
              params={{ incidentId: record.localIncidentId }}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-secondary/30"
            >
              <p className="font-semibold">{record.incidentReference ?? record.localIncidentId}</p>
              <p className="mt-1 text-sm">{categoryLabel(record.submission.categoryCode)}</p>
              <p className="mt-2 text-xs text-muted">{driverReportStageLabel(record.submission.stage)}</p>
            </Link>
          ))}
        </div>
      )}
    </MoreSubpageLayout>
  );
}
