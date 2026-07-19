import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import { onboardingStatusLabel } from "@/lib/onboarding-status";
import { getDriverOnboardingState } from "@/services/onboarding.service";

export default function DriverPendingApprovalScreen({ driver, onRefresh, onLogout }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!driver) return;
    void getDriverOnboardingState(driver).then(setState);
  }, [driver]);

  const submittedLabels = (state?.steps ?? [])
    .filter((s) => s.status === "submitted" || s.status === "verified")
    .map((s) => s.stepLabel)
    .slice(0, 12);

  const docLabels = (state?.submittedDocuments ?? []).map((d) =>
    d.document_type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  return (
    <DriverMobileAuthLayout
      title="Application submitted"
      subtitle="Your transport team is reviewing your details. You cannot receive jobs yet."
      centerContent
      stickyFooter={
        <div className="space-y-3">
          <DriverAuthPrimaryButton type="button" onClick={() => void onRefresh?.()}>
            Refresh status
          </DriverAuthPrimaryButton>
          <button type="button" onClick={onLogout} className={`w-full py-2 text-sm ${driverAuthLinkClass}`}>
            Sign out
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#8ec63f]/15">
          <CheckCircle2 className="h-8 w-8 text-[#7db535]" aria-hidden />
        </div>

        <p className="text-sm font-medium text-[#5B8C9B]">
          Status: {onboardingStatusLabel(state?.canonicalOnboardingStatus ?? "submitted")}
        </p>

        {(submittedLabels.length > 0 || docLabels.length > 0) && (
          <div className="driver-auth-card mt-6 w-full p-4 text-left text-sm">
            <p className="font-semibold text-foreground">Submitted</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {submittedLabels.map((label) => (
                <li key={label}>• {label}</li>
              ))}
              {docLabels.map((label) => (
                <li key={label}>• {label}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          We will notify you when your account is approved.
        </p>
      </div>
    </DriverMobileAuthLayout>
  );
}
