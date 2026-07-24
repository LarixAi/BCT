import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Droplets,
  Fuel,
  MapPin,
  MoveRight,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { useYard } from "@/store/yard";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { RegPlate } from "@/components/yard/primitives";
import { resolveDemoDriverName } from "@/platform/yard/demo-drivers";
import { formatFuelPct } from "@/lib/format-fuel-pct";
import { useCan } from "@/platform/permissions/use-can";
import { DashboardSurface, StatusPill } from "@/features/home/HomeDashboardPrimitives";
import { statusLabel, statusPillTone } from "@/domain/yard/status-display";

export const Route = createFileRoute("/_app/yard/$vehicleId/")({
  head: ({ params }) => ({
    meta: [
      { title: `Vehicle ${params.vehicleId} — Veyvio Yard` },
      { name: "description", content: "Vehicle detail: status, defects, movement history and yard actions." },
    ],
  }),
  component: VehicleDetail,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
  errorComponent: ({ error }) => <p className="p-8 text-center text-vor">{error.message}</p>,
});

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const allDefects = useYard(s => s.defects);
  const allMovements = useYard(s => s.movements);
  const allVorCases = useYard(s => s.vorCases);
  const defects = useMemo(() => allDefects.filter(d => d.vehicleId === vehicleId && !d.resolved), [allDefects, vehicleId]);
  const movements = useMemo(() => allMovements.filter(m => m.vehicleId === vehicleId), [allMovements, vehicleId]);
  const vorCases = useMemo(() => allVorCases.filter(c => c.vehicleId === vehicleId), [allVorCases, vehicleId]);
  const dataSource = useYard(s => s.dataSource);
  const trip = useYard(s => s.trips.find(t => t.vehicleId === vehicleId));
  const openSheet = useYard(s => s.openSheet);
  const canSpotAudit = useCan("check.spot_audit");

  if (!vehicle) throw notFound();

  const driverName = resolveDemoDriverName(trip?.driverId, dataSource);
  const isVor = vehicle.status === "VOR";

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      <Link
        to="/yard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#667085] transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Vehicles
      </Link>

      <DashboardSurface className={isVor ? "border-[#fecdca] bg-[#fffbfa]" : ""}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RegPlate reg={vehicle.reg} tone={isVor ? "vor" : "default"} className="text-base" />
              <StatusPill label={statusLabel(vehicle.status)} tone={statusPillTone(vehicle.status)} />
            </div>
            <p className="mt-2 text-sm text-[#667085]">
              {vehicle.type}
              <span className="mx-1.5 text-[#d0d5dd]">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                Bay {vehicle.bayId}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#667085]">
              <span className="inline-flex items-center gap-1.5">
                <Fuel className="size-3.5" aria-hidden />
                {formatFuelPct(vehicle.fuelPct)} fuel
              </span>
              {vehicle.lastCheckAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  Last check {formatTime(vehicle.lastCheckAt)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#e4e7ec] bg-[#f9fafb] font-mono text-lg font-bold text-ink">
            {vehicle.bayId}
          </div>
        </div>

        {vehicle.notes ? (
          <p className="mt-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">
            {vehicle.notes}
          </p>
        ) : null}

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1">
          <PermissionGate permission="check.complete">
            <Link
              to="/yard/$vehicleId/check"
              params={{ vehicleId: vehicle.id }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white"
            >
              <ClipboardCheck className="size-4" aria-hidden />
              Start check
            </Link>
          </PermissionGate>
          {canSpotAudit ? (
            <Link
              to="/yard/$vehicleId/check"
              params={{ vehicleId: vehicle.id }}
              search={{ type: "yard-spot" }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm"
            >
              <Search className="size-4 text-[#667085]" aria-hidden />
              Spot audit
            </Link>
          ) : null}
          <PermissionGate permission="vehicle.move">
            <button
              type="button"
              onClick={() => openSheet({ kind: "move", vehicleId: vehicle.id })}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm"
            >
              <MoveRight className="size-4 text-[#667085]" aria-hidden />
              Move
            </button>
          </PermissionGate>
          <PermissionGate permission="vehicle.move">
            <Link
              to="/yard/$vehicleId/adblue/refill"
              params={{ vehicleId: vehicle.id }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm"
            >
              <Droplets className="size-4 text-[#667085]" aria-hidden />
              AdBlue
            </Link>
          </PermissionGate>
          <button
            type="button"
            onClick={() => openSheet({ kind: "defect", vehicleId: vehicle.id })}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#fecdca] bg-[#fffbfa] px-4 text-sm font-medium text-[#b42318]"
          >
            <TriangleAlert className="size-4" aria-hidden />
            Report defect
          </button>
        </div>
      </DashboardSurface>

      {trip ? (
        <DashboardSurface>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">Assigned trip</h2>
            <StatusPill label={trip.ready ? "Ready" : "Blocked"} tone={trip.ready ? "ok" : "warn"} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {trip.code} — {trip.service}
              </p>
              <p className="mt-1 text-sm text-[#667085]">
                Depart {trip.departAt}
                <span className="mx-1.5 text-[#d0d5dd]">·</span>
                Driver {driverName ?? <span className="text-[#b42318]">unassigned</span>}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" aria-hidden />
          </div>
        </DashboardSurface>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardSurface>
          <h2 className="mb-3 text-base font-semibold text-ink">Movement history</h2>
          {movements.length === 0 ? (
            <p className="text-sm text-[#667085]">No movements recorded.</p>
          ) : (
            <ul className="space-y-2">
              {movements.slice(0, 8).map(m => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3"
                >
                  <MapPin className="size-4 shrink-0 text-[#98a2b3]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium text-ink">
                      {m.fromBayId} → {m.toBayId}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#667085]">{m.reason}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-[#98a2b3]">{formatTime(m.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardSurface>

        <div className="space-y-4">
          {vorCases.length > 0 ? (
            <DashboardSurface className="border-[#fecdca]">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[#b42318]">
                <ShieldAlert className="size-4" aria-hidden />
                VOR cases
              </h2>
              <div className="space-y-2">
                {vorCases.map(c => (
                  <Link
                    key={c.id}
                    to="/vor/$caseId"
                    params={{ caseId: c.id }}
                    className="flex items-center justify-between rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
                  >
                    <span className="font-mono text-sm text-ink">{c.id}</span>
                    <StatusPill label={c.lifecycle} tone="warn" />
                  </Link>
                ))}
              </div>
            </DashboardSurface>
          ) : null}

          <DashboardSurface>
            <h2 className="mb-3 text-base font-semibold text-ink">Open defects · {defects.length}</h2>
            {defects.length === 0 ? (
              <p className="text-sm text-[#667085]">No defects recorded.</p>
            ) : (
              <div className="space-y-2">
                {defects.map(d => (
                  <Link
                    key={d.id}
                    to="/defects/$defectId"
                    params={{ defectId: d.id }}
                    className="block rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{d.category}</span>
                      <SevBadge sev={d.severity} />
                    </div>
                    <p className="mt-1 text-sm text-[#667085]">{d.notes}</p>
                  </Link>
                ))}
              </div>
            )}
          </DashboardSurface>
        </div>
      </div>
    </div>
  );
}

function SevBadge({ sev }: { sev: string }) {
  const cls =
    sev === "Safety-critical"
      ? "bg-[#fef3f2] text-[#b42318] border-[#fecdca]"
      : sev === "Major"
        ? "bg-[#fff6ed] text-[#c4320a] border-[#fddcab]"
        : "bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{sev}</span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
