import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { useSessionStore } from "@/platform/auth/session-store";
import { appLockTimeoutLabel } from "@/domain/security/security-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/more/security/")({
  head: () => ({ meta: [{ title: "Security — Veyvio Driver" }] }),
  component: SecurityPage,
});

type SecurityRow = {
  label: string;
  href: string;
  status?: string;
};

function SecurityHubRow({ label, href, status }: SecurityRow) {
  return (
    <Link to={href} className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/40">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-2 text-sm text-muted">
        {status && <span className="text-xs font-medium">{status}</span>}
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}

function SecurityPage() {
  const biometricEnabled = useSessionStore((s) => s.biometricEnabled);
  const appLockEnabled = useSessionStore((s) => s.appLockEnabled);
  const appLockTimeoutMinutes = useSessionStore((s) => s.appLockTimeoutMinutes);

  const rows: SecurityRow[] = [
    { label: "Reset password", href: "/more/security/reset-password" },
    { label: "Change password", href: "/more/security/change-password" },
    {
      label: "Biometric unlock",
      href: "/more/security/biometric-unlock",
      status: biometricEnabled ? "Enabled" : "Off",
    },
    {
      label: "App lock",
      href: "/more/security/app-lock",
      status: appLockEnabled ? appLockTimeoutLabel(appLockTimeoutMinutes) : "Off",
    },
    { label: "View active device", href: "/more/security/active-device" },
    { label: "Sign out other devices", href: "/more/security/other-devices" },
    { label: "Security activity", href: "/more/security/activity" },
  ];

  return (
    <MoreSubpageLayout title="Security and biometrics">
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((row) => (
          <SecurityHubRow key={row.href} {...row} />
        ))}
      </div>
      <p className={cn("text-xs text-muted")}>
        Authentication credentials are never stored in ordinary local app storage.
      </p>
      <p className="text-xs text-muted">
        Need help?{" "}
        <Link to="/more/support" className="font-bold text-link">
          Contact operations
        </Link>
      </p>
    </MoreSubpageLayout>
  );
}
