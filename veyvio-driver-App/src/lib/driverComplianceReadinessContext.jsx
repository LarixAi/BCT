import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { withTimeout } from "@/lib/withTimeout";
import { loadDriverComplianceReadiness } from "@/services/driver-compliance.service";

const DriverComplianceReadinessContext = createContext(null);

/**
 * Fetches compliance readiness once per driver and shares it across every
 * DriverOperationalGuard on the page tree. Without this, each guarded route
 * re-ran the same multi-query Supabase check on every navigation, adding a
 * "Checking access…" spinner + up to 12s of latency to every page load.
 */
export function DriverComplianceReadinessProvider({ driver, children }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const driverId = driver?.id ?? null;

  const refresh = useCallback(() => {
    if (!driverId) {
      setLoading(false);
      setReadiness(null);
      return;
    }
    setLoading(true);
    void withTimeout(loadDriverComplianceReadiness(driver), 12_000, null)
      .then(setReadiness)
      .catch(() => setReadiness(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ readiness, loading, refresh }), [readiness, loading, refresh]);

  return (
    <DriverComplianceReadinessContext.Provider value={value}>
      {children}
    </DriverComplianceReadinessContext.Provider>
  );
}

export function useDriverComplianceReadiness() {
  const ctx = useContext(DriverComplianceReadinessContext);
  if (!ctx) {
    throw new Error("useDriverComplianceReadiness must be used within a DriverComplianceReadinessProvider");
  }
  return ctx;
}
