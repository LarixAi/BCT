import { useMemo } from "react";
import { Link, notFound } from "@tanstack/react-router";
import {
  Camera,
  ChevronRight,
  ClipboardList,
  History,
  MapPin,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { BodyZoneDiagram } from "@/components/condition/BodyZoneDiagram";
import { RegPlate } from "@/components/yard/primitives";
import { getBodyZones } from "@/domain/condition/body-zones";
import {
  conditionSummaryText,
  formatDamageRef,
  getConditionProfile,
  inspectionsForVehicle,
  latestApprovedSnapshot,
  openDamageForVehicle,
} from "@/domain/condition/condition-helpers";
import {
  damageMarkerDisplay,
  formatFleetNumber,
  formatLastInspectionLabel,
  severityLabel,
  summarizeVehicleBodywork,
  vehicleInServiceLabel,
} from "@/domain/vehicle-bodywork/fleet-helpers";
import { statusPillTone } from "@/domain/yard/status-display";
import { DashboardSurface, StatusPill } from "@/features/home/HomeDashboardPrimitives";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useYard } from "@/store/yard";
import type { DamageRecord } from "@/types/condition";

interface VehicleBodyworkProfileProps {
  vehicleId: string;
}

export function VehicleBodyworkProfile({ vehicleId }: VehicleBodyworkProfileProps) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const profiles = useYard(s => s.conditionProfiles);
  const damageRecords = useYard(s => s.damageRecords);
  const observations = useYard(s => s.damageObservations);
  const inspections = useYard(s => s.inspections);
  const snapshots = useYard(s => s.conditionSnapshots);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const depotName = useTenancyStore(s => s.depotName);

  const profile = getConditionProfile(profiles, vehicleId);
  const openDamage = useMemo(() => openDamageForVehicle(damageRecords, vehicleId), [damageRecords, vehicleId]);
  const allDamage = useMemo(
    () => damageRecords.filter(d => d.vehicleId === vehicleId),
    [damageRecords, vehicleId],
  );
  const summary = useMemo(
    () => summarizeVehicleBodywork(vehicleId, damageRecords, inspections),
    [vehicleId, damageRecords, inspections],
  );
  const history = useMemo(() => inspectionsForVehicle(inspections, vehicleId), [inspections, vehicleId]);

  if (!vehicle) throw notFound();

  const zones = getBodyZones(vehicle.type);
  const snapshot = latestApprovedSnapshot(snapshots, vehicleId);
  const pendingObs = observations.filter(
    o => o.vehicleId === vehicleId && ["new_not_reported", "possible_new_review"].includes(o.classification),
  );
  const linkedRepairs = repairOrders.filter(r => r.vehicleId === vehicleId);

  const repairRequiredCount = openDamage.filter(d => d.status === "repair_required").length;

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      <DashboardSurface>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              to="/vehicle-bodywork"
              className="text-xs font-semibold text-[#667085] hover:text-ink"
            >
              ← Vehicle Bodywork
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="text-base" />
              <StatusPill
                label={vehicleInServiceLabel(vehicle.status)}
                tone={statusPillTone(vehicle.status)}
              />
            </div>
            <h1 className="mt-2 text-base font-semibold text-ink sm:text-lg">{vehicle.type}</h1>
            <p className="mt-1 text-sm text-[#667085]">
              Fleet number: {formatFleetNumber(vehicle.id)}
              <span className="mx-1.5 text-[#d0d5dd]">·</span>
              Depot: {depotName ?? "—"}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#667085]">
              <MapPin className="size-3.5" aria-hidden />
              Current location: Bay {vehicle.bayId}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink">{conditionSummaryText(vehicle, profile, openDamage)}</p>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link
            to="/vehicle-bodywork/$vehicleId/report"
            params={{ vehicleId }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white"
          >
            <Camera className="size-4" aria-hidden />
            Report new damage
          </Link>
          <Link
            to="/yard/$vehicleId/condition/inspect"
            params={{ vehicleId }}
            search={{ type: "weekly-bodywork", from: "vehicle-bodywork" }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm"
          >
            <ClipboardList className="size-4 text-[#667085]" aria-hidden />
            Start body inspection
          </Link>
          <Link
            to="/vehicle-bodywork/$vehicleId"
            params={{ vehicleId }}
            hash="repair-history"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm"
          >
            <History className="size-4 text-[#667085]" aria-hidden />
            View repair history
          </Link>
        </div>
      </DashboardSurface>

      <DashboardSurface>
        <h2 className="text-base font-semibold text-ink">Bodywork condition summary</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryItem label="Known damage areas" value={String(allDamage.filter(d => d.status !== "closed").length)} />
          <SummaryItem label="Open reports" value={String(summary.openReportCount)} />
          <SummaryItem label="Repair required" value={String(repairRequiredCount)} />
          <SummaryItem label="Last body inspection" value={formatLastInspectionLabel(summary.lastBodyInspectionAt).replace("Last full body inspection: ", "").replace("Last checked today · ", "Today, ")} />
        </dl>
      </DashboardSurface>

      {pendingObs.length > 0 ? (
        <DashboardSurface className="border-[#fddcab] bg-[#fff6ed]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#c4320a]">
                {pendingObs.length} observation{pendingObs.length > 1 ? "s" : ""} awaiting review
              </h2>
              <p className="mt-1 text-sm text-[#667085]">New or possible damage needs a supervisor decision.</p>
            </div>
            <Link
              to="/inspections/damage-review"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink hover:underline"
            >
              Review queue
              <ChevronRight className="size-4 text-[#98a2b3]" aria-hidden />
            </Link>
          </div>
        </DashboardSurface>
      ) : null}

      <BodyZoneDiagram zones={zones} damageRecords={openDamage} />

      <DashboardSurface>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
          <ShieldAlert className="size-4 text-[#98a2b3]" aria-hidden />
          Known damage · {openDamage.length}
        </h2>
        {openDamage.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[#667085]">
              This vehicle currently has no confirmed bodywork damage records.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/yard/$vehicleId/condition/inspect"
                params={{ vehicleId }}
                search={{ type: "weekly-bodywork", from: "vehicle-bodywork" }}
                className="inline-flex h-10 items-center rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink"
              >
                Start body inspection
              </Link>
              <Link
                to="/vehicle-bodywork/$vehicleId/report"
                params={{ vehicleId }}
                className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white"
              >
                Report damage
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {openDamage.map(d => (
              <DamageAreaCard key={d.id} vehicleId={vehicleId} record={d} />
            ))}
          </div>
        )}
      </DashboardSurface>

      {snapshot ? (
        <DashboardSurface>
          <h2 className="text-base font-semibold text-ink">Latest approved snapshot</h2>
          <p className="mt-2 text-sm text-ink">{snapshot.summary}</p>
          <p className="mt-1 text-sm text-[#667085]">
            {new Date(snapshot.approvedAt).toLocaleString("en-GB")} · {snapshot.approvedBy}
          </p>
        </DashboardSurface>
      ) : null}

      <DashboardSurface id="repair-history">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
          <Wrench className="size-4 text-[#98a2b3]" aria-hidden />
          Repair history · {linkedRepairs.length}
        </h2>
        {linkedRepairs.length === 0 ? (
          <p className="text-sm text-[#667085]">No repair work orders linked to this vehicle yet.</p>
        ) : (
          <ul className="space-y-2">
            {linkedRepairs.map(repair => (
              <li
                key={repair.id}
                className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 text-sm"
              >
                <p className="font-medium text-ink">{repair.description}</p>
                <p className="mt-0.5 text-[#667085]">
                  {repair.status.replace(/_/g, " ")} · {new Date(repair.requestedAt).toLocaleDateString("en-GB")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DashboardSurface>

      <DashboardSurface>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
          <History className="size-4 text-[#98a2b3]" aria-hidden />
          Inspection history
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-[#667085]">No inspections recorded.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 8).map(insp => (
              <li
                key={insp.id}
                className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3"
              >
                <p className="text-sm font-medium capitalize text-ink">
                  {insp.inspectionType.replace(/-/g, " ")}
                </p>
                <p className="mt-0.5 text-sm text-[#667085]">
                  {new Date(insp.completedAt ?? insp.startedAt).toLocaleString("en-GB")} · {insp.startedBy}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DashboardSurface>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#667085]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function DamageAreaCard({ vehicleId, record }: { vehicleId: string; record: DamageRecord }) {
  const marker = damageMarkerDisplay(record.status);
  return (
    <Link
      to="/vehicle-bodywork/$vehicleId/damage/$damageId"
      params={{ vehicleId, damageId: record.id }}
      className="flex items-center justify-between gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${marker.toneClass}`}
          >
            <span aria-hidden>{marker.icon}</span>
            {marker.label}
          </span>
          <span className="font-mono text-sm font-medium text-ink">{formatDamageRef(record.id)}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-ink">{record.title}</p>
        <p className="mt-0.5 text-xs text-[#667085]">
          Severity: {severityLabel(record.severity)}
          <span className="mx-1.5 text-[#d0d5dd]">·</span>
          Status: {record.status.replace(/_/g, " ")}
        </p>
        <p className="mt-0.5 text-xs text-[#667085]">
          First recorded: {new Date(record.firstObservedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" aria-hidden />
    </Link>
  );
}
