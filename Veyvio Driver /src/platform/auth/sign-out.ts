import { buildMockHomeSummary } from "@/data/mocks/home-summary";
import { buildMockMessagesInbox } from "@/data/mocks/messages-inbox";
import { buildMockTripsSchedule } from "@/data/mocks/trips-schedule";
import { assessSignOut, type SignOutAssessment, type SignOutContext } from "@/domain/auth/sign-out-policy";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { useSyncStore } from "@/platform/sync/outbox";
import { useDriverFocusStore } from "@/store/driver-focus";
import { useDriverStore } from "@/store/driver";
import { useMessagesStore } from "@/store/messages";
import { useTripOverlayStore } from "@/store/trip-overlay";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { useVehicleMotionStore } from "@/store/vehicle-motion";
import { clearPersistedSession } from "./token-storage";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import type { SessionState } from "@/types/auth";

export const SIGNED_OUT_SESSION: SessionState = {
  status: "anonymous",
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  mfaVerified: false,
  biometricEnabled: false,
  pinEnabled: false,
  appLockEnabled: false,
  appLockTimeoutMinutes: 5,
  currentDeviceId: null,
  trustedDevice: false,
  hasSeenWelcome: false,
  hasCompletedDriverOnboarding: false,
  bootstrapComplete: false,
  biometricUnlockedThisSession: false,
};

const PERSISTED_KEYS_ON_SIGN_OUT = [
  "veyvio-driver-session-v1",
  "veyvio-driver-tenancy-v1",
  "veyvio-driver-vehicle-check-v1",
] as const;

export function buildSignOutContext(): SignOutContext {
  const driver = useDriverStore.getState();
  const activeDutyId = driver.activeDutyId;
  const duty = activeDutyId ? driver.getDuty(activeDutyId) : null;
  const checkSession = useVehicleCheckStore.getState().activeSession;
  const sync = useSyncStore.getState();
  const recoverySnapshot = useDriverFocusStore.getState().recoverySnapshot;

  return {
    activeDutyId,
    dutyLifecycleStatus: duty?.lifecycleStatus ?? null,
    operationalState: driver.homeSummary.operationalState,
    vehicleCheckPhase: checkSession?.phase ?? null,
    pendingSyncCount: sync.pendingCount,
    failedSyncCount: sync.failedCount,
    hasTripRecovery: recoverySnapshot != null,
  };
}

export function getSignOutAssessment(): SignOutAssessment {
  return assessSignOut(buildSignOutContext());
}

export async function performSignOut(): Promise<void> {
  await driverFocusCoordinator.shutdown("DRIVER_LOGGED_OUT");

  for (const key of PERSISTED_KEYS_ON_SIGN_OUT) {
    localStorage.removeItem(key);
  }
  clearPersistedSession();

  const { useSessionStore } = await import("./session-store");
  useSessionStore.setState({ ...SIGNED_OUT_SESSION });
  useTenancyStore.getState().clearContext();
  useDriverFocusStore.setState((state) => ({
    ...state,
    recoverySnapshot: null,
  }));
  useVehicleCheckStore.getState().resetSession();
  useTripOverlayStore.getState().hide();
  useVehicleMotionStore.getState().reset();
  useSyncStore.setState({
    status: "idle",
    lastSyncedAt: null,
    pendingCount: 0,
    failedCount: 0,
  });
  useMessagesStore.setState({
    inbox: buildMockMessagesInbox(),
    conversationDetails: {},
  });
  useDriverStore.setState({
    duties: [],
    activeDutyId: null,
    dutyDetails: {},
    openJourneyDrafts: {},
    endJourneyDrafts: {},
    homeSummary: buildMockHomeSummary(),
    tripsSchedule: buildMockTripsSchedule(),
    messages: [],
    documentWarnings: [],
    drivingSafetyMode: false,
    loading: false,
    error: null,
  });
}
