import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DriverSupabaseAuthProvider, useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { DriverComplianceReadinessProvider } from "@/lib/driverComplianceReadinessContext";
import DriverOperationalGuard from "@/components/driver/DriverOperationalGuard";
import DriverOperationalShell from "@/components/driver/operational/DriverOperationalShell";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverLaunchGate from "@/components/driver/launch/DriverLaunchGate";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import DriverSafeAreaRoot from "@/components/driver/mobile/DriverSafeAreaRoot";
import DriverAuthDeepLinkListener from "@/components/driver/auth/DriverAuthDeepLinkListener";
import NotificationProvider from "@/components/driver/NotificationProvider";
import DriverMatchedTripLayer from "@/components/driver/phv-job/DriverMatchedTripLayer";
import ExternalNavReturnLayer from "@/components/driver/navigation/ExternalNavReturnLayer";
import FloatingBubbleLayer from "@/components/driver/navigation/FloatingBubbleLayer";
import BiometricLockLayer from "@/features/auth/biometrics/BiometricLockLayer";
import { useDriverWebPresence } from "@/hooks/useDriverWebPresence";
import { op } from "@/lib/driver-operational-theme";

function DriverBootLoader({ onRetry, onSignOut }) {
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowEscape(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-dvh ${op.pageBg} flex flex-col items-center justify-center gap-4 px-6 ${op.text}`}>
      <DriverPageLoader />
      {showEscape ? (
        <div className="mt-4 w-full max-w-xs space-y-3 text-center">
          <p className="text-sm text-ink-soft">
            Taking longer than usual. Check your connection, or sign out and try again.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className={`w-full rounded-full py-3 text-sm font-semibold ${op.primaryBtn}`}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className={`w-full py-2 text-sm ${driverAuthLinkClass}`}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Route-level pages are lazy-loaded so the initial bundle (and every cold page
// load) doesn't have to download/parse every screen — including map-heavy
// screens that pull in maplibre-gl/leaflet/moment — up front.
const DriverAuthRoutes = lazy(() => import("./DriverAuthRoutes"));
const DriverOnboardingRouter = lazy(() => import("./onboarding/DriverOnboardingRouter"));
const DriverPendingApprovalScreen = lazy(() => import("./onboarding/DriverPendingApprovalScreen"));
const DriverRestrictedScreen = lazy(() => import("./onboarding/DriverRestrictedScreen"));
const DriverSupabaseHome = lazy(() => import("./DriverSupabaseHome"));
const DriverWalkaroundFlow = lazy(() => import("./DriverWalkaroundFlow"));
const DriverChangeVehicle = lazy(() => import("./DriverChangeVehicle"));
const DriverCheckHistory = lazy(() => import("./DriverCheckHistory"));
const DriverCheckDetail = lazy(() => import("./DriverCheckDetail"));
const DriverJobsHub = lazy(() => import("./DriverJobsHub"));
const DriverDutyCloseout = lazy(() => import("./DriverDutyCloseout"));
const DriverSupabaseJobView = lazy(() => import("./DriverSupabaseJobView"));
const DriverIncomingOffer = lazy(() => import("./DriverIncomingOffer"));
const DriverSupabaseMessages = lazy(() => import("./DriverSupabaseMessages"));
const DriverNotificationsPage = lazy(() => import("./DriverNotificationsPage"));
const DriverDefectReport = lazy(() => import("./DriverDefectReport"));
const DriverSupabaseIncidentReport = lazy(() => import("./DriverSupabaseIncidentReport"));
const DriverLicenceCompliance = lazy(() => import("./DriverLicenceCompliance"));
const DriverSupabaseDocuments = lazy(() => import("./DriverSupabaseDocuments"));
const DriverContactAdmin = lazy(() => import("./DriverContactAdmin"));
const DriverMessageThread = lazy(() => import("./DriverMessageThread"));
const DriverAcknowledgements = lazy(() => import("./DriverAcknowledgements"));
const DriverWorkingTime = lazy(() => import("./DriverWorkingTime"));
const DriverMyDuty = lazy(() => import("./DriverMyDuty"));
const DriverDutyNavigation = lazy(() => import("./DriverDutyNavigation"));
const DriverTimeOffRequest = lazy(() => import("./DriverTimeOffRequest"));
const DriverHolidayCentre = lazy(() => import("./DriverHolidayCentre"));
const DriverSupabaseProfile = lazy(() => import("./DriverSupabaseProfile"));
const DriverEditProfilePage = lazy(() => import("./DriverEditProfilePage"));
const DriverSupabaseSettings = lazy(() => import("./DriverSupabaseSettings"));
const DriverPolicyReack = lazy(() => import("./DriverPolicyReack"));
const DriverHelpSupport = lazy(() => import("./DriverHelpSupport"));
const DriverReportFoundItem = lazy(() => import("./lost-property/DriverReportFoundItem"));
const DriverMyFoundItems = lazy(() => import("./lost-property/DriverMyFoundItems"));
const DriverCompleteDbsPage = lazy(() => import("./DriverCompleteDbsPage"));
const DriverMorePage = lazy(() => import("./DriverMorePage"));
const DriverReadiness = lazy(() => import("./DriverReadiness"));
const DriverVehicleHub = lazy(() => import("./DriverVehicleHub"));
const DriverVehicleEquipment = lazy(() => import("./DriverVehicleEquipment"));
const DriverVehicleDocuments = lazy(() => import("./DriverVehicleDocuments"));
const DriverVehicleHandback = lazy(() => import("./DriverVehicleHandback"));
const DriverCompletedVehicleChecks = lazy(() => import("./DriverCompletedVehicleChecks"));
const DriverSchedule = lazy(() => import("./DriverSchedule"));
const DriverTrainingCentre = lazy(() => import("./DriverTrainingCentre"));
const DriverTrainingAssignmentPage = lazy(() => import("./training/DriverTrainingAssignmentPage"));
const DriverTrainingLessonPage = lazy(() => import("./training/DriverTrainingLessonPage"));
const DriverTrainingDeclarationPage = lazy(() => import("./training/DriverTrainingDeclarationPage"));
const DriverTrainingEvidencePage = lazy(() => import("./training/DriverTrainingEvidencePage"));
const DriverTrainingCompletedPage = lazy(() => import("./training/DriverTrainingCompletedPage"));
const DriverSyncCentre = lazy(() => import("./DriverSyncCentre"));
const DriverSafetyHub = lazy(() => import("./DriverSafetyHub"));

function DriverSupabaseRouter() {
  const { session, driver, screen, loading, login, loginWithBiometrics, logout, refresh } =
    useDriverSupabaseAuth();
  const location = useLocation();
  const pathname = location.pathname;
  // Only real verify/reset routes — never the login page at /auth.
  // (Capacitor uses https://localhost; treating /auth as a callback trapped signed-in users.)
  const onAuthCallbackRoute =
    pathname === "/auth/verify" || pathname === "/auth/reset-password";

  useDriverWebPresence({
    driverId: driver?.id ?? null,
    userId: session?.userId ?? null,
    organisationId: session?.organisationId ?? null,
    active: Boolean(session?.userId && driver?.id && screen !== "login"),
  });

  const lockActive = Boolean(driver?.id && screen !== "login" && !onAuthCallbackRoute);

  if (loading && !onAuthCallbackRoute) {
    return (
      <DriverBootLoader
        onRetry={() => void refresh()}
        onSignOut={() => void logout()}
      />
    );
  }

  if (session?.routeTarget === "module_unavailable") {
    return (
      <DriverMobileAuthLayout
        title="Driver is not on this plan"
        subtitle="Your company licence does not include the Driver workforce module. Ask your transport manager or Veyvio support if this should be enabled."
        centerContent
        stickyFooter={
          <button type="button" onClick={() => void logout()} className={`w-full py-2 text-sm ${driverAuthLinkClass}`}>
            Sign out
          </button>
        }
      />
    );
  }

  if (screen === "unlinked" || session?.routeTarget === "session_error") {
    return (
      <>
        <BiometricLockLayer driverId={driver?.id} active={lockActive} onUsePassword={() => void logout()} />
        <DriverMobileAuthLayout
          title={session?.routeTarget === "session_error" ? "Sign-in could not finish" : "Account not linked"}
          subtitle={
            session?.routeTarget === "session_error"
              ? session?.linkError ||
                "Could not reach Command in time. Wait a moment and tap Try again — the first request after idle can be slow."
              : session?.linkError ||
                "This login is not registered as a driver. Ask your transport manager to invite this email in Veyvio Command."
          }
          centerContent
          stickyFooter={
            <div className="space-y-3">
              <DriverAuthPrimaryButton type="button" onClick={() => void refresh()}>
                Try again
              </DriverAuthPrimaryButton>
              <button type="button" onClick={() => void logout()} className={`w-full py-2 text-sm ${driverAuthLinkClass}`}>
                Sign out
              </button>
            </div>
          }
        />
      </>
    );
  }

  if (screen === "login" || !session || onAuthCallbackRoute) {
    return (
      <Suspense fallback={<DriverPageLoader />}>
        <DriverAuthRoutes login={login} loginWithBiometrics={loginWithBiometrics} refresh={refresh} />
      </Suspense>
    );
  }

  const showOnboarding =
    Boolean(driver) &&
    screen !== "app" &&
    screen !== "pending" &&
    screen !== "restricted" &&
    screen !== "policy_reack" &&
    session?.routeTarget !== "home" &&
    typeof window !== "undefined" &&
    sessionStorage.getItem("veyvio.driver.forceAppShell") !== "1" &&
    (screen === "onboarding" || session?.routeTarget === "onboarding");

  const lockLayer = (
    <BiometricLockLayer driverId={driver?.id} active={lockActive} onUsePassword={() => void logout()} />
  );

  if (showOnboarding) {
    return (
      <>
        {lockLayer}
        <Suspense fallback={<DriverPageLoader />}>
          <Routes>
            <Route
              path="/onboarding/*"
              element={
                <DriverOnboardingRouter
                  driver={driver}
                  organisationId={session.organisationId}
                  onSubmitted={() => refresh()}
                  onRefresh={() => refresh()}
                />
              }
            />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  if (!driver && screen === "onboarding") {
    return (
      <>
        {lockLayer}
        <DriverMobileAuthLayout
          title="No driver profile linked"
          subtitle={
            session?.linkError ||
            "Ask your transport manager to invite you in Veyvio Command, accept the invite with this email, then sign in again."
          }
          centerContent
          stickyFooter={
            <div className="space-y-3">
              <DriverAuthPrimaryButton type="button" onClick={() => void refresh()}>
                Try again
              </DriverAuthPrimaryButton>
              <button type="button" onClick={() => void logout()} className={`w-full py-2 text-sm ${driverAuthLinkClass}`}>
                Sign out
              </button>
            </div>
          }
        />
      </>
    );
  }

  if (screen === "pending") {
    return (
      <>
        {lockLayer}
        <Suspense fallback={<DriverPageLoader />}>
          <DriverPendingApprovalScreen driver={driver} onRefresh={refresh} onLogout={logout} />
        </Suspense>
      </>
    );
  }

  if (screen === "restricted") {
    return (
      <>
        {lockLayer}
        <Suspense fallback={<DriverPageLoader />}>
          <DriverRestrictedScreen session={session} driver={driver} onLogout={logout} />
        </Suspense>
      </>
    );
  }

  if (screen === "policy_reack" && driver) {
    return (
      <>
        {lockLayer}
        <DriverSafeAreaRoot>
          <Suspense fallback={<DriverPageLoader />}>
            <Routes>
              <Route
                path="/*"
                element={
                  <DriverPolicyReack
                    blocking
                    driver={driver}
                    organisationId={session.organisationId}
                    onComplete={() => refresh()}
                  />
                }
              />
            </Routes>
          </Suspense>
        </DriverSafeAreaRoot>
      </>
    );
  }

  return (
    <>
      {lockLayer}
      <DriverSafeAreaRoot>
      <DriverComplianceReadinessProvider driver={driver}>
      <NotificationProvider>
        <ExternalNavReturnLayer />
        <FloatingBubbleLayer />
        <DriverMatchedTripLayer />
        <Suspense fallback={<DriverPageLoader />}>
        <Routes>
        <Route element={<DriverOperationalShell />}>
          <Route path="/" element={<DriverSupabaseHome driver={driver} />} />
          <Route
            path="/duty"
            element={
              <DriverOperationalGuard driver={driver} section="duty">
                <DriverMyDuty driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/check"
            element={
              <DriverOperationalGuard driver={driver} section="check">
                <DriverWalkaroundFlow driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/check/vehicles"
            element={
              <DriverOperationalGuard driver={driver} section="check">
                <DriverChangeVehicle driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/check/history"
            element={
              <DriverOperationalGuard driver={driver} section="check">
                <DriverCheckHistory driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/check/history/:checkId"
            element={
              <DriverOperationalGuard driver={driver} section="check">
                <DriverCheckDetail driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/jobs"
            element={
              <DriverOperationalGuard driver={driver} section="jobs">
                <DriverJobsHub driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route path="/trips" element={<Navigate to="/jobs" replace />} />
          <Route path="/trips/:id" element={<Navigate to="/jobs" replace />} />
          <Route
            path="/duty/:dutyId/navigate"
            element={
              <DriverOperationalGuard driver={driver} section="jobs">
                <DriverDutyNavigation driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/offers/:offerId"
            element={
              <DriverOperationalGuard driver={driver} section="jobs">
                <DriverIncomingOffer />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/job/:id"
            element={
              <DriverOperationalGuard driver={driver} section="job">
                <DriverSupabaseJobView driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/job/:jobId/closeout"
            element={
              <DriverOperationalGuard driver={driver} section="job">
                <DriverDutyCloseout driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/defects"
            element={
              <DriverOperationalGuard driver={driver} section="defects">
                <DriverDefectReport driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/incidents/new"
            element={
              <DriverOperationalGuard driver={driver} section="incidents">
                <DriverSupabaseIncidentReport driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/lost-property/report"
            element={
              <DriverOperationalGuard driver={driver} section="lost-property">
                <DriverReportFoundItem driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/lost-property"
            element={
              <DriverOperationalGuard driver={driver} section="lost-property">
                <DriverMyFoundItems driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/documents"
            element={
              <DriverOperationalGuard driver={driver} section="documents">
                <DriverSupabaseDocuments driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/notifications"
            element={
              <DriverOperationalGuard driver={driver} section="notifications">
                <DriverNotificationsPage />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/messages"
            element={
              <DriverOperationalGuard driver={driver} section="notifications">
                <DriverSupabaseMessages />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/contact"
            element={
              <DriverOperationalGuard driver={driver} section="contact">
                <DriverContactAdmin driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/threads/:threadId"
            element={
              <DriverOperationalGuard driver={driver} section="thread">
                <DriverMessageThread driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/acknowledgements"
            element={
              <DriverOperationalGuard driver={driver} section="acknowledgements">
                <DriverAcknowledgements driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/working-time"
            element={
              <DriverOperationalGuard driver={driver} section="working-time">
                <DriverWorkingTime driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/holiday"
            element={
              <DriverOperationalGuard driver={driver} section="profile">
                <DriverHolidayCentre driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route
            path="/time-off"
            element={
              <DriverOperationalGuard driver={driver} section="profile">
                <DriverTimeOffRequest driver={driver} />
              </DriverOperationalGuard>
            }
          />
          <Route path="/more" element={<DriverMorePage driver={driver} onLogout={logout} />} />
          <Route path="/profile" element={<Navigate to="/more" replace />} />
          <Route path="/profile/details" element={<DriverSupabaseProfile driver={driver} onLogout={logout} />} />
          <Route path="/profile/edit" element={<DriverEditProfilePage driver={driver} />} />
          <Route path="/readiness" element={<DriverReadiness driver={driver} />} />
          <Route path="/vehicle" element={<DriverVehicleHub driver={driver} />} />
          <Route path="/vehicle/equipment" element={<DriverVehicleEquipment driver={driver} />} />
          <Route path="/vehicle/documents" element={<DriverVehicleDocuments driver={driver} />} />
          <Route path="/vehicle/handback" element={<DriverVehicleHandback driver={driver} />} />
          <Route
            path="/vehicle/checks"
            element={<DriverCompletedVehicleChecks driver={driver} />}
          />
          <Route path="/schedule" element={<DriverSchedule driver={driver} />} />
          <Route path="/training" element={<DriverTrainingCentre driver={driver} />} />
          <Route path="/training/:assignmentId" element={<DriverTrainingAssignmentPage driver={driver} />} />
          <Route
            path="/training/:assignmentId/lesson/:lessonId"
            element={<DriverTrainingLessonPage driver={driver} />}
          />
          <Route
            path="/training/:assignmentId/declaration"
            element={<DriverTrainingDeclarationPage driver={driver} />}
          />
          <Route
            path="/training/:assignmentId/evidence"
            element={<DriverTrainingEvidencePage driver={driver} />}
          />
          <Route
            path="/training/:assignmentId/completed"
            element={<DriverTrainingCompletedPage driver={driver} />}
          />
          <Route path="/sync" element={<DriverSyncCentre driver={driver} />} />
          <Route path="/safety" element={<DriverSafetyHub driver={driver} />} />
          <Route path="/profile/licence" element={<DriverLicenceCompliance />} />
          <Route path="/profile/settings" element={<DriverSupabaseSettings driver={driver} />} />
          <Route path="/profile/security" element={<Navigate to="/profile/settings" replace />} />
          <Route path="/settings" element={<Navigate to="/profile/settings" replace />} />
          <Route path="/policies" element={<DriverPolicyReack driver={driver} organisationId={session.organisationId} onComplete={() => refresh()} />} />
          <Route path="/help" element={<DriverHelpSupport />} />
          <Route
            path="/complete-dbs"
            element={
              <DriverCompleteDbsPage
                driver={driver}
                organisationId={session.organisationId}
                onComplete={() => refresh()}
              />
            }
          />
          <Route path="/onboarding/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
      </NotificationProvider>
      </DriverComplianceReadinessProvider>
    </DriverSafeAreaRoot>
    </>
  );
}

export default function DriverApp() {
  return (
    <DriverSupabaseAuthProvider>
      <DriverAuthDeepLinkListener />
      {/* Splash + welcome once per install — before auth resolves and after cold start. */}
      <DriverLaunchGate>
        <DriverSupabaseRouter />
      </DriverLaunchGate>
    </DriverSupabaseAuthProvider>
  );
}
