import { BookOpen, CheckCircle2 } from "lucide-react";
import { OnboardingToggleField } from "@/components/driver/onboarding/OnboardingFormField";

export default function DriverPolicyAcceptRow({
  policy,
  viewed,
  accepted,
  onRead,
  onAccept,
  disabled = false,
}) {
  const hasViewed = viewed.has(policy.policyKey);
  const canAccept = hasViewed && !disabled;

  return (
    <div className="bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{policy.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Version {policy.policyVersion}</p>
        </div>
        <button
          type="button"
          onClick={() => onRead(policy.policyKey)}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#4A7583] hover:text-[#0B0E14]"
        >
          {hasViewed ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#8ec63f]" aria-hidden />
              Read again
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4" aria-hidden />
              Read
            </>
          )}
        </button>
      </div>

      <div className="mt-3">
        <OnboardingToggleField
          label={
            <>
              I have read and accept the <strong>{policy.label}</strong> (v{policy.policyVersion})
            </>
          }
          checked={accepted.has(policy.policyKey)}
          onChange={(checked) => onAccept(policy.policyKey, checked)}
          disabled={!canAccept}
        />
        {!hasViewed ? (
          <p className="mt-2 pl-7 text-xs text-muted-foreground">Open and read the policy before accepting.</p>
        ) : null}
      </div>
    </div>
  );
}
