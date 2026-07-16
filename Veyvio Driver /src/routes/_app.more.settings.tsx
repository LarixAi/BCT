import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { buildAppSettingsSections } from "@/domain/more/more-settings-view";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/more/settings")({
  head: () => ({ meta: [{ title: "App settings — Veyvio Driver" }] }),
  component: AppSettingsPage,
});

function AppSettingsPage() {
  const sections = buildAppSettingsSections();

  return (
    <MoreSubpageLayout
      title="App settings"
      eyebrow="Preferences"
      backTo="/more"
    >
      <p className="text-sm text-muted">
        Everyday phone preferences. Security and compliance stay under Account.
      </p>
      {sections.map((section) => (
        <nav
          key={section.id || "settings"}
          className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-background"
        >
          {section.items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 text-left active:bg-secondary/40"
            >
              <span>
                <strong className="block text-sm font-bold">{item.label}</strong>
                {item.description ? (
                  <small className="mt-0.5 block text-xs text-muted">{item.description}</small>
                ) : null}
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted" strokeWidth={1.5} />
            </Link>
          ))}
        </nav>
      ))}
    </MoreSubpageLayout>
  );
}
