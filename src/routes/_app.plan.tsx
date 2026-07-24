import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { RegPlate } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { yardCopy } from "@/copy/yard-messages";
import { canAcknowledgePlan, stagingSorted } from "@/domain/yard/operational-plan";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubCallout, HubEmptyPanel, HubSectionHeading, hubListPanelClass } from "@/features/hub/HubContentPrimitives";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { HubPrimaryButton } from "@/features/hub/HubPageHeader";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/plan")({
  head: () => ({
    meta: [
      { title: yardPageTitle("Day plan") },
      { name: "description", content: "Tomorrow's published staging order and prep duties for the yard." },
    ],
  }),
  component: DayPlanPage,
});

function DayPlanPage() {
  const plan = useYard(s => s.operationalPlan);
  const vehicles = useYard(s => s.vehicles);
  const acknowledgeOperationalPlan = useYard(s => s.acknowledgeOperationalPlan);
  const staging = useMemo(() => stagingSorted(plan), [plan]);

  function onAcknowledge() {
    if (acknowledgeOperationalPlan()) {
      toast.success(yardCopy.toast.plan.acknowledged);
    }
  }

  if (!plan) {
    return (
      <HubOpsPageLayout title="Day plan" description="Tomorrow's staging order and prep duties.">
        <DashboardSurface>
          <HubEmptyPanel
            icon={CalendarDays}
            title={yardCopy.plan.emptyTitle}
            description={yardCopy.plan.emptyHint}
          />
          <Link
            to="/departure-line"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline"
          >
            Open departure line <ChevronRight className="size-4" />
          </Link>
        </DashboardSurface>
      </HubOpsPageLayout>
    );
  }

  return (
    <HubOpsPageLayout
      title="Day plan"
      description={`${plan.operationalDate} · v${plan.version} · ${plan.status === "acknowledged" ? "Acknowledged by Yard" : "Published — awaiting Yard ack"}`}
    >
      {plan.notes ? <HubCallout tone="info">{plan.notes}</HubCallout> : null}

      {canAcknowledgePlan(plan) && (
        <PermissionGate permission="plan.acknowledge">
          <HubPrimaryButton onClick={onAcknowledge} className="w-full sm:w-auto">
            <CheckCircle2 className="size-4" />
            {yardCopy.plan.acknowledgeAction}
          </HubPrimaryButton>
        </PermissionGate>
      )}

      <DashboardSurface>
        <HubSectionHeading
          title={yardCopy.plan.stagingTitle}
          description={`${staging.length} vehicles · prep before service`}
        />
        {staging.length === 0 ? (
          <p className="text-sm text-[#667085]">{yardCopy.plan.noStaging}</p>
        ) : (
          <div className={hubListPanelClass}>
            {staging.map(item => {
              const vehicle = vehicles.find(v => v.id === item.vehicleId);
              const onLine = vehicle?.status === "On Departure Line";
              const offSite = vehicle?.status === "Off-site";
              return (
                <div
                  key={`${item.sequence}-${item.vehicleId}`}
                  className="grid grid-cols-[40px_92px_1fr] items-start gap-3 p-4"
                >
                  <div className="pt-1 text-center font-display text-sm font-bold text-ink">{item.sequence}</div>
                  <RegPlate reg={item.vehicleReg} tone={vehicle?.status === "VOR" ? "vor" : "default"} />
                  <div className="min-w-0">
                    <p className="text-xs text-[#667085]">
                      {item.tripCode ?? "—"} · Depart {item.departAt}
                      {item.targetBayId ? ` · Bay ${item.targetBayId}` : ""}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">
                      {offSite
                        ? "Already off-site"
                        : onLine
                          ? "On departure line"
                          : vehicle
                            ? `${vehicle.status} · ${vehicle.bayId}`
                            : "Vehicle not in yard inventory"}
                    </p>
                    {item.instructions ? (
                      <p className="mt-1 text-xs leading-snug text-[#667085]">{item.instructions}</p>
                    ) : null}
                    {vehicle ? (
                      <Link
                        to="/yard/$vehicleId"
                        params={{ vehicleId: vehicle.id }}
                        className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-ink hover:underline"
                      >
                        Open vehicle <ChevronRight className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardSurface>

      <DashboardSurface>
        <HubSectionHeading title={yardCopy.plan.dutiesTitle} description={`${plan.duties.length} duties`} />
        <div className={hubListPanelClass}>
          {plan.duties.map(duty => (
            <div key={duty.dutyId} className="p-4">
              <p className="text-sm font-semibold text-ink">
                {duty.reference} · {duty.routeName}
              </p>
              <p className="text-xs text-[#667085]">
                {duty.startTime}
                {duty.vehicleReg ? ` · ${duty.vehicleReg}` : " · No vehicle"}
                {duty.driverName ? ` · ${duty.driverName}` : " · No driver"}
              </p>
            </div>
          ))}
        </div>
      </DashboardSurface>
    </HubOpsPageLayout>
  );
}
