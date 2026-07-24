import { createFileRoute, notFound } from "@tanstack/react-router";
import { GuidedInspectionWizard } from "@/components/condition/GuidedInspectionWizard";
import { useYard } from "@/store/yard";
import {
  isInspectionTypeAllowed,
} from "@/domain/condition/inspection-type-options";
import type { InspectionType } from "@/types/condition";

export const Route = createFileRoute("/_app/yard/$vehicleId/condition/inspect")({
  component: InspectPage,
  validateSearch: (s: Record<string, unknown>) => ({
    type: typeof s.type === "string" && isInspectionTypeAllowed(s.type as InspectionType, "vehicle-condition")
      ? s.type as InspectionType
      : undefined,
    repairOrderId: typeof s.repairOrderId === "string" ? s.repairOrderId : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
  }),
});

function InspectPage() {
  const { vehicleId } = Route.useParams();
  const { type, repairOrderId, from } = Route.useSearch();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  if (!vehicle) throw notFound();
  return (
    <GuidedInspectionWizard
      vehicleId={vehicleId}
      initialType={type}
      repairOrderId={repairOrderId}
      context={repairOrderId ? "repair-verification" : from === "inspections" ? "inspections-hub" : "vehicle-condition"}
    />
  );
}
