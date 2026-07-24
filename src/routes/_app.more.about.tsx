import { createFileRoute } from "@tanstack/react-router";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import {
  BRAND_CAMPAIGN,
  BRAND_FOCUSED_PROMISE,
  BRAND_PRODUCT,
  BRAND_PROMISE,
  yardPageTitle,
} from "@/components/brand/brand-copy";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { hubListPanelClass } from "@/features/hub/HubContentPrimitives";

export const Route = createFileRoute("/_app/more/about")({
  head: () => ({ meta: [{ title: yardPageTitle("About") }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MoreSubpageLayout title="About Veyvio Yard" eyebrow="Brand">
      <DashboardSurface>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-xl bg-accent px-6 py-5">
            <BrandWordmark size="header" className="text-left" />
          </div>
          <p className="font-display text-lg font-extrabold text-ink">{BRAND_PRODUCT}</p>
          <p className="text-sm text-[#667085]">Version 0.1.0</p>
          <p className="max-w-xs text-sm font-semibold text-[#175cd3]">{BRAND_CAMPAIGN}</p>
          <p className="text-sm italic text-[#667085]">{BRAND_PROMISE}</p>
          <p className="text-xs text-[#667085]">{BRAND_FOCUSED_PROMISE}</p>
        </div>
      </DashboardSurface>

      <DashboardSurface>
        <div className={hubListPanelClass}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium text-[#667085]">Copyright</span>
            <span className="text-sm font-semibold text-ink">© 2026 Veyvio Ltd</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium text-[#667085]">Environment</span>
            <span className="text-sm font-semibold text-ink">Prototype</span>
          </div>
        </div>
      </DashboardSurface>
    </MoreSubpageLayout>
  );
}
