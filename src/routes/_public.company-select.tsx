import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { MOCK_COMPANIES, DEFAULT_MOCK_ROLE } from "@/data/mocks/tenancy";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/company-select")({
  head: () => ({ meta: [{ title: "Select company — Veyvio Yard" }] }),
  component: CompanySelectPage,
});

function CompanySelectPage() {
  const navigate = useNavigate();
  const selectCompany = useTenancyStore(s => s.selectCompany);

  return (
    <div className="space-y-4 animate-in-up">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Select company</h1>
        <p className="mt-1 text-sm text-muted">Choose the operator you are working for today.</p>
      </div>
      <div className="space-y-2">
        {MOCK_COMPANIES.map(company => (
          <button
            key={company.id}
            type="button"
            onClick={() => {
              selectCompany(company, DEFAULT_MOCK_ROLE);
              navigate({ to: "/depot-select" });
            }}
            className="w-full text-left bg-white border border-border rounded-xs p-4 hover:border-accent transition-colors"
          >
            <div className="font-bold">{company.name}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted">Yard Manager · Active</div>
          </button>
        ))}
      </div>
    </div>
  );
}
