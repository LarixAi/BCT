import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useSessionStore } from "@/platform/auth/session-store";
import { isMockAuth } from "@/platform/auth/auth-config";
import { commandListDepots } from "@/platform/auth/command-auth-api";
import { depotsForCompany } from "@/data/mocks/tenancy";
import { YardAuthOptionButton, YardMobileAuthLayout } from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";
import type { Depot } from "@/types/tenancy";

export const Route = createFileRoute("/_public/depot-select")({
  validateSearch: (search: Record<string, unknown>) => ({
    switch: search.switch === "1" || search.switch === 1 || search.switch === true,
  }),
  head: () => ({ meta: [{ title: "Select depot — Veyvio Yard" }] }),
  component: DepotSelectPage,
});

function DepotSelectPage() {
  const navigate = useNavigate();
  const { switch: manualSwitch } = Route.useSearch();
  const companyId = useTenancyStore(s => s.companyId);
  const companyName = useTenancyStore(s => s.companyName);
  const selectDepot = useTenancyStore(s => s.selectDepot);
  const accessToken = useSessionStore(s => s.accessToken);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoBound = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isMockAuth() || !accessToken || accessToken.startsWith("mock_")) {
          const list = companyId ? depotsForCompany(companyId) : [];
          if (!cancelled) setDepots(list);
          return;
        }
        const rows = await commandListDepots(accessToken);
        const mapped: Depot[] = rows.map(d => ({
          id: String(d.id),
          companyId: companyId ?? String(d.companyId ?? ""),
          name: d.name || "Depot",
          code: (d.code || d.name?.slice(0, 3) || "DEP").toUpperCase(),
          address: d.address || companyName || "",
          timezone: "Europe/London",
          vehiclesOnSite: 0,
          vehiclesVor: 0,
          openDefects: 0,
          outstandingChecks: 0,
          activeAlerts: 0,
        }));
        if (!cancelled) setDepots(mapped);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load depots");
          setDepots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, companyId, companyName]);

  useEffect(() => {
    if (loading || autoBound.current || depots.length !== 1 || manualSwitch) return;
    autoBound.current = true;
    selectDepot(depots[0]);
    navigate({ to: "/initial-sync" });
  }, [loading, depots, selectDepot, navigate, manualSwitch]);

  if (!loading && depots.length === 1 && !manualSwitch) {
    return (
      <YardMobileAuthLayout
        title="Opening depot"
        subtitle={yardCopy.auth.loadingDepots}
        showBrand={false}
        animate
      />
    );
  }

  return (
    <YardMobileAuthLayout
      title="Select depot"
      subtitle="Pick the yard you are operating today."
      showBrand={false}
      animate
    >
      {error ? <p className="yard-auth-error mb-3">{error}</p> : null}
      {loading ? (
        <div className="yard-auth-card p-4 text-sm text-[#6b7280]">{yardCopy.auth.loadingDepots}</div>
      ) : depots.length === 0 ? (
        <div className="yard-auth-card p-4 text-sm text-[#6b7280]">{yardCopy.auth.noDepots}</div>
      ) : (
        <div className="yard-auth-list-stack">
          {depots.map(depot => {
            const metaParts: string[] = [];
            if (depot.address) metaParts.push(depot.address);
            if (depot.vehiclesOnSite > 0) metaParts.push(`${depot.vehiclesOnSite} on site`);
            if (depot.vehiclesVor > 0) metaParts.push(`${depot.vehiclesVor} VOR`);

            return (
              <YardAuthOptionButton
                key={depot.id}
                title={`${depot.name} (${depot.code})`}
                meta={metaParts.join(" · ") || "Active depot"}
                onClick={() => {
                  selectDepot(depot);
                  navigate({ to: "/initial-sync" });
                }}
              />
            );
          })}
        </div>
      )}
    </YardMobileAuthLayout>
  );
}
