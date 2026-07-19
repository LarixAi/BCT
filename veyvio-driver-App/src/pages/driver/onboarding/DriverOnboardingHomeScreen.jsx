import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { DRIVER_PAGE_SAFE_AREA } from "@/lib/driverSafeArea";
import { useDriverOnboarding } from "@/contexts/DriverOnboardingContext";
import { taskRoute } from "@/lib/onboarding-tasks";
import OnboardingProgressCard from "@/components/driver/onboarding/OnboardingProgressCard";
import OnboardingTaskRow from "@/components/driver/onboarding/OnboardingTaskRow";

export default function DriverOnboardingHomeScreen() {
  const navigate = useNavigate();
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

  function openTask(task) {
    if (!canOpenTask(task)) return;
    if (task.id === "create_account") return;
    navigate(taskRoute(task.id));
  }

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground" style={DRIVER_PAGE_SAFE_AREA}>
      <div className="px-4 pb-8 max-w-lg mx-auto">
        <p className="text-[11px] uppercase tracking-wide text-[#1eaeae] font-semibold pt-2">{APP_DISPLAY_NAME}</p>
        <p className="text-muted-foreground text-sm mt-2">Welcome, {firstName}</p>
        <h1 className="text-2xl font-bold mt-1 text-foreground">Driver setup</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Finish these steps so your transport team can approve you for work.
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
            subtitle={
              isEditable
                ? "Tap a task to continue — completed tasks show a green tick"
                : "Submitted — waiting for admin review"
            }
          />
        </div>

        {nextTask && isEditable ? (
          <button
            type="button"
            onClick={() => openTask(nextTask)}
            className="mt-4 w-full rounded-xl bg-[#1eaeae] text-white py-3 text-sm font-semibold shadow-sm"
          >
            Continue: {nextTask.title}
          </button>
        ) : null}

        <div className="mt-5 rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          {visibleTasks.map((task) => (
            <OnboardingTaskRow
              key={task.id}
              task={task}
              status={getTaskStatus(task)}
              disabled={!canOpenTask(task)}
              onPress={() => openTask(task)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
