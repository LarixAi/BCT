import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AUTH_FLOW_STEPS, AUTH_FLOW_TOTAL_STEPS } from "@/components/auth/auth-flow";
import {
  AuthCard,
  AuthPage,
  AuthSelectionButton,
  AuthSelectionList,
} from "@/components/auth/AuthLayout";
import { AuthStepHeader } from "@/components/auth/AuthStepHeader";
import { driverCopy } from "@/copy/driver-messages";
import { depotsForCompany } from "@/data/mocks/tenancy";
import { useTenancyStore } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_public/depot-select")({
  head: () => ({ meta: [{ title: "Select depot — Veyvio Driver" }] }),
  component: DepotSelectPage,
});

function DepotSelectPage() {
  const navigate = useNavigate();
  const companyId = useTenancyStore((s) => s.companyId);
  const selectDepot = useTenancyStore((s) => s.selectDepot);
  const depots = companyId ? depotsForCompany(companyId) : [];

  return (
    <AuthPage>
      <AuthStepHeader
        step={AUTH_FLOW_STEPS.depot}
        totalSteps={AUTH_FLOW_TOTAL_STEPS}
        title={driverCopy.auth.depotTitle}
        subtitle={driverCopy.auth.depotSupporting}
      />

      <AuthCard>
        <AuthSelectionList>
          {depots.map((depot) => (
            <AuthSelectionButton
              key={depot.id}
              title={`${depot.name} (${depot.code})`}
              detail={depot.address}
              onClick={() => {
                selectDepot(depot);
                navigate({ to: "/initial-sync" });
              }}
            />
          ))}
        </AuthSelectionList>
      </AuthCard>
    </AuthPage>
  );
}
