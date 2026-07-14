import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { SectionHeader, EmptyState } from "@/components/yard/primitives";
import { yardCopy } from "@/copy/yard-messages";
import { getConditionProfile, pendingDamageReviews, vehicleNeedsBaseline } from "@/domain/condition/condition-helpers";
import { ordersAwaitingVerification } from "@/domain/condition/repair-workflow";
import { ClipboardCheck, Camera, ShieldAlert, AlertTriangle, BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6 animate-in-up pb-4">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Condition & evidence</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Inspections</h1>
        <p className="text-sm text-muted">Review queues, baselines and depot condition analytics.</p>
      </header>

      <section className="grid grid-cols-2 gap-2">
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
        <section className="bg-primary/5 border border-primary/30 rounded-xs p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1">
              <ClipboardCheck className="size-3.5" /> Post-repair verification due
            </h2>
            <Link to="/inspections/repair-verification" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-2 space-y-2">
            {verifyQueue.slice(0, 3).map(o => {
              const v = vehicles.find(x => x.id === o.vehicleId);
              return (
                <li key={o.id} className="text-xs bg-white border border-border rounded-xs p-2">
                  <span className="font-mono font-bold">{v?.reg}</span>
                  <span className="text-muted"> · {o.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reviewQueue.length > 0 && (
        <section className="bg-vor/5 border border-vor/30 rounded-xs p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-vor flex items-center gap-1">
              <ShieldAlert className="size-3.5" /> Damage awaiting review
            </h2>
            <Link to="/inspections/damage-review" className="text-[10px] font-bold uppercase tracking-widest text-vor hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-2 space-y-2">
            {reviewQueue.slice(0, 3).map(o => {
              const v = vehicles.find(x => x.id === o.vehicleId);
              return (
                <li key={o.id} className="text-xs bg-white border border-border rounded-xs p-2">
                  <span className="font-mono font-bold">{v?.reg}</span>
                  <span className="text-muted"> · {o.reportedBy} · {new Date(o.observedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  <p className="text-muted mt-0.5 truncate">{o.description}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <Link to="/inspections/analytics">
            <Button variant="outline" className="w-full justify-start text-xs uppercase tracking-widest font-bold h-auto py-3">
              <BarChart3 className="size-4 mr-2" /> Condition analytics
            </Button>
          </Link>
          <Link to="/inspections/repair-verification">
            <Button variant="outline" className="w-full justify-start text-xs uppercase tracking-widest font-bold h-auto py-3">
              <ClipboardCheck className="size-4 mr-2" /> Repair verification queue
            </Button>
          </Link>
          <Link to="/inspections/damage-review">
            <Button variant="outline" className="w-full justify-start text-xs uppercase tracking-widest font-bold h-auto py-3">
              <AlertTriangle className="size-4 mr-2" /> Damage review queue
            </Button>
          </Link>
          <Link to="/simulate/driver-report">
            <Button variant="outline" className="w-full justify-start text-xs uppercase tracking-widest font-bold h-auto py-3">
              <Camera className="size-4 mr-2" /> Simulate driver report
            </Button>
          </Link>
        </div>
      </section>

      {missingBaseline.length > 0 && (
        <section>
          <SectionHeader title={`No approved baseline · ${missingBaseline.length}`} />
          <div className="space-y-2 mt-2">
            {missingBaseline.slice(0, 5).map(v => (
              <Link
                key={v.id}
                to="/yard/$vehicleId/condition/inspect"
                params={{ vehicleId: v.id }}
                search={{ type: "onboarding-baseline" }}
                className="flex items-center justify-between bg-white border border-border rounded-xs p-3 hover:border-primary text-xs"
              >
                <span className="font-mono font-bold">{v.reg}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-vor flex items-center gap-1">
                  <Camera className="size-3" /> Start baseline
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
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
  const cls = tone === "vor" ? "border-vor/30"
    : tone === "warn" ? "border-warn/40"
    : tone === "primary" ? "border-primary/30"
    : "border-border";
  return (
    <Link
      to={to}
      className={`flex items-center justify-between gap-2 bg-white border rounded-sm p-3.5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all min-h-[76px] ${cls} ${urgent ? "ring-1 ring-inset ring-current/10" : ""}`}
    >
      <div>
        <div className={`text-2xl font-display font-extrabold tabular-nums ${
          tone === "vor" ? "text-vor" : tone === "warn" ? "text-warn" : tone === "primary" ? "text-primary" : ""
        }`}>{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted mt-0.5">{label}</div>
      </div>
      <ChevronRight className="size-4 text-muted shrink-0" />
    </Link>
  );
}
