import { createFileRoute, redirect } from "@tanstack/react-router";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { DriverBodyworkReportsSection } from "@/features/vehicle-bodywork/DriverBodyworkReportsSection";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";

export const Route = createFileRoute("/_app/more/bodywork")({
  head: () => ({ meta: [{ title: yardPageTitle("Driver bodywork") }] }),
  beforeLoad: ({ location }) => {
    // Legacy bookmark — land on fleet bodywork with driver reports in view.
    if (!location.searchStr?.includes("legacy=1")) {
      throw redirect({ to: "/vehicle-bodywork", hash: "driver-reports" });
    }
  },
  component: DriverBodyworkMorePage,
});

/** Kept for `?legacy=1` — uses depot store instead of a separate Command fetch. */
function DriverBodyworkMorePage() {
  return (
    <MoreSubpageLayout title="Driver bodywork" eyebrow="Photos from Driver vehicle checks">
      <div className={hubPageShellClass}>
        <HubPageHeader
          title="Driver bodywork"
          description="Synced from your depot — same data as Vehicle Bodywork and damage review."
          showSync={false}
        />
        <DriverBodyworkReportsSection />
      </div>
    </MoreSubpageLayout>
  );
}
