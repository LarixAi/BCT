import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout, MoreField } from "@/components/driver/more/MoreLayout";
import { BrandAppIcon, BrandWordmark } from "@/components/brand/BrandWordmark";
import { BrandTagline } from "@/components/brand/BrandTagline";
import { BRAND_PRODUCT, BRAND_PROMISE } from "@/components/brand/brand-copy";

export const Route = createFileRoute("/_app/more/about")({
  head: () => ({ meta: [{ title: "About — Veyvio Driver" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MoreSubpageLayout title="About Veyvio">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card py-8 text-center">
        <BrandAppIcon />
        <div className="rounded-xl bg-accent px-5 py-4">
          <BrandWordmark size="header" showAccent className="mx-auto" />
        </div>
        <p className="font-display text-lg font-extrabold">{BRAND_PRODUCT}</p>
        <p className="text-sm text-muted">Version 0.1.0 · Build 1048</p>
        <p className="text-sm font-semibold italic text-link">{BRAND_PROMISE}</p>
        <BrandTagline variant="about" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <MoreField label="Copyright" value="© 2026 Veyvio Ltd" />
        <MoreField label="Environment" value="Production" />
      </div>
    </MoreSubpageLayout>
  );
}
