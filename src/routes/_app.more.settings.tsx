import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Fingerprint, Info, RefreshCw, Shield } from "lucide-react";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";

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
      <p className="text-sm text-muted">
        Everyday phone preferences for Veyvio Yard. Sync state stays visible so you always know whether yard
        records have uploaded.
      </p>

      <nav className="overflow-hidden rounded-xs border border-border bg-white divide-y divide-border">
        {SETTINGS_LINKS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-h-14 items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50"
          >
            <item.icon className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-bold">{item.label}</strong>
              <small className="mt-0.5 block text-xs text-muted">{item.description}</small>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        ))}
      </nav>

      <section className="rounded-xs border border-border bg-white px-4 py-3">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 size-4 shrink-0 text-muted" />
          <div>
            <div className="text-sm font-bold">Biometric unlock</div>
            <p className="mt-0.5 text-xs text-muted">
              Available on the public unlock path when enabled for this device. Use device settings to manage
              biometrics.
            </p>
            <Link
              to="/biometric-unlock"
              className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest text-primary"
            >
              Open unlock screen →
            </Link>
          </div>
        </div>
      </section>
    </MoreSubpageLayout>
  );
}
