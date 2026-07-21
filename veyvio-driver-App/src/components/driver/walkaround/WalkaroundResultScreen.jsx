import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EnableBiometricsSheet from "@/features/auth/biometrics/EnableBiometricsSheet";
import { useBiometricEnrollmentPrompt } from "@/features/auth/biometrics/use-biometric-enrollment-prompt";
import { op } from "@/lib/driver-operational-theme";

export default function WalkaroundResultScreen({ result, profile, driverId, onHome }) {
  const isNilDefect = result?.result === "nil_defect";
  const outcome =
    result?.outcome ??
    (result?.result === "pass_with_advisory"
      ? "advisory"
      : isNilDefect || result?.result === "passed"
        ? "nil"
        : "pass");
  const critical = outcome === "critical";
  const review = outcome === "review";
  const advisory = outcome === "advisory" || result?.result === "pass_with_advisory";
  const synced = !result?.queued && Boolean(result?.checkId);
  const dutyReady =
    !critical &&
    !result?.queued &&
    Boolean(result?.autoSignedOn || result?.alreadySignedOn);

  const enrollment = useBiometricEnrollmentPrompt({
    driverId,
    ready: dutyReady,
    delayMs: 2800,
  });

  return (
    <div className={`${op.pageBg} min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center p-6 text-center`}>
      <div
        className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full border ${
          critical
            ? "border-red-200 bg-red-50"
            : review || advisory
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
        }`}
      >
        {critical ? (
          <AlertTriangle className="h-10 w-10 text-red-500" />
        ) : (
          <CheckCircle2
            className={`h-10 w-10 ${review || advisory ? "text-amber-500" : "text-emerald-600"}`}
          />
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground">
        {result.queued
          ? "Saved — waiting to sync"
          : critical
            ? "Do not drive this vehicle"
            : review
              ? "Defect reported"
              : advisory
                ? "Check passed with advisory"
                : isNilDefect
                  ? "Nil defects recorded"
                  : "Check completed"}
      </h2>

      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {result.queued
          ? (result.message ?? "Check saved on this device. It will upload when you have signal.")
          : critical
            ? "A safety-critical defect has been reported. Contact your transport manager immediately. The vehicle has been blocked from dispatch."
            : review
              ? "Your report has been sent to Yard and Admin. Wait for instructions if you are unsure whether the vehicle is safe."
              : advisory
                ? "Vehicle can continue. Advisories have been sent to Yard and Admin for follow-up (e.g. parts due for replacement)."
                : isNilDefect
                  ? "Nil defects reported. Your walkaround is on record and you may continue to your assigned route."
                  : "No defects reported. Vehicle check submitted successfully. You may continue to your assigned route."}
      </p>

      {result?.advisoryCount > 0 ? (
        <p className="mt-4 max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          {result.advisoryCount} advisor{result.advisoryCount === 1 ? "y" : "ies"} recorded for Admin and Yard.
        </p>
      ) : null}

      {result?.autoSignedOn || result?.alreadySignedOn ? (
        <p className="mt-4 max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
          {result.signOnMessage ||
            (result.alreadySignedOn
              ? "Already signed on for duty."
              : "Signed on for duty — Home now shows you on duty.")}
        </p>
      ) : result?.signOnMessage ? (
        <p className="mt-4 max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          {result.signOnMessage}
        </p>
      ) : null}

      {result?.bodyworkDamageCount > 0 ? (
        <p className="mt-4 max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          Bodywork damage photo sent to Yard and Admin for review
          {result.bodyworkDamageCount > 1 ? ` (${result.bodyworkDamageCount} reports)` : ""}.
        </p>
      ) : null}

      {profile?.usedForSchoolTransport && critical && profile?.hasAccessibilityEquipment ? (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 max-w-sm">
          Accessibility defect on a school/SEND route — transport manager review required before passenger work.
        </p>
      ) : null}

      {result.failCount > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {result.failCount} defect{result.failCount === 1 ? "" : "s"} recorded · Yard & Admin notified
        </p>
      ) : synced ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Submitted to admin · Ref {String(result.checkId).slice(0, 8)}
        </p>
      ) : null}

      <Button className={`w-full max-w-xs mt-8 h-12 ${op.primaryBtn}`} onClick={onHome}>
        Back to home
      </Button>

      <EnableBiometricsSheet
        open={enrollment.open}
        onOpenChange={enrollment.setOpen}
        label={enrollment.label}
        busy={enrollment.busy}
        error={enrollment.error}
        onEnable={enrollment.onEnable}
        onRemindNextWeek={enrollment.onRemindNextWeek}
        onDontAskAgain={enrollment.onDontAskAgain}
      />
    </div>
  );
}
