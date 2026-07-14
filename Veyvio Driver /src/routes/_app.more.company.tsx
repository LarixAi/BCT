import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout, MoreField } from "@/components/driver/more/MoreLayout";
import { approvalStatusLabel, driverTypeLabel } from "@/domain/more/more-helpers";
import { useMoreStore } from "@/store/more";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/more/company")({
  head: () => ({ meta: [{ title: "Company and depot — Veyvio Driver" }] }),
  component: CompanyPage,
});

function CompanyPage() {
  const identity = useMoreStore((s) => s.driverMore.identity);

  return (
    <MoreSubpageLayout title="Company and depot">
      <div className="rounded-xl border border-border bg-card">
        <MoreField label="Company" value={identity.companyName} />
        <MoreField label="Depot" value={identity.depotName} />
        <MoreField label="Driver ID" value={identity.id} />
        <MoreField label="Employment status" value={identity.employmentStatus} />
        {identity.startDate && <MoreField label="Start date" value={identity.startDate} />}
        <MoreField label="Driver type" value={driverTypeLabel(identity.driverType)} />
        <MoreField label="Categories" value={identity.driverCategories.join(" · ")} />
        {identity.lineManager && <MoreField label="Transport contact" value={identity.lineManager} />}
        <MoreField label="Account status" value={approvalStatusLabel(identity.approvalStatus)} />
      </div>
      <Button variant="outline" className="w-full">
        Request correction
      </Button>
    </MoreSubpageLayout>
  );
}
