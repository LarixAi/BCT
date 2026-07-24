import { useMemo } from "react";
import { createFileRoute, Link, notFound, Outlet, useRouterState } from "@tanstack/react-router";
import { Camera, ChevronRight, ClipboardList, History, MapPin, ShieldAlert } from "lucide-react";
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
  vehicleNeedsBaseline,
} from "@/domain/condition/condition-helpers";
import { statusLabel, statusPillTone } from "@/domain/yard/status-display";
import { DashboardSurface, StatusPill } from "@/features/home/HomeDashboardPrimitives";
import { useYard } from "@/store/yard";
import type { VehicleConditionProfile } from "@/types/condition";

export const Route = createFileRoute("/_app/yard/$vehicleId/condition")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.vehicleId} Condition — Veyvio Yard` },
      { name: "description", content: "Vehicle condition record: damage, inspections, evidence and history." },
    ],
  }),
  component: ConditionPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
});

function ConditionPage() {
  const { vehicleId } = Route.useParams();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isNestedWorkflow =
    pathname.includes("/condition/inspect") ||
    pathname.includes("/condition/compare") ||
    pathname.includes("/condition/damage/");

  if (isNestedWorkflow) {
    return <Outlet />;
  }

  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const profiles = useYard(s => s.conditionProfiles);
  const damageRecords = useYard(s => s.damageRecords);
  const observations = useYard(s => s.damageObservations);
  const inspections = useYard(s => s.inspections);
  const snapshots = useYard(s => s.conditionSnapshots);
  const custody = useYard(s => s.custodyTimeline);

  if (!vehicle) throw notFound();

  const profile = getConditionProfile(profiles, vehicleId);
  const openDamage = useMemo(() => openDamageForVehicle(damageRecords, vehicleId), [damageRecords, vehicleId]);
  const zones = getBodyZones(vehicle.type);
  const snapshot = latestApprovedSnapshot(snapshots, vehicleId);
  const history = useMemo(() => inspectionsForVehicle(inspections, vehicleId), [inspections, vehicleId]);
  const pendingObs = observations.filter(
    o => o.vehicleId === vehicleId && ["new_not_reported", "possible_new_review"].includes(o.classification),
  );
  const vehicleCustody = custody.filter(c => c.vehicleId === vehicleId).slice(0, 6);

  const needsBaseline = vehicleNeedsBaseline(profile);
  const isVor = vehicle.status === "VOR";

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      <DashboardSurface className={needsBaseline ? "border-[#fecdca] bg-[#fffbfa]" : ""}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-ink sm:text-lg">Condition</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RegPlate reg={vehicle.reg} tone={isVor ? "vor" : "default"} className="text-base" />
              <StatusPill label={statusLabel(vehicle.status)} tone={statusPillTone(vehicle.status)} />
              <StatusPill
                label={conditionStatusLabel(profile)}
                tone={conditionStatusTone(profile)}
              />
            </div>
            <p className="mt-2 text-sm text-[#667085]">
              {vehicle.type}
              <span className="mx-1.5 text-[#d0d5dd]">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                Bay {vehicle.bayId}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink">{conditionSummaryText(vehicle, profile, openDamage)}</p>

        {needsBaseline ? (
          <p className="mt-3 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">
            Onboarding baseline required before this vehicle can enter service.
          </p>
        ) : null}

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link
            to="/yard/$vehicleId/condition/inspect"
            params={{ vehicleId }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white"
          >
            <Camera className="size-4" aria-hidden />
            Start inspection
          </Link>
          <Link
            to="/yard/$vehicleId/check"
            params={{ vehicleId }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm"
          >
            <ClipboardList className="size-4 text-[#667085]" aria-hidden />
            Yard check
          </Link>
        </div>
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
          <p className="text-sm text-[#667085]">No open damage records.</p>
        ) : (
          <div className="space-y-2">
            {openDamage.map(d => (
              <Link
                key={d.id}
                to="/yard/$vehicleId/condition/damage/$damageId"
                params={{ vehicleId, damageId: d.id }}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-ink">{formatDamageRef(d.id)}</span>
                    <DamageSeverityPill severity={d.severity} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink">{d.title}</p>
                  <p className="mt-0.5 text-xs text-[#667085]">
                    First seen {new Date(d.firstObservedAt).toLocaleDateString("en-GB")} · {d.status.replace(/_/g, " ")}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" aria-hidden />
              </Link>
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
                {insp.checkId ? (
                  <p className="mt-1 text-xs text-[#98a2b3]">Linked yard check</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardSurface>

      {vehicleCustody.length > 0 ? (
        <DashboardSurface>
          <h2 className="text-base font-semibold text-ink">Custody timeline</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Who had the vehicle between inspections — narrows review, does not assign blame.
          </p>
          <ul className="mt-3 space-y-2">
            {vehicleCustody.map(c => (
              <li
                key={c.id}
                className="flex gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-2.5 text-sm"
              >
                <span className="shrink-0 font-mono text-xs tabular-nums text-[#98a2b3]">
                  {new Date(c.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-ink">{c.label}</span>
              </li>
            ))}
          </ul>
        </DashboardSurface>
      ) : null}
    </div>
  );
}

function conditionStatusLabel(profile: VehicleConditionProfile): string {
  if (profile.baselineStatus === "approved") {
    if (profile.conditionRating === "unknown") return "Condition unknown";
    return profile.conditionRating.charAt(0).toUpperCase() + profile.conditionRating.slice(1);
  }
  return profile.baselineStatus.replace(/_/g, " ");
}

function conditionStatusTone(
  profile: VehicleConditionProfile,
): "neutral" | "progress" | "ok" | "warn" | "review" {
  if (profile.baselineStatus !== "approved") return "progress";
  if (profile.conditionRating === "good") return "ok";
  if (profile.conditionRating === "fair") return "warn";
  return "neutral";
}

function DamageSeverityPill({ severity }: { severity: string }) {
  const label = severity.replace(/_/g, " ");
  const cls =
    severity === "safety_critical"
      ? "bg-[#fef3f2] text-[#b42318] border-[#fecdca]"
      : severity === "operational"
        ? "bg-[#fff6ed] text-[#c4320a] border-[#fddcab]"
        : "bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}
