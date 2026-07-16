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

export const Route = createFileRoute("/_app/more/about")({
  head: () => ({ meta: [{ title: yardPageTitle("About") }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MoreSubpageLayout title="About Veyvio Yard" eyebrow="Brand">
      <div className="flex flex-col items-center gap-4 rounded-xs border border-border bg-white px-4 py-8 text-center">
        <div className="rounded-xs bg-accent px-6 py-5">
          <BrandWordmark size="header" className="text-left" />
        </div>
        <p className="font-display text-lg font-extrabold">{BRAND_PRODUCT}</p>
        <p className="text-sm text-muted">Version 0.1.0</p>
        <p className="max-w-xs text-sm font-semibold text-primary">{BRAND_CAMPAIGN}</p>
        <p className="text-sm italic text-muted">{BRAND_PROMISE}</p>
        <p className="text-xs text-muted">{BRAND_FOCUSED_PROMISE}</p>
      </div>
      <div className="rounded-xs border border-border bg-white divide-y divide-border">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Copyright</span>
          <span className="text-sm font-medium">© 2026 Veyvio Ltd</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Environment</span>
          <span className="text-sm font-medium">Prototype</span>
        </div>
      </div>
    </MoreSubpageLayout>
  );
}
