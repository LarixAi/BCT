import { createFileRoute, notFound } from "@tanstack/react-router";
import { GuidedInspectionWizard } from "@/components/condition/GuidedInspectionWizard";
import { yardPageTitle } from "@/components/brand/brand-copy";
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

  return (
    <GuidedInspectionWizard
      vehicleId={vehicleId}
      initialType="reported-damage"
      context="vehicle-condition"
      returnTo="/vehicle-bodywork/$vehicleId"
    />
  );
}
