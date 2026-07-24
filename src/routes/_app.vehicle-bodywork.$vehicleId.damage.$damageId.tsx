import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Wrench } from "lucide-react";
import { RegPlate } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import { getBodyZone } from "@/domain/condition/body-zones";
import { canCompleteRepair, canStartRepair, canVerifyRepair } from "@/domain/condition/repair-workflow";
import { formatDamageRef } from "@/domain/condition/condition-helpers";
import { damageMarkerDisplay, severityLabel } from "@/domain/vehicle-bodywork/fleet-helpers";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { useYard } from "@/store/yard";
import { DAMAGE_TYPE_LABELS, OBSERVATION_LABELS } from "@/types/condition";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { useTenancyStore } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_app/vehicle-bodywork/$vehicleId/damage/$damageId")({
  component: VehicleBodyworkDamageDetailPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Damage record not found.</p>,
});

function VehicleBodyworkDamageDetailPage() {
  const { vehicleId, damageId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const record = useYard(s => s.damageRecords.find(d => d.id === damageId));
  const observations = useYard(s => s.damageObservations);
  const inspectionMedia = useYard(s => s.inspectionMedia);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const requestRepair = useYard(s => s.requestRepair);
  const startRepair = useYard(s => s.startRepairWorkOrder);
  const completeRepair = useYard(s => s.completeRepairWorkOrder);
  const depotName = useTenancyStore(s => s.depotName);

  const relatedRepairs = useMemo(
    () => repairOrders.filter(r => r.damageId === damageId || r.defectId === record?.defectId),
    [repairOrders, damageId, record?.defectId],
  );
  const relatedObs = useMemo(
    () =>
      observations.filter(
        o => o.damageId === damageId || (o.vehicleId === vehicleId && o.zoneId === record?.zoneId),
      ),
    [observations, damageId, vehicleId, record],
  );
  const relatedMedia = useMemo(() => {
    const inspectionIds = new Set(relatedObs.map(o => o.inspectionId));
    return inspectionMedia.filter(
      m => inspectionIds.has(m.inspectionId) && m.vehicleZoneId === record?.zoneId,
    );
  }, [inspectionMedia, relatedObs, record?.zoneId]);

  if (!vehicle || !record) throw notFound();
  const zone = getBodyZone(vehicle.type, record.zoneId);
  const marker = damageMarkerDisplay(record.status);

  return (
    <div className="space-y-4 pb-8">
      <Link
        to="/vehicle-bodywork/$vehicleId"
        params={{ vehicleId }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#667085] hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Vehicle bodywork
      </Link>

      <DashboardSurface>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Damage information</p>
        <div className="mt-2 font-mono text-sm font-bold text-ink">
          {record.referenceNumber ?? formatDamageRef(record.id)}
        </div>
        <RegPlate reg={vehicle.reg} className="mt-2" />
        <h1 className="mt-3 text-lg font-semibold text-ink">{record.title}</h1>
        <p className="mt-1 text-sm text-[#667085]">{zone?.label ?? record.zoneId}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <DetailItem label="Damage type" value={DAMAGE_TYPE_LABELS[record.damageType]} />
          <DetailItem label="Severity" value={severityLabel(record.severity)} />
          <DetailItem label="Status" value={record.status.replace(/_/g, " ")} />
          <DetailItem
            label="Roadworthiness impact"
            value={record.operationalImpact || record.severity === "safety_critical" ? "Yes" : "No"}
          />
          <DetailItem
            label="Reported"
            value={new Date(record.firstObservedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          <DetailItem label="Depot" value={depotName ?? "—"} />
        </dl>

        <div className="mt-4">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${marker.toneClass}`}
          >
            <span aria-hidden>{marker.icon}</span>
            {marker.label}
          </span>
        </div>

        {record.description ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Damage description</p>
            <p className="mt-1 text-sm text-ink">{record.description}</p>
          </div>
        ) : null}
      </DashboardSurface>

      <DashboardSurface>
        <h2 className="text-base font-semibold text-ink">Photographs · {relatedMedia.length}</h2>
        {relatedMedia.length === 0 ? (
          <p className="mt-2 text-sm text-[#667085]">No photographs linked to this damage record yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {relatedMedia.map(media => (
              <figure key={media.id} className="overflow-hidden rounded-xl border border-[#eaecf0]">
                <img
                  src={media.dataUrl}
                  alt={`Evidence for ${record.title}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="px-3 py-2 text-xs text-[#667085]">
                  {new Date(media.capturedAt).toLocaleString("en-GB")} · {media.capturedBy}
                  {media.evidenceRole ? ` · ${media.evidenceRole.replace(/_/g, " ")}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </DashboardSurface>

      <DashboardSurface>
        <h2 className="text-base font-semibold text-ink">Timeline · {relatedObs.length}</h2>
        <ul className="mt-3 divide-y divide-[#eaecf0]">
          {relatedObs.map(obs => (
            <li key={obs.id} className="py-3 text-sm">
              <p className="font-medium text-ink">{OBSERVATION_LABELS[obs.classification]}</p>
              <p className="mt-0.5 text-[#667085]">
                {new Date(obs.observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                <span className="mx-1.5 text-[#d0d5dd]">·</span>
                {obs.reportedBy}
              </p>
              {obs.description ? <p className="mt-1 text-ink">{obs.description}</p> : null}
            </li>
          ))}
        </ul>
      </DashboardSurface>

      {relatedRepairs.length > 0 ? (
        <DashboardSurface>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
            <Wrench className="size-4 text-[#98a2b3]" aria-hidden />
            Repair · {relatedRepairs.length}
          </h2>
          <ul className="space-y-3">
            {relatedRepairs.map(repair => (
              <li key={repair.id} className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-3 text-sm">
                <p className="font-medium text-ink">{repair.description}</p>
                <p className="mt-0.5 text-[#667085]">
                  {repair.status.replace(/_/g, " ")} · {repair.assignedTo ?? "Unassigned"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canStartRepair(repair) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        startRepair(repair.id);
                        toast.success(yardCopy.toast.defect.repairStarted);
                      }}
                    >
                      Start repair
                    </Button>
                  ) : null}
                  {canCompleteRepair(repair) ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        completeRepair(repair.id);
                        toast.success(yardCopy.toast.defect.awaitingVerification);
                      }}
                    >
                      Workshop complete
                    </Button>
                  ) : null}
                  {canVerifyRepair(repair) ? (
                    <Link
                      to="/yard/$vehicleId/condition/inspect"
                      params={{ vehicleId }}
                      search={{ type: "post-repair", repairOrderId: repair.id }}
                    >
                      <Button type="button" size="sm" className="bg-primary">
                        Verify repair
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </DashboardSurface>
      ) : null}

      {record.status === "repair_required" && relatedRepairs.length === 0 ? (
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            requestRepair({
              vehicleId,
              damageId,
              description: `Repair: ${record.title}`,
              assignedTo: "Workshop S02",
            });
            toast.success(yardCopy.toast.defect.repairOrderRaised);
          }}
        >
          <Wrench className="mr-2 size-4" aria-hidden />
          Create repair work order
        </Button>
      ) : null}

      <Link
        to="/yard/$vehicleId/condition/compare"
        params={{ vehicleId }}
        search={{ damageId }}
        className="block text-center text-sm font-medium text-primary hover:underline"
      >
        Compare evidence against previous inspections
      </Link>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#667085]">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
