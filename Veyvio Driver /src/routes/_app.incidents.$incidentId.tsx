import { createFileRoute, Link } from "@tanstack/react-router";
import {
  calculateCompleteness,
  categoryLabel,
  driverReportStageLabel,
  getIncidentFormDefinition,
} from "@veyvio/incidents";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { triStateLabel, useIncidentStore } from "@/store/incidents";

export const Route = createFileRoute("/_app/incidents/$incidentId")({
  head: () => ({ meta: [{ title: "Incident — Veyvio Driver" }] }),
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { incidentId } = Route.useParams();
  const record = useIncidentStore((s) => s.getRecord(incidentId));

  if (!record) {
    return (
      <MoreSubpageLayout title="Incident" backTo="/incidents">
        <p className="text-sm text-muted">Incident not found on this device.</p>
      </MoreSubpageLayout>
    );
  }

  const submission = record.submission;
  const completeness = calculateCompleteness(submission);
  const formDef = getIncidentFormDefinition(submission.categoryCode);

  return (
    <MoreSubpageLayout title={record.incidentReference ?? "Incident"} backTo="/incidents">
      <HomeCard tone={submission.stage === "complete" ? "green" : "amber"}>
        <p className="font-semibold">{driverReportStageLabel(submission.stage)}</p>
        <p className="mt-2 text-sm text-muted">
          {submission.stage === "initial_submitted"
            ? "Control has your emergency report. Complete photos, witnesses, and statements when it is safe."
            : "This incident uses the same record as Admin Command."}
        </p>
      </HomeCard>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p><span className="text-muted">Type:</span> {categoryLabel(submission.categoryCode)}</p>
        <p className="mt-2"><span className="text-muted">Vehicle:</span> {submission.operationalContext.vehicleRegistration ?? "—"}</p>
        <p className="mt-2"><span className="text-muted">Journey:</span> {submission.operationalContext.runReference ?? "—"}</p>
        <p className="mt-2"><span className="text-muted">Report completeness:</span> {completeness.overall}%</p>
        {record.syncStatus === "pending_upload" && (
          <p className="mt-2 text-warn">Captured offline — waiting to upload when connection returns.</p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Your initial answers</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {[...formDef.immediateFields, ...formDef.followUpFields.filter((f) => submission.answers[f.key])].map((field) => {
            const answer = field.key === "immediateDanger" ? submission.immediateDanger : submission.answers[field.key];
            if (!answer) return null;
            const display =
              field.type === "tristate"
                ? triStateLabel(answer.value as import("@veyvio/incidents").TriStateAnswer)
                : String(answer.value);
            return (
              <div key={field.key} className="px-4 py-3">
                <p className="text-xs text-muted">{field.label}</p>
                <p className="text-sm font-medium">{display}</p>
                {answer.confidence === "UNCONFIRMED" && (
                  <p className="mt-1 text-xs text-warn">Not yet confirmed</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {completeness.missingFields.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Still needed</h2>
          <ul className="list-inside list-disc rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
            {completeness.missingFields.slice(0, 6).map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </section>
      )}

      <Link
        to="/incidents/$incidentId/complete"
        params={{ incidentId }}
        className="flex h-12 items-center justify-center rounded-xl bg-accent text-sm font-bold uppercase tracking-widest text-white"
      >
        {submission.stage === "initial_submitted" ? "Complete full report" : "Continue full report"}
      </Link>
    </MoreSubpageLayout>
  );
}
