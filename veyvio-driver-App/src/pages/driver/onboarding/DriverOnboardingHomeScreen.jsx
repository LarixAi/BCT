import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { DRIVER_PAGE_SAFE_AREA } from "@/lib/driverSafeArea";
import { useDriverOnboarding } from "@/contexts/DriverOnboardingContext";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { taskRoute } from "@/lib/onboarding-tasks";
import OnboardingProgressCard from "@/components/driver/onboarding/OnboardingProgressCard";
import OnboardingTaskRow from "@/components/driver/onboarding/OnboardingTaskRow";
import BiometricEnrollmentHost from "@/features/auth/biometrics/BiometricEnrollmentHost";

export default function DriverOnboardingHomeScreen() {
  const navigate = useNavigate();
  const { refresh, session } = useDriverSupabaseAuth();
  const {
    driver,
    prefill,
    state,
    loading,
    visibleTasks,
    getTaskStatus,
    canOpenTask,
    progress,
    isEditable,
    nextTask,
    statusLabel,
    dispatchLabel,
  } = useDriverOnboarding();

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1eaeae]/30 border-t-[#1eaeae] rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = (prefill?.fullName ?? driver.fullName).split(" ")[0];
  const reviewTask = visibleTasks.find((t) => t.id === "review");
  const allTasksDone = progress.total > 0 && progress.completed >= progress.total && !nextTask;
  const dispatchReady =
    ["eligible", "restricted"].includes(String(session?.operationalStatus ?? "")) ||
    session?.routeTarget === "home" ||
    driver?.onboardingStatus === "active" ||
    driver?.canonicalOnboardingStatus === "approved" ||
    state?.canonicalOnboardingStatus === "approved";

  function openTask(task) {
    if (!task) return;
    if (task.id === "create_account") return;
    if (task.id === "review") {
      navigate(taskRoute("review"));
      return;
    }
    if (!canOpenTask(task)) return;
    navigate(taskRoute(task.id));
  }

  async function openDriverHome() {
    try {
      sessionStorage.setItem("veyvio.driver.forceAppShell", "1");
    } catch {
      /* ignore */
    }
    navigate("/", { replace: true });
    await refresh?.();
  }

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground" style={DRIVER_PAGE_SAFE_AREA}>
      <div className="px-4 pb-8 max-w-lg mx-auto">
        <p className="text-[11px] uppercase tracking-wide text-[#1eaeae] font-semibold pt-2">{APP_DISPLAY_NAME}</p>
        <p className="text-muted-foreground text-sm mt-2">Welcome, {firstName}</p>
        <h1 className="text-2xl font-bold mt-1 text-foreground">Driver setup</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          {dispatchReady
            ? "Your transport team has activated you. Open Driver home to continue."
            : "Finish these steps so your transport team can approve you for work."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-card border px-3 py-1 font-medium">Status: {statusLabel}</span>
          <span className="rounded-full bg-card border px-3 py-1 text-muted-foreground">{dispatchLabel}</span>
        </div>

        {prefill?.hasAdminData ? (
          <div className="mt-4 flex gap-2 items-start rounded-xl bg-[#1eaeae]/10 border border-[#1eaeae]/25 p-3 text-sm text-[#158888]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Your transport team has added some details already. Review each task and update if needed.</p>
          </div>
        ) : null}

        {state?.rejectionReason ? (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            <p className="font-semibold">Action required</p>
            <p className="mt-1 whitespace-pre-wrap text-amber-800/90">{state.rejectionReason}</p>
          </div>
        ) : null}

        <div className="mt-5">
          <OnboardingProgressCard
            completed={progress.completed}
            total={progress.total}
            awaitingReview={progress.awaitingReview ?? 0}
            subtitle={
              dispatchReady
                ? "Setup complete — you can use the Driver app"
                : !isEditable
                  ? "Submitted — waiting for admin review"
                  : nextTask
                    ? `Next up: ${nextTask.title}`
                    : "Every step is done — submit for admin review, or open Driver home if already activated"
            }
          />
        </div>

        <div className="mt-4 space-y-2">
          {dispatchReady ? (
            <button
              type="button"
              onClick={() => void openDriverHome()}
              className="w-full rounded-xl bg-[#1eaeae] text-white py-3.5 text-sm font-semibold shadow-sm"
            >
              Open Driver home
            </button>
          ) : nextTask && isEditable ? (
            <button
              type="button"
              onClick={() => openTask(nextTask)}
              className="w-full rounded-xl bg-[#1eaeae] text-white py-3 text-sm font-semibold shadow-sm"
            >
              Continue: {nextTask.title}
            </button>
          ) : allTasksDone && reviewTask ? (
            <button
              type="button"
              onClick={() => openTask(reviewTask)}
              className="w-full rounded-xl bg-[#1eaeae] text-white py-3.5 text-sm font-semibold shadow-sm"
            >
              {isEditable ? "Submit for admin review" : "View submission"}
            </button>
          ) : null}

          {/* Escape hatch when admin already activated but session still shows setup */}
          {allTasksDone ? (
            <button
              type="button"
              onClick={() => void openDriverHome()}
              className="w-full rounded-xl border border-[#1eaeae]/40 bg-white py-3 text-sm font-semibold text-[#158888]"
            >
              Already activated? Open Driver home
            </button>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          {visibleTasks.map((task) => (
            <OnboardingTaskRow
              key={task.id}
              task={task}
              status={getTaskStatus(task)}
              disabled={task.id === "review" ? false : !canOpenTask(task)}
              onPress={() => openTask(task)}
            />
          ))}
        </div>
      </div>

      <BiometricEnrollmentHost driverId={driver?.id} ready={!loading} delayMs={2500} />
    </div>
  );
}
