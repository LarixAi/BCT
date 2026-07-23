import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { isMockAuth } from "@/platform/auth/auth-config";
import { commandGetMe, mapCommandRoleToYardRole } from "@/platform/auth/command-auth-api";
import { MOCK_COMPANIES, DEFAULT_MOCK_ROLE } from "@/data/mocks/tenancy";
import { YardAuthOptionButton, YardMobileAuthLayout } from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";
import type { Company } from "@/types/tenancy";
import type { YardRole } from "@/types/permissions";

export const Route = createFileRoute("/_public/company-select")({
  head: () => ({ meta: [{ title: "Select company — Veyvio Yard" }] }),
  component: CompanySelectPage,
});

function CompanySelectPage() {
  const navigate = useNavigate();
  const selectCompany = useTenancyStore(s => s.selectCompany);
  const selectTenant = useSessionStore(s => s.selectTenant);
  const pendingMemberships = useSessionStore(s => s.pendingMemberships);
  const accessToken = useSessionStore(s => s.accessToken);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const autoBound = useRef(false);

  const companies = useMemo(() => {
    if (isMockAuth()) {
      return MOCK_COMPANIES.map(c => ({
        company: c,
        role: DEFAULT_MOCK_ROLE,
        roleLabel: "Yard Manager",
      }));
    }
    return pendingMemberships.map(m => ({
      company: {
        id: m.tenantId,
        name: m.tenantName,
        status: "active" as const,
      } satisfies Company,
      role: mapCommandRoleToYardRole(m.role),
      roleLabel: m.role.replace(/_/g, " "),
    }));
  }, [pendingMemberships]);

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
      setError(err instanceof Error ? err.message : "Could not select company");
      setAutoSelecting(false);
    } finally {
      setLoadingId(null);
    }
  }

  useEffect(() => {
    if (autoBound.current || loadingId) return;

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
  }, [companies, accessToken, loadingId]);

  if (autoSelecting || (!isMockAuth() && companies.length === 1)) {
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
