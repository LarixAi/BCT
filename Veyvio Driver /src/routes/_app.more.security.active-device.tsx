import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Smartphone } from "lucide-react";
import { HomeCard, HomeDetailRow } from "@/components/driver/home/HomeCard";
import { MoreField, MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { driverCopy } from "@/copy/driver-messages";
import { formatRelativeSecurityTime } from "@/domain/security/security-format";
import { buildCurrentDeviceInfo } from "@/platform/auth/device-info";
import { listDeviceSessions } from "@/platform/auth/device-sessions";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import type { DeviceSession } from "@/types/security";

export const Route = createFileRoute("/_app/more/security/active-device")({
  head: () => ({ meta: [{ title: "Active device — Veyvio Driver" }] }),
  component: ActiveDevicePage,
});

function ActiveDevicePage() {
  const ensureCurrentDeviceId = useSessionStore((s) => s.ensureCurrentDeviceId);
  const trustedDevice = useSessionStore((s) => s.trustedDevice);
  const depotName = useTenancyStore((s) => s.depotName);
  const [currentSession, setCurrentSession] = useState<DeviceSession | null>(null);

  const deviceId = ensureCurrentDeviceId();
  const deviceInfo = useMemo(() => buildCurrentDeviceInfo(deviceId), [deviceId]);

  useEffect(() => {
    void listDeviceSessions(deviceId).then((sessions) => {
      setCurrentSession(sessions.find((session) => session.isCurrent) ?? null);
    });
  }, [deviceId]);

  return (
    <MoreSubpageLayout title="Active device" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.activeDeviceIntro}</p>

      <HomeCard tone="teal">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{deviceInfo.name}</p>
            <p className="mt-1 text-sm text-muted">{deviceInfo.platform}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-bold text-ok">
                {driverCopy.security.activeDeviceCurrent}
              </span>
              {trustedDevice && (
                <span className="rounded-full bg-link/15 px-2 py-0.5 text-xs font-bold text-link">
                  {driverCopy.security.activeDeviceTrusted}
                </span>
              )}
            </div>
          </div>
        </div>
      </HomeCard>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <MoreField label="Device" value={deviceInfo.name} />
        <MoreField label={driverCopy.security.activeDeviceOs} value={`${deviceInfo.platform} ${deviceInfo.osVersion}`} />
        {deviceInfo.browser && (
          <MoreField label={driverCopy.security.activeDeviceBrowser} value={deviceInfo.browser} />
        )}
        <MoreField label={driverCopy.security.activeDeviceAppVersion} value={deviceInfo.appVersion} />
        {depotName && <MoreField label="Reporting depot" value={depotName} />}
        {currentSession && (
          <>
            <MoreField
              label={driverCopy.security.activeDeviceLastActive}
              value={formatRelativeSecurityTime(currentSession.lastActiveAt)}
            />
            <MoreField
              label={driverCopy.security.activeDeviceSignedIn}
              value={formatRelativeSecurityTime(currentSession.signedInAt)}
            />
          </>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <HomeDetailRow label="Device ID" value={<span className="font-mono text-xs">{deviceInfo.id}</span>} />
      </div>
    </MoreSubpageLayout>
  );
}
