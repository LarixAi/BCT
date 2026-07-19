import { Check, ChevronRight, Clock, Lock, AlertTriangle, Circle } from "lucide-react";
import { stepUiStatusLabel } from "@/lib/onboarding-status";

const STATUS_CONFIG = {
  approved: { icon: Check, className: "text-[#8ec63f]", label: "Approved" },
  completed: { icon: Check, className: "text-[#8ec63f]", label: "Completed" },
  ready: { icon: ChevronRight, className: "text-[#1eaeae]", label: "Continue" },
  current: { icon: ChevronRight, className: "text-[#1eaeae]", label: "Continue" },
  in_progress: { icon: Circle, className: "text-[#1eaeae]", label: "In progress" },
  locked: { icon: Lock, className: "text-muted-foreground", label: "Locked" },
  not_started: { icon: Lock, className: "text-muted-foreground", label: "Not started" },
  action_required: { icon: AlertTriangle, className: "text-amber-600", label: "Needs update" },
  rejected: { icon: AlertTriangle, className: "text-amber-600", label: "Needs update" },
  pending_review: { icon: Clock, className: "text-amber-500", label: "Pending review" },
  not_required: { icon: Check, className: "text-muted-foreground", label: "Not required" },
};

export default function OnboardingStatusBadge({ status, compact = false }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.locked;
  const Icon = config.icon;
  const label = stepUiStatusLabel(status) || config.label;
  if (compact) {
    return <Icon className={`w-5 h-5 shrink-0 ${config.className}`} aria-label={label} />;
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function OnboardingStatusIcon({ status }) {
  return <OnboardingStatusBadge status={status} compact />;
}
