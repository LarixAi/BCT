import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { DismissibleNotice } from "@/components/driver/status/DismissibleNotice";
import { useBannerDismissal } from "@/features/banners/use-banner-dismissal";
import { assessDeviceReadiness } from "@/platform/driver-focus/device-readiness";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { useDriverFocusRuntime } from "./DriverFocusProvider";
import { useDriverFocusStore } from "@/store/driver-focus";

export function DeviceReadinessBanner() {
  const settings = useDriverFocusStore((s) => s.settings);
  const permissions = useDriverFocusStore((s) => s.permissions);
  const runtime = useDriverFocusRuntime();

  const report = useMemo(
    () =>
      assessDeviceReadiness({
        capabilities: driverFocusCoordinator.getCapabilities(),
        permissions,
        focusModeEnabled: settings.enabled,
        batteryPercent: runtime.batteryPercent,
        isCharging: runtime.isCharging,
        appVersion: "0.1.0",
      }),
    [permissions, settings.enabled, runtime.batteryPercent, runtime.isCharging],
  );

  const fingerprint = `${report.status}:${report.blockers.join(",")}`;
  const { isDismissed, dismiss } = useBannerDismissal("device_readiness", fingerprint);

  if (report.status === "ready" || isDismissed) return null;

  return (
    <DismissibleNotice
      title={
        report.status === "blocked" ? "Device not ready for release" : "Device readiness check"
      }
      tone="warn"
      onDismiss={dismiss}
      actions={
        <Link to="/more/focus-mode" className="text-xs font-bold text-link">
          Review device readiness
        </Link>
      }
    >
      {report.blockers.length > 0
        ? `Resolve before starting duty: ${report.blockers.join(", ")}`
        : "Some Driver Focus settings need attention before active work."}
    </DismissibleNotice>
  );
}
