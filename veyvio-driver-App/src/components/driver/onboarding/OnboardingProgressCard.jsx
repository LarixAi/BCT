import { Progress } from "@/components/ui/progress";

export default function OnboardingProgressCard({
  completed,
  total,
  awaitingReview = 0,
  subtitle,
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const waitingOnly = awaitingReview > 0 && awaitingReview === completed && completed === total;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your progress</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {waitingOnly
              ? "Submitted for review"
              : `${completed} of ${total} tasks completed`}
          </p>
          {awaitingReview > 0 && !waitingOnly ? (
            <p className="text-xs text-amber-700 mt-1">
              {awaitingReview} waiting for your transport team
            </p>
          ) : null}
        </div>
        <p className={`text-2xl font-bold ${waitingOnly ? "text-amber-600" : "text-[#8ec63f]"}`}>
          {waitingOnly ? "—" : `${pct}%`}
        </p>
      </div>
      <Progress
        value={waitingOnly ? 100 : pct}
        className={`h-2.5 bg-muted ${waitingOnly ? "[&>div]:bg-amber-400" : "[&>div]:bg-[#8ec63f]"}`}
      />
      {subtitle ? <p className="text-xs text-muted-foreground mt-3">{subtitle}</p> : null}
    </div>
  );
}
