import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { depotsForCompany } from "@/data/mocks/tenancy";

export const Route = createFileRoute("/_public/depot-select")({
  head: () => ({ meta: [{ title: "Select depot — Veyvio Yard" }] }),
  component: DepotSelectPage,
});

function DepotSelectPage() {
  const navigate = useNavigate();
  const companyId = useTenancyStore(s => s.companyId);
  const selectDepot = useTenancyStore(s => s.selectDepot);
  const depots = companyId ? depotsForCompany(companyId) : [];

  return (
    <div className="space-y-4 animate-in-up">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Select depot</h1>
        <p className="mt-1 text-sm text-muted">Pick the yard you are operating today.</p>
      </div>
      <div className="space-y-2">
        {depots.map(depot => (
          <button
            key={depot.id}
            type="button"
            onClick={() => {
              selectDepot(depot);
              navigate({ to: "/initial-sync" });
            }}
            className="w-full text-left bg-white border border-border rounded-xs p-4 hover:border-accent transition-colors"
          >
            <div className="flex justify-between gap-2">
              <div className="font-bold">{depot.name} ({depot.code})</div>
              <div className="text-[10px] font-mono text-muted">{depot.vehiclesOnSite} on site</div>
            </div>
            <div className="mt-1 text-xs text-muted">{depot.address}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-widest">
              <span className="text-vor">{depot.vehiclesVor} VOR</span>
              <span className="text-muted">{depot.openDefects} defects</span>
              <span className="text-warn">{depot.outstandingChecks} checks</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
