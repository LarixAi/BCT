import { createFileRoute } from "@tanstack/react-router";
import type { IncidentCategoryCode } from "@veyvio/incidents";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { IncidentReportWizard } from "@/components/driver/incidents/IncidentReportWizard";

type ReportSearch = {
  category?: IncidentCategoryCode;
};

export const Route = createFileRoute("/_app/incidents/report")({
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    category: search.category as IncidentCategoryCode | undefined,
  }),
  head: () => ({ meta: [{ title: "Report incident — Veyvio Driver" }] }),
  component: IncidentReportPage,
});

function IncidentReportPage() {
  const { category } = Route.useSearch();
  return (
    <MoreSubpageLayout title="Report incident" backTo="/incidents">
      <IncidentReportWizard presetCategory={category} />
    </MoreSubpageLayout>
  );
}
