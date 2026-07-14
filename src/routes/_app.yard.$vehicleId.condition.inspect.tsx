import { createFileRoute, notFound } from "@tanstack/react-router";
import { GuidedInspectionWizard } from "@/components/condition/GuidedInspectionWizard";
import { useYard } from "@/store/yard";
import type { InspectionType } from "@/types/condition";

const VALID: InspectionType[] = [
  "onboarding-baseline", "yard-check", "weekly-bodywork", "post-repair", "return-to-yard",
];

export const Route = createFileRoute("/_app/yard/$vehicleId/condition/inspect")({
  component: InspectPage,
  validateSearch: (s: Record<string, unknown>) => ({
    type: typeof s.type === "string" && VALID.includes(s.type as InspectionType) ? s.type as InspectionType : undefined,
    repairOrderId: typeof s.repairOrderId === "string" ? s.repairOrderId : undefined,
  }),
});

function InspectPage() {
  const { vehicleId } = Route.useParams();
  const { type, repairOrderId } = Route.useSearch();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  if (!vehicle) throw notFound();
  return <GuidedInspectionWizard vehicleId={vehicleId} initialType={type} repairOrderId={repairOrderId} />;
}
