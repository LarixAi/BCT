import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { useMoreStore } from "@/store/more";
import { Label } from "@/components/ui/label";
import type { NotificationPreferences } from "@/types/more";

const TOGGLES: { key: keyof NotificationPreferences; label: string; mandated?: boolean }[] = [
  { key: "tripChanges", label: "Trip assignment changes" },
  { key: "tripCancellations", label: "Trip cancellations" },
  { key: "operationsMessages", label: "Messages from operations" },
  { key: "vehicleCheckReminders", label: "Vehicle check reminders" },
  { key: "complianceAlerts", label: "Compliance expiry alerts" },
  { key: "emergencyAlerts", label: "Emergency operational alerts", mandated: true },
  { key: "announcements", label: "General announcements" },
  { key: "sound", label: "Sound" },
  { key: "vibration", label: "Vibration" },
  { key: "push", label: "Push notifications" },
  { key: "email", label: "Email notifications" },
];

export const Route = createFileRoute("/_app/more/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Veyvio Driver" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const prefs = useMoreStore((s) => s.notifications);
  const update = useMoreStore((s) => s.updateNotifications);

  return (
    <MoreSubpageLayout title="Notifications">
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {TOGGLES.map(({ key, label, mandated }) => (
          <label key={key} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm">
              {label}
              {mandated && <span className="mt-0.5 block text-xs text-muted">Required while on duty</span>}
            </span>
            <input
              type="checkbox"
              checked={prefs[key]}
              disabled={mandated}
              onChange={(e) => update({ [key]: e.target.checked })}
              className="size-5 accent-primary"
            />
          </label>
        ))}
      </div>
    </MoreSubpageLayout>
  );
}
