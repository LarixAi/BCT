import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { SectionHeader, RegPlate } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { yardCopy } from "@/copy/yard-messages";
import {
  canAcknowledgePlan,
  planHeadline,
  stagingSorted,
} from "@/domain/yard/operational-plan";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/plan")({
  head: () => ({
    meta: [
      { title: yardPageTitle("Day plan") },
      {
        name: "description",
        content: "Tomorrow's published staging order and prep duties for the yard.",
      },
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
      <div className="space-y-4 animate-in-up">
        <SectionHeader title={yardCopy.plan.title} sub={yardCopy.plan.emptySub} />
        <div className="rounded border border-border bg-white p-6 text-center">
          <CalendarDays className="mx-auto size-8 text-muted" />
          <p className="mt-3 text-sm font-semibold">{yardCopy.plan.emptyTitle}</p>
          <p className="mt-1 text-xs text-muted">{yardCopy.plan.emptyHint}</p>
          <Link
            to="/departure-line"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary"
          >
            Open departure line <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in-up">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {yardCopy.plan.boardLabel}
        </p>
        <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          {planHeadline(plan)}
        </h1>
        <p className="text-xs text-muted sm:text-sm">
          {plan.operationalDate} · v{plan.version} ·{" "}
          {plan.status === "acknowledged" ? "Acknowledged by Yard" : "Published — awaiting Yard ack"}
          {plan.publishedBy ? ` · ${plan.publishedBy}` : ""}
        </p>
        {plan.notes && (
          <p className="rounded border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
            {plan.notes}
          </p>
        )}
      </header>

      {canAcknowledgePlan(plan) && (
        <PermissionGate permission="plan.acknowledge">
          <Button onClick={onAcknowledge} className="w-full min-h-12 sm:w-auto">
            <CheckCircle2 className="mr-2 size-4" />
            {yardCopy.plan.acknowledgeAction}
          </Button>
        </PermissionGate>
      )}

      <section className="space-y-2">
        <SectionHeader
          title={yardCopy.plan.stagingTitle}
          sub={`${staging.length} vehicles · prep before service`}
        />
        <div className="overflow-hidden rounded border border-border bg-white">
          {staging.map(item => {
            const vehicle = vehicles.find(v => v.id === item.vehicleId);
            const onLine = vehicle?.status === "On Departure Line";
            const offSite = vehicle?.status === "Off-site";
            return (
              <div
                key={`${item.sequence}-${item.vehicleId}`}
                className="grid grid-cols-[40px_92px_1fr] items-start gap-2 border-b border-border p-3 last:border-b-0"
              >
                <div className="pt-1 text-center font-display text-sm font-extrabold text-primary">
                  {item.sequence}
                </div>
                <RegPlate
                  reg={item.vehicleReg}
                  tone={vehicle?.status === "VOR" ? "vor" : "default"}
                />
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    {item.tripCode ?? "—"} · Depart {item.departAt}
                    {item.targetBayId ? ` · Bay ${item.targetBayId}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold">
                    {offSite
                      ? "Already off-site"
                      : onLine
                        ? "On departure line"
                        : vehicle
                          ? `${vehicle.status} · ${vehicle.bayId}`
                          : "Vehicle not in yard inventory"}
                  </div>
                  {item.instructions && (
                    <p className="mt-1 text-[11px] leading-snug text-muted">{item.instructions}</p>
                  )}
                  {vehicle && (
                    <Link
                      to="/yard/$vehicleId"
                      params={{ vehicleId: vehicle.id }}
                      className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-primary"
                    >
                      Open vehicle <ChevronRight className="size-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {staging.length === 0 && (
            <p className="p-4 text-xs text-muted">{yardCopy.plan.noStaging}</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title={yardCopy.plan.dutiesTitle} sub={`${plan.duties.length} duties`} />
        <div className="overflow-hidden rounded border border-border bg-white">
          {plan.duties.map(duty => (
            <div
              key={duty.dutyId}
              className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold">
                  {duty.reference} · {duty.routeName}
                </div>
                <div className="text-[10px] text-muted">
                  {duty.startTime}
                  {duty.vehicleReg ? ` · ${duty.vehicleReg}` : " · No vehicle"}
                  {duty.driverName ? ` · ${duty.driverName}` : " · No driver"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
