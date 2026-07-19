import DriverMobileAuthLayout, { driverAuthLinkClass } from "@/components/driver/auth/DriverMobileAuthLayout";
import { getRestrictedReason } from "@/lib/driver-access-mode";

export default function DriverRestrictedScreen({ session, driver, onLogout }) {
  const info = getRestrictedReason({
    driverRow: session?.driverRow,
    driver,
    rejectionReason: driver?.rejectionReason ?? session?.driverRow?.rejection_reason,
    temporaryAccess: session?.temporaryAccess,
  });

  return (
    <DriverMobileAuthLayout
      title={info.title}
      subtitle="You cannot access jobs or vehicle checks right now."
      centerContent
      stickyFooter={
        <button type="button" onClick={onLogout} className={`w-full py-2 text-sm ${driverAuthLinkClass}`}>
          Sign out
        </button>
      }
    >
      <div className="driver-auth-card border-destructive/20 p-4 text-left text-sm">
        <p className="font-semibold text-foreground">Reason</p>
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{info.reason}</p>
        <p className="mt-4 font-semibold text-foreground">What to do</p>
        <p className="mt-1 text-muted-foreground">{info.guidance}</p>
      </div>
    </DriverMobileAuthLayout>
  );
}
