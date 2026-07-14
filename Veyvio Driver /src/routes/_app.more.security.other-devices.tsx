import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { driverCopy } from "@/copy/driver-messages";
import { formatRelativeSecurityTime } from "@/domain/security/security-format";
import {
  listDeviceSessions,
  signOutAllOtherDeviceSessions,
  signOutDeviceSession,
} from "@/platform/auth/device-sessions";
import { useSessionStore } from "@/platform/auth/session-store";
import type { DeviceSession } from "@/types/security";

export const Route = createFileRoute("/_app/more/security/other-devices")({
  head: () => ({ meta: [{ title: "Other devices — Veyvio Driver" }] }),
  component: OtherDevicesPage,
});

function OtherDevicesPage() {
  const ensureCurrentDeviceId = useSessionStore((s) => s.ensureCurrentDeviceId);
  const deviceId = ensureCurrentDeviceId();

  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const refresh = useCallback(async () => {
    setSessions(await listDeviceSessions(deviceId));
  }, [deviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const otherSessions = sessions.filter((session) => !session.isCurrent);

  async function handleSignOut(session: DeviceSession) {
    setLoadingId(session.id);
    const result = await signOutDeviceSession(session.id);
    setLoadingId(null);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(driverCopy.security.otherDevicesSignedOut(session.deviceName));
    await refresh();
  }

  async function handleSignOutAll() {
    setSigningOutAll(true);
    const result = await signOutAllOtherDeviceSessions(deviceId);
    setSigningOutAll(false);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    if (result.count > 0) {
      toast.success(driverCopy.security.otherDevicesSignedOutAll(result.count));
    }
    await refresh();
  }

  return (
    <MoreSubpageLayout title="Sign out other devices" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.otherDevicesIntro}</p>

      {otherSessions.length === 0 ? (
        <HomeCard tone="green">
          <p className="font-semibold">{driverCopy.security.otherDevicesEmptyTitle}</p>
          <p className="mt-2 text-sm text-muted">{driverCopy.security.otherDevicesEmptyHint}</p>
        </HomeCard>
      ) : (
        <>
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <article key={session.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{session.deviceName}</p>
                    <p className="mt-1 text-sm text-muted">
                      {session.platform} · {session.locationLabel}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Last active {formatRelativeSecurityTime(session.lastActiveAt)}
                    </p>
                    {session.trusted && (
                      <span className="mt-2 inline-block rounded-full bg-link/15 px-2 py-0.5 text-xs font-bold text-link">
                        Trusted device
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  disabled={loadingId === session.id || signingOutAll}
                  onClick={() => void handleSignOut(session)}
                >
                  {loadingId === session.id
                    ? driverCopy.security.otherDevicesSigningOut
                    : driverCopy.security.otherDevicesSignOut}
                </Button>
              </article>
            ))}
          </div>

          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={signingOutAll || loadingId != null}
            onClick={() => void handleSignOutAll()}
          >
            {signingOutAll
              ? driverCopy.security.otherDevicesSigningOut
              : driverCopy.security.otherDevicesSignOutAll}
          </Button>
        </>
      )}
    </MoreSubpageLayout>
  );
}
