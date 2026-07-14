import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { SectionHeader, RegPlate } from "@/components/yard/primitives";
import { buildConditionAnalytics } from "@/domain/condition/condition-analytics";
import { getBodyZone } from "@/domain/condition/body-zones";
import { BarChart3, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/inspections/analytics")({
  head: () => ({
    meta: [{ title: "Condition Analytics — Veyvio Yard" }],
  }),
  component: ConditionAnalyticsPage,
});

function ConditionAnalyticsPage() {
  const vehicles = useYard(s => s.vehicles);
  const damageRecords = useYard(s => s.damageRecords);
  const observations = useYard(s => s.damageObservations);
  const reviews = useYard(s => s.damageReviews);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const profiles = useYard(s => s.conditionProfiles);
  const inspections = useYard(s => s.inspections);

  const stats = useMemo(
    () => buildConditionAnalytics({
      vehicles,
      damageRecords,
      observations,
      reviews,
      repairOrders,
      profiles,
      inspections,
    }),
    [vehicles, damageRecords, observations, reviews, repairOrders, profiles, inspections],
  );

  return (
    <div className="space-y-5 animate-in-up pb-8">
      <Link to="/inspections" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Inspections
      </Link>
      <header>
        <h1 className="font-display text-xl font-extrabold uppercase tracking-tight flex items-center gap-2">
          <BarChart3 className="size-5" /> Condition analytics
        </h1>
        <p className="text-xs text-muted mt-1">Depot-wide condition trends — investigation support, not automatic enforcement.</p>
      </header>

      {stats.riskAlerts.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Risk alerts" />
          {stats.riskAlerts.map(a => (
            <div
              key={a.id}
              className={`rounded-xs border p-3 text-xs ${
                a.tone === "vor" ? "border-vor/30 bg-vor/5 text-vor" : "border-warn/40 bg-warn/10 text-warn"
              }`}
            >
              <div className="font-bold">{a.label}</div>
              <p className="mt-0.5 opacity-90">{a.detail}</p>
            </div>
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Metric label="Open damage" value={stats.openDamageCount} />
        <Metric label="Pending review" value={stats.pendingReviewCount} />
        <Metric label="Unreported new" value={stats.unreportedNewCount} />
        <Metric label="Repair verify" value={stats.awaitingVerificationCount} />
        <Metric label="Active repairs" value={stats.activeRepairCount} />
        <Metric label="No baseline" value={stats.missingBaselineCount} />
      </section>

      <section className="bg-white border border-border rounded-xs p-4">
        <h2 className="text-xs font-extrabold uppercase tracking-widest font-display mb-3">Open damage by severity</h2>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <SeverityBar label="Cosmetic" count={stats.openDamageBySeverity.cosmetic} tone="muted" />
          <SeverityBar label="Operational" count={stats.openDamageBySeverity.operational} tone="warn" />
          <SeverityBar label="Safety" count={stats.openDamageBySeverity.safety_critical} tone="vor" />
        </div>
      </section>

      {stats.topDamageZones.length > 0 && (
        <section className="bg-white border border-border rounded-xs p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest font-display mb-3">Top damage zones</h2>
          <ul className="space-y-2 text-xs">
            {stats.topDamageZones.map(z => {
              const sample = vehicles.find(v => damageRecords.some(d => d.vehicleId === v.id && d.zoneId === z.zoneId));
              const label = sample ? getBodyZone(sample.type, z.zoneId)?.label ?? z.zoneId : z.zoneId;
              return (
                <li key={z.zoneId} className="flex justify-between gap-2">
                  <span>{label.replace(/-/g, " ")}</span>
                  <span className="font-bold tabular-nums">{z.count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {stats.vehiclesWithRecurringDamage.length > 0 && (
        <section className="bg-white border border-border rounded-xs p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest font-display mb-3">Recurring damage (2+ areas)</h2>
          <ul className="space-y-2">
            {stats.vehiclesWithRecurringDamage.map(({ vehicleId, count }) => {
              const v = vehicles.find(x => x.id === vehicleId);
              return (
                <li key={vehicleId}>
                  <Link
                    to="/yard/$vehicleId/condition"
                    params={{ vehicleId }}
                    className="flex items-center justify-between gap-2 text-xs hover:opacity-80"
                  >
                    {v && <RegPlate reg={v.reg} />}
                    <span className="font-bold tabular-nums">{count} areas</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-border rounded-xs p-3 text-center">
      <div className="text-2xl font-display font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted mt-0.5">{label}</div>
    </div>
  );
}

function SeverityBar({ label, count, tone }: { label: string; count: number; tone: "muted" | "warn" | "vor" }) {
  const cls = tone === "vor" ? "text-vor" : tone === "warn" ? "text-warn" : "text-muted";
  return (
    <div>
      <div className={`text-lg font-display font-extrabold tabular-nums ${cls}`}>{count}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
