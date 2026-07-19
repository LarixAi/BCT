import { Check, ChevronRight, Clock, Lock, AlertTriangle, Circle } from "lucide-react";
import { OnboardingStatusIcon } from "@/components/driver/onboarding/OnboardingStatusBadge";

export default function OnboardingTaskRow({ task, status, onPress, disabled }) {
  const Icon = task.icon;
  const isLocked = status === "locked" || disabled;
  const isActionRequired = status === "action_required" || status === "rejected";
  const isCompleted = status === "completed" || status === "approved";
  const isReady = status === "ready" || status === "current" || status === "in_progress";

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={isLocked}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border transition-colors ${
        isLocked ? "opacity-45 cursor-not-allowed" : "active:bg-muted/60"
      } ${isCompleted ? "bg-[#8ec63f]/8" : isActionRequired ? "bg-amber-50" : isReady ? "bg-[#1eaeae]/6" : "bg-card"}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isCompleted
            ? "bg-[#8ec63f]/20 text-[#6fa82e]"
            : isActionRequired
              ? "bg-amber-100 text-amber-700"
              : isReady
                ? "bg-[#1eaeae]/15 text-[#1eaeae]"
                : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[15px] font-medium leading-snug ${
            isLocked ? "text-muted-foreground" : isCompleted ? "text-foreground" : "text-foreground"
          }`}
        >
          {task.title}
        </p>
        {task.description ? (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
        ) : null}
      </div>
      <OnboardingStatusIcon status={status} />
    </button>
  );
}
