import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { HubMiniStat, HubSectionHeading, hubListPanelClass } from "@/features/hub/HubContentPrimitives";
import { HubSecondaryButton } from "@/features/hub/HubPageHeader";
import { RegPlate, StatusChip } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { getEmptyBaysInZone, recentArrivals } from "@/features/yard/yard-map";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/_app/arrivals")({
  head: () => ({
    meta: [
      { title: "Arrivals — Veyvio Yard" },
      { name: "description", content: "Record vehicle arrivals and assign parking bays." },
    ],
  }),
  component: ArrivalsPage,
});

function ArrivalsPage() {
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const movements = useYard(s => s.movements);
  const openSheet = useYard(s => s.openSheet);

  const offSite = useMemo(() => vehicles.filter(v => v.status === "Off-site"), [vehicles]);
  const emptyParking = useMemo(() => getEmptyBaysInZone(bays, vehicles, "Parking"), [bays, vehicles]);
  const recent = useMemo(() => recentArrivals(movements), [movements]);

  return (
    <HubOpsPageLayout title="Arrivals" description="Record returning vehicles and assign bays." backTo="/more" backLabel="More">
      <DashboardSurface className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <HubMiniStat label="Off-site" value={offSite.length} />
          <HubMiniStat label="Empty bays" value={emptyParking.length} tone="ok" />
        </div>

        <section>
          <HubSectionHeading title="Awaiting arrival" />
          {offSite.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e4e7ec] py-8 text-center text-sm text-[#667085]">
              No off-site vehicles. All fleet accounted for on depot.
            </p>
          ) : (
            <div className={hubListPanelClass}>
              {offSite.map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <RegPlate reg={v.reg} />
                    <StatusChip status={v.status} />
                  </div>
                  <PermissionGate permission="vehicle.move">
                    <HubSecondaryButton
                      onClick={() => openSheet({ kind: "arrival", vehicleId: v.id })}
                      className="shrink-0 px-4"
                    >
                      <LogIn className="size-4" />
                      Record
                    </HubSecondaryButton>
                  </PermissionGate>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <HubSectionHeading
            title="Other arrivals"
            action={
              <PermissionGate permission="vehicle.move">
                <HubSecondaryButton onClick={() => openSheet({ kind: "arrival" })} className="px-4">
                  Park any vehicle
                </HubSecondaryButton>
              </PermissionGate>
            }
          />
        </section>

        {recent.length > 0 && (
          <section>
            <HubSectionHeading title="Recent" />
            <div className={hubListPanelClass}>
              {recent.map(m => {
                const v = vehicles.find(x => x.id === m.vehicleId);
                return (
                  <div key={m.id} className="p-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <RegPlate reg={v?.reg ?? "—"} />
                      <span className="font-mono text-[#667085]">{m.toBayId}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#667085]">
                      {m.by} · {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </DashboardSurface>
    </HubOpsPageLayout>
  );
}
