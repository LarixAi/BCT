import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/vehicle")({
  head: () => ({ meta: [{ title: "Vehicle — Veyvio Driver" }] }),
  component: DutyVehiclePage,
});

function DutyVehiclePage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  useEffect(() => {
    void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  const vehicle = duty?.vehicle;

  return (
    <FocusedPageShell
      title="Assigned vehicle"
      backLabel="Duties"
      onBack={() =>
        void navigate({ to: "/trips", search: { demo: "normal", dutyId } })
      }
      eyebrow="Vehicle"
      subtitle="Confirm this matches the vehicle in front of you."
    >
      {!vehicle ? (
        <p className="text-sm text-muted">No vehicle assigned to this duty.</p>
      ) : (
        <dl className="animate-in-up space-y-4 rounded-[14px] border border-border bg-background p-4 text-sm">
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Registration
            </dt>
            <dd className="mt-1 font-mono text-lg font-extrabold">{vehicle.registrationNumber}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">Fleet</dt>
            <dd className="mt-1 font-semibold">{vehicle.fleetNumber}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Make / model
            </dt>
            <dd className="mt-1 font-semibold">
              {vehicle.make} {vehicle.model}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Capacity
            </dt>
            <dd className="mt-1 font-semibold">
              {vehicle.seatingCapacity} seats · {vehicle.wheelchairCapacity} wheelchair
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Mileage
            </dt>
            <dd className="mt-1 font-semibold tabular-nums">{vehicle.mileage.toLocaleString()} mi</dd>
          </div>
        </dl>
      )}
    </FocusedPageShell>
  );
}
