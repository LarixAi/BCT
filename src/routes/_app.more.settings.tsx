import { createFileRoute, Link } from "@tanstack/react-router";
import { Fingerprint, Info, RefreshCw, Shield } from "lucide-react";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubNavList } from "@/features/hub/HubContentPrimitives";

export const Route = createFileRoute("/_app/more/settings")({
  head: () => ({ meta: [{ title: yardPageTitle("Settings") }] }),
  component: SettingsPage,
});

const SETTINGS_LINKS = [
  {
    to: "/more/sync" as const,
    label: "Sync queue",
    description: "Pending uploads, retries and offline status",
    icon: RefreshCw,
  },
  {
    to: "/more/account" as const,
    label: "Account",
    description: "Identity, depot and company",
    icon: Shield,
  },
  {
    to: "/more/about" as const,
    label: "About Veyvio Yard",
    description: "Campaign line, promise and version",
    icon: Info,
  },
] as const;

function SettingsPage() {
  return (
    <MoreSubpageLayout title="Settings & security" eyebrow="App">
      <DashboardSurface>
        <p className="text-sm text-[#667085]">
          Everyday phone preferences for Veyvio Yard. Sync state stays visible so you always know whether yard
          records have uploaded.
        </p>
      </DashboardSurface>

      <DashboardSurface>
        <HubNavList items={SETTINGS_LINKS} />
      </DashboardSurface>

      <DashboardSurface>
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
          <div>
            <div className="text-sm font-semibold text-ink">Biometric unlock</div>
            <p className="mt-0.5 text-sm text-[#667085]">
              Available on the public unlock path when enabled for this device. Use device settings to manage
              biometrics.
            </p>
            <Link
              to="/biometric-unlock"
              className="mt-2 inline-block text-sm font-semibold text-[#175cd3]"
            >
              Open unlock screen →
            </Link>
          </div>
        </div>
      </DashboardSurface>
    </MoreSubpageLayout>
  );
}
