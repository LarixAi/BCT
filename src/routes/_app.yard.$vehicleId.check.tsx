import { createFileRoute, notFound } from "@tanstack/react-router";
import { YardCheckWizard } from "@/components/yard/YardCheckWizard";
import { useYard } from "@/store/yard";
import type { YardCheckType } from "@/types/yard-check";

const VALID_TYPES = new Set<YardCheckType>([
  "start-of-day",
  "driver-changeover",
  "between-run",
  "return-to-yard",
  "yard-spot",
  "first-use",
  "vor-assessment",
  "return-to-service",
  "scheduled-inspection",
]);

export const Route = createFileRoute("/_app/yard/$vehicleId/check")({
  head: ({ params }) => ({
    meta: [
      { title: `Vehicle Check ${params.vehicleId} — Veyvio Yard` },
      { name: "description", content: "DVSA-aligned PSV walkaround with yard readiness, equipment and job suitability." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    type: typeof search.type === "string" && VALID_TYPES.has(search.type as YardCheckType)
      ? (search.type as YardCheckType)
      : undefined,
  }),
  component: VehicleCheckPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
});

function VehicleCheckPage() {
  const { vehicleId } = Route.useParams();
  const { type } = Route.useSearch();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  if (!vehicle) throw notFound();
  return <YardCheckWizard vehicleId={vehicleId} initialCheckType={type} />;
}
