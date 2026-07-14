import { createFileRoute } from "@tanstack/react-router";
import { buildMockSecurityActivity } from "@/data/mocks/security";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { driverCopy } from "@/copy/driver-messages";
import { formatRelativeSecurityTime, securityEventIcon } from "@/domain/security/security-format";

export const Route = createFileRoute("/_app/more/security/activity")({
  head: () => ({ meta: [{ title: "Security activity — Veyvio Driver" }] }),
  component: SecurityActivityPage,
});

function SecurityActivityPage() {
  const events = buildMockSecurityActivity();

  return (
    <MoreSubpageLayout title="Security activity" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.activityIntro}</p>

      {events.length === 0 ? (
        <HomeCard>
          <p className="font-semibold">{driverCopy.security.activityEmptyTitle}</p>
          <p className="mt-2 text-sm text-muted">{driverCopy.security.activityEmptyHint}</p>
        </HomeCard>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => {
            const Icon = securityEventIcon(event.type);
            return (
              <li key={event.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="size-4 text-link" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{event.summary}</p>
                    {event.detail && <p className="mt-1 text-sm text-muted">{event.detail}</p>}
                    <p className="mt-2 text-xs text-muted">
                      {event.deviceName} · {formatRelativeSecurityTime(event.occurredAt)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </MoreSubpageLayout>
  );
}
