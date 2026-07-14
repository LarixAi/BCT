import { createFileRoute, Link } from "@tanstack/react-router";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { IncidentCompletionWizard } from "@/components/driver/incidents/IncidentCompletionWizard";
import { useIncidentStore } from "@/store/incidents";

export const Route = createFileRoute("/_app/incidents/$incidentId/complete")({
  head: () => ({ meta: [{ title: "Complete incident — Veyvio Driver" }] }),
  component: IncidentCompletePage,
});

function IncidentCompletePage() {
  const { incidentId } = Route.useParams();
  const record = useIncidentStore((s) => s.getRecord(incidentId));

  if (!record) {
    return (
      <MoreSubpageLayout title="Complete report" backTo="/incidents">
        <p className="text-sm text-muted">Incident not found on this device.</p>
      </MoreSubpageLayout>
    );
  }

  if (record.submission.stage === "complete") {
    return (
      <MoreSubpageLayout title="Complete report" backTo={`/incidents/${incidentId}`}>
        <p className="text-sm text-muted">This incident report is already complete.</p>
        <Link to="/incidents/$incidentId" params={{ incidentId }} className="text-sm font-semibold text-link">
          View incident
        </Link>
      </MoreSubpageLayout>
    );
  }

  return (
    <MoreSubpageLayout title="Complete report" backTo={`/incidents/${incidentId}`}>
      <IncidentCompletionWizard recordId={incidentId} />
    </MoreSubpageLayout>
  );
}
