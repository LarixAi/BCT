import { createFileRoute, notFound } from "@tanstack/react-router";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { ReportDamageWizard } from "@/features/vehicle-bodywork/ReportDamageWizard";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/vehicle-bodywork/$vehicleId/report")({
  head: ({ params }) => ({
    meta: [{ title: yardPageTitle(`Report damage · ${params.vehicleId}`) }],
  }),
  component: ReportDamageWizardPage,
});

function ReportDamageWizardPage() {
  const { vehicleId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  if (!vehicle) throw notFound();

  return <ReportDamageWizard vehicleId={vehicleId} />;
}
