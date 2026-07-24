import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { isMockAuth } from "@/platform/auth/auth-config";
import { commandGetMe, mapCommandRoleToYardRole } from "@/platform/auth/command-auth-api";
import { YardAuthOptionButton, YardMobileAuthLayout } from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";
import type { Company } from "@/types/tenancy";
import type { YardRole } from "@/types/permissions";
import type { PendingMembership } from "@/types/auth";

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 401) return true;
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return message.includes("session") && (message.includes("expired") || message.includes("invalid"));
}

function handleAuthFailure(navigate: ReturnType<typeof useNavigate>) {
  useSessionStore.getState().signOut();
  navigate({ to: "/sign-in" });
}

export const Route = createFileRoute("/_public/company-select")({
  validateSearch: (search: Record<string, unknown>) => ({
    switch: search.switch === "1" || search.switch === 1 || search.switch === true,
  }),
  head: () => ({ meta: [{ title: "Select company — Veyvio Yard" }] }),
  component: CompanySelectPage,
});

function CompanySelectPage() {
  const navigate = useNavigate();
  const { switch: manualSwitch } = Route.useSearch();
  const selectCompany = useTenancyStore(s => s.selectCompany);
  const selectTenant = useSessionStore(s => s.selectTenant);
  const pendingMemberships = useSessionStore(s => s.pendingMemberships);
  const refreshPendingMemberships = useSessionStore(s => s.refreshPendingMemberships);
  const accessToken = useSessionStore(s => s.accessToken);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [refreshing, setRefreshing] = useState(!isMockAuth());
  const [memberships, setMemberships] = useState<PendingMembership[]>(pendingMemberships);
  const autoBound = useRef(false);
  const refreshed = useRef(false);

  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;

    async function refresh() {
      if (isMockAuth()) {
        setMemberships(pendingMemberships);
        setRefreshing(false);
        return;
      }

      if (!accessToken || accessToken.startsWith("mock_")) {
        setRefreshing(false);
        return;
      }

      try {
        const mapped = await refreshPendingMemberships();
        setMemberships(mapped);
      } catch (err) {
        if (isAuthError(err)) {
          handleAuthFailure(navigate);
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load companies");
        setMemberships(pendingMemberships);
      } finally {
        setRefreshing(false);
      }
    }

    void refresh();
  }, [accessToken, navigate, pendingMemberships, refreshPendingMemberships]);

  const companies = useMemo(() => {
    return memberships.map(m => ({
      company: {
        id: m.tenantId,
        name: m.tenantName,
        status: "active" as const,
      } satisfies Company,
      role: mapCommandRoleToYardRole(m.role),
      roleLabel: (m.role ?? "member").replace(/_/g, " "),
    }));
  }, [memberships]);

  async function onSelect(company: Company, role: YardRole) {
    setError(null);
    setLoadingId(company.id);
    try {
      if (!isMockAuth()) {
        await selectTenant(company.id);
      }
      selectCompany(company, role);
      navigate({ to: "/depot-select" });
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthFailure(navigate);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not select company");
      setAutoSelecting(false);
    } finally {
      setLoadingId(null);
    }
  }

  useEffect(() => {
    if (refreshing || autoBound.current || loadingId || manualSwitch) return;

    async function bindSingleOrActive() {
      if (companies.length === 1) {
        autoBound.current = true;
        setAutoSelecting(true);
        await onSelect(companies[0].company, companies[0].role);
        return;
      }

      if (isMockAuth() || companies.length > 0 || !accessToken || accessToken.startsWith("mock_")) {
        return;
      }

      setAutoSelecting(true);
      try {
        const me = await commandGetMe(accessToken);
        if (!me.activeTenantId) {
          setAutoSelecting(false);
          return;
        }
        autoBound.current = true;
        await selectTenant(me.activeTenantId);
        selectCompany(
          { id: me.activeTenantId, name: me.tenantName ?? "Company", status: "active" },
          mapCommandRoleToYardRole(me.role),
        );
        navigate({ to: "/depot-select" });
      } catch {
        setAutoSelecting(false);
      }
    }

    void bindSingleOrActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once when memberships resolve
  }, [companies, accessToken, loadingId, manualSwitch, refreshing]);

  if (refreshing || autoSelecting || (!manualSwitch && !isMockAuth() && companies.length === 1)) {
    return (
      <YardMobileAuthLayout
        title="Opening company"
        subtitle={yardCopy.auth.loadingCompanies}
        showBrand={false}
        animate
      />
    );
  }

  return (
    <YardMobileAuthLayout
      title="Select company"
      subtitle="Choose the operator you are working for today."
      showBrand={false}
      animate
    >
      {error ? <p className="yard-auth-error mb-3">{error}</p> : null}
      {companies.length === 0 ? (
        <div className="yard-auth-card p-4 text-sm text-[#6b7280]">{yardCopy.auth.noCompanies}</div>
      ) : (
        <div className="yard-auth-list-stack">
          {companies.map(({ company, role, roleLabel }) => (
            <YardAuthOptionButton
              key={company.id}
              title={company.name}
              meta={
                loadingId === company.id
                  ? yardCopy.auth.loadingCompanies
                  : `${roleLabel} · Active`
              }
              disabled={loadingId === company.id}
              onClick={() => void onSelect(company, role)}
            />
          ))}
        </div>
      )}
    </YardMobileAuthLayout>
  );
}
