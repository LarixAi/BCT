import { MOCK_COMPANIES, MOCK_DEPOTS, DEFAULT_DRIVER_ROLE } from "@/data/mocks/tenancy";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";

/** Seeds session + tenancy for local dev and e2e when VITE_DEV_BYPASS_AUTH is enabled. */
export function seedDevContext() {
  const session = useSessionStore.getState();
  if (session.status !== "authenticated") {
    useSessionStore.setState({
      status: "authenticated",
      accessToken: "mock_dev_token",
      refreshToken: "mock_dev_refresh",
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      user: {
        id: "usr_dev",
        driverId: "drv_larone",
        email: "a.morgan@northwest-transport.co.uk",
        firstName: "Larone",
        lastName: "Morgan",
      },
      mfaVerified: true,
      bootstrapComplete: true,
      hasSeenWelcome: true,
      hasCompletedDriverOnboarding: true,
      trustedDevice: true,
    });
  } else if (!session.bootstrapComplete || !session.mfaVerified) {
    useSessionStore.setState({
      mfaVerified: true,
      bootstrapComplete: true,
      hasSeenWelcome: true,
      hasCompletedDriverOnboarding: true,
    });
  }

  const tenancy = useTenancyStore.getState();
  if (!tenancy.companyId) {
    useTenancyStore.getState().selectCompany(MOCK_COMPANIES[0], DEFAULT_DRIVER_ROLE);
  }
  if (!tenancy.depotId) {
    useTenancyStore.getState().selectDepot(MOCK_DEPOTS[0]);
  }
}
