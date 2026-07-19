import { Progress } from "@/components/ui/progress";

export default function OnboardingProgressCard({ completed, total, subtitle }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your progress</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {completed} of {total} tasks completed
          </p>
        </div>
        <p className="text-2xl font-bold text-[#8ec63f]">{pct}%</p>
      </div>
      <Progress value={pct} className="h-2.5 bg-muted [&>div]:bg-[#8ec63f]" />
      {subtitle ? <p className="text-xs text-muted-foreground mt-3">{subtitle}</p> : null}
    </div>
  );
}
