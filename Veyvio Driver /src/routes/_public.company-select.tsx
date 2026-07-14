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
import { MOCK_COMPANIES, DEFAULT_DRIVER_ROLE } from "@/data/mocks/tenancy";
import { useTenancyStore } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_public/company-select")({
  head: () => ({ meta: [{ title: "Select company — Veyvio Driver" }] }),
  component: CompanySelectPage,
});

function CompanySelectPage() {
  const navigate = useNavigate();
  const selectCompany = useTenancyStore((s) => s.selectCompany);

  return (
    <AuthPage>
      <AuthStepHeader
        step={AUTH_FLOW_STEPS.company}
        totalSteps={AUTH_FLOW_TOTAL_STEPS}
        title={driverCopy.auth.companyTitle}
        subtitle={driverCopy.auth.companySupporting}
      />

      <AuthCard>
        <AuthSelectionList>
          {MOCK_COMPANIES.map((company) => (
            <AuthSelectionButton
              key={company.id}
              title={company.name}
              meta="Driver · Active"
              onClick={() => {
                selectCompany(company, DEFAULT_DRIVER_ROLE);
                navigate({ to: "/depot-select" });
              }}
            />
          ))}
        </AuthSelectionList>
      </AuthCard>
    </AuthPage>
  );
}
