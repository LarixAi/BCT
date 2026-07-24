import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { EmptyState } from "@/components/yard/primitives";
import { yardCopy } from "@/copy/yard-messages";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubSectionHeading, hubInsetCardClass } from "@/features/hub/HubContentPrimitives";
import { HubSecondaryButton } from "@/features/hub/HubPageHeader";
import { getConditionProfile, pendingDamageReviews, vehicleNeedsBaseline } from "@/domain/condition/condition-helpers";
import { ordersAwaitingVerification } from "@/domain/condition/repair-workflow";
import { ClipboardCheck, Camera, AlertTriangle, BarChart3, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/inspections/")({
  head: () => ({
    meta: [
      { title: "Vehicle Inspections — Veyvio Yard" },
      { name: "description", content: "Inspection dashboard: checks due, damage review, baselines and walkarounds." },
    ],
  }),
  component: InspectionsDashboard,
});

function InspectionsDashboard() {
  const vehicles = useYard(s => s.vehicles);
  const profiles = useYard(s => s.conditionProfiles);
  const observations = useYard(s => s.damageObservations);
  const reviews = useYard(s => s.damageReviews);
  const repairOrders = useYard(s => s.repairWorkOrders);

  const awaitingCheck = vehicles.filter(v => v.status === "Awaiting Check");
  const missingBaseline = vehicles.filter(v => vehicleNeedsBaseline(getConditionProfile(profiles, v.id)));
  const reviewQueue = useMemo(() => pendingDamageReviews(observations, reviews), [observations, reviews]);
  const verifyQueue = useMemo(() => ordersAwaitingVerification(repairOrders), [repairOrders]);

  return (
    <HubOpsPageLayout title="Inspections" description="Review queues, baselines and depot condition analytics.">
      <DashboardSurface className="space-y-6">
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Damage review" value={reviewQueue.length} tone="warn" to="/inspections/damage-review" urgent={reviewQueue.length > 0} />
          <StatCard label="Repair verify" value={verifyQueue.length} tone="primary" to="/inspections/repair-verification" urgent={verifyQueue.length > 0} />
          <StatCard label="Awaiting check" value={awaitingCheck.length} tone="primary" to="/checks" />
          <StatCard label="No baseline" value={missingBaseline.length} tone="vor" to="/yard" urgent={missingBaseline.length > 0} />
        </section>

        {reviewQueue.length === 0 && verifyQueue.length === 0 && missingBaseline.length === 0 && (
          <EmptyState
            icon={<ClipboardCheck className="size-8 mx-auto" />}
            title={yardCopy.empty.noInspectionsPending}
            hint="No damage reviews, repair verifications or missing baselines in the queue."
          />
        )}

        {verifyQueue.length > 0 && (
          <section className="rounded-xl border border-[#b2ddff] bg-[#eff8ff] p-4">
            <HubSectionHeading
              title="Post-repair verification due"
              action={
                <Link to="/inspections/repair-verification" className="text-sm font-semibold text-[#175cd3] hover:underline">
                  View all
                </Link>
              }
            />
            <ul className="space-y-2">
              {verifyQueue.slice(0, 3).map(o => {
                const v = vehicles.find(x => x.id === o.vehicleId);
                return (
                  <li key={o.id} className={hubInsetCardClass}>
                    <span className="font-mono text-sm font-bold text-ink">{v?.reg}</span>
                    <span className="text-sm text-[#667085]"> · {o.description}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {reviewQueue.length > 0 && (
          <section className="rounded-xl border border-[#fecdca] bg-[#fef3f2] p-4">
            <HubSectionHeading
              title="Damage awaiting review"
              action={
                <Link to="/inspections/damage-review" className="text-sm font-semibold text-[#b42318] hover:underline">
                  View all
                </Link>
              }
            />
            <ul className="space-y-2">
              {reviewQueue.slice(0, 3).map(o => {
                const v = vehicles.find(x => x.id === o.vehicleId);
                return (
                  <li key={o.id} className={hubInsetCardClass}>
                    <span className="font-mono text-sm font-bold text-ink">{v?.reg}</span>
                    <span className="text-sm text-[#667085]">
                      {" "}
                      · {o.reportedBy} · {new Date(o.observedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <p className="mt-0.5 truncate text-sm text-[#667085]">{o.description}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <HubSectionHeading title="Quick actions" />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link to="/inspections/analytics">
              <HubSecondaryButton className="h-auto w-full justify-start py-3">
                <BarChart3 className="size-4" /> Condition analytics
              </HubSecondaryButton>
            </Link>
            <Link to="/inspections/repair-verification">
              <HubSecondaryButton className="h-auto w-full justify-start py-3">
                <ClipboardCheck className="size-4" /> Repair verification queue
              </HubSecondaryButton>
            </Link>
            <Link to="/inspections/damage-review">
              <HubSecondaryButton className="h-auto w-full justify-start py-3">
                <AlertTriangle className="size-4" /> Damage review queue
              </HubSecondaryButton>
            </Link>
            <Link to="/simulate/driver-report">
              <HubSecondaryButton className="h-auto w-full justify-start py-3">
                <Camera className="size-4" /> Simulate driver report
              </HubSecondaryButton>
            </Link>
          </div>
        </section>

        {missingBaseline.length > 0 && (
          <section>
            <HubSectionHeading title={`No approved baseline · ${missingBaseline.length}`} />
            <div className="mt-2 space-y-2">
              {missingBaseline.slice(0, 5).map(v => (
                <Link
                  key={v.id}
                  to="/yard/$vehicleId/condition/inspect"
                  params={{ vehicleId: v.id }}
                  search={{ type: "onboarding-baseline" }}
                  className={`flex items-center justify-between ${hubInsetCardClass}`}
                >
                  <span className="font-mono text-sm font-bold text-ink">{v.reg}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#b42318]">
                    <Camera className="size-3" /> Start baseline
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </DashboardSurface>
    </HubOpsPageLayout>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
  to,
  urgent,
}: {
  label: string;
  value: number;
  tone?: "default" | "warn" | "vor" | "primary";
  to: string;
  urgent?: boolean;
}) {
  const borderCls =
    tone === "vor" ? "border-[#fecdca]"
    : tone === "warn" ? "border-[#fddcab]"
    : tone === "primary" ? "border-[#b2ddff]"
    : "border-[#eaecf0]";
  const valueColor =
    tone === "vor" ? "text-[#b42318]"
    : tone === "warn" ? "text-[#c4320a]"
    : tone === "primary" ? "text-[#175cd3]"
    : "text-ink";

  return (
    <Link
      to={to}
      className={`flex min-h-[76px] items-center justify-between gap-2 rounded-xl border bg-[#fcfcfd] p-4 transition-colors hover:bg-white ${borderCls} ${urgent ? "ring-1 ring-inset ring-current/10" : ""}`}
    >
      <div>
        <div className={`font-display text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
        <div className="mt-1 text-sm font-medium text-[#667085]">{label}</div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" />
    </Link>
  );
}
