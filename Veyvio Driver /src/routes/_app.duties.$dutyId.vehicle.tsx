import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/vehicle")({
  head: () => ({ meta: [{ title: "Vehicle — Veyvio Driver" }] }),
  component: DutyVehiclePage,
});

function DutyVehiclePage() {
  const { dutyId } = Route.useParams();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  useEffect(() => {
    void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  const vehicle = duty?.vehicle;
  if (!vehicle) return <p className="text-sm text-muted">No vehicle assigned.</p>;

  return (
    <div className="space-y-4 animate-in-up">
      <h1 className="font-display text-xl font-extrabold">Vehicle</h1>
      <dl className="space-y-2 text-sm">
        <div><dt className="text-muted">Registration</dt><dd className="font-mono font-bold">{vehicle.registrationNumber}</dd></div>
        <div><dt className="text-muted">Fleet</dt><dd>{vehicle.fleetNumber}</dd></div>
        <div><dt className="text-muted">Make / model</dt><dd>{vehicle.make} {vehicle.model}</dd></div>
        <div><dt className="text-muted">Capacity</dt><dd>{vehicle.seatingCapacity} seats · {vehicle.wheelchairCapacity} wheelchair</dd></div>
        <div><dt className="text-muted">Mileage</dt><dd>{vehicle.mileage.toLocaleString()} mi</dd></div>
      </dl>
    </div>
  );
}
