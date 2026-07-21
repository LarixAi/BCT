import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { withTimeout } from "@/lib/withTimeout";
import { loadDriverComplianceReadiness, canAccessDriverSection, getPrimaryComplianceFix } from "@/services/driver-compliance.service";
import { Button } from "@/components/ui/button";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { op } from "@/lib/driver-operational-theme";

export default function DriverOperationalGuard({ driver, section, children }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void withTimeout(loadDriverComplianceReadiness(driver), 12_000, null)
      .then(setReadiness)
      .catch(() => setReadiness(null))
      .finally(() => setLoading(false));
  }, [driver?.id]);

  if (loading) {
    return (
      <div className={`min-h-[50vh] ${op.pageBg} flex items-center justify-center`}>
        <DriverPageLoader label="Checking access…" />
      </div>
    );
  }

  if (!canAccessDriverSection(section, readiness)) {
    const fix = getPrimaryComplianceFix(readiness);
    const reason =
      fix?.message ??
      readiness?.blockers?.[0] ??
      "Finish the steps below, then try this screen again.";
    return (
      <div className={`${op.pageBg} p-6`}>
        <div className={`mx-auto mt-12 max-w-md space-y-4 p-5 ${op.card}`}>
          <h2 className="text-xl font-bold text-foreground">Not ready yet</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{reason}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {fix ? (
              <Button asChild className={op.primaryBtn}>
                <Link to={fix.href}>{fix.label}</Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link to="/more">Back to More</Link>
            </Button>
            {readiness?.canAccessVehicleCheck ? (
              <Button asChild className={op.primaryBtn}>
                <Link to="/check">Start vehicle check</Link>
              </Button>
            ) : null}
            {readiness?.outdatedPolicies?.length > 0 ? (
              <Button asChild variant="secondary">
                <Link to="/policies">Review policies</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return children;
}
