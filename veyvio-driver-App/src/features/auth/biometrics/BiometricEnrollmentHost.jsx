import EnableBiometricsSheet from "./EnableBiometricsSheet";
import { useBiometricEnrollmentPrompt } from "./use-biometric-enrollment-prompt";

/**
 * Progressive Face ID / fingerprint opt-in — mount once per screen after sign-in.
 */
export default function BiometricEnrollmentHost({ driverId, ready = true, delayMs = 3500 }) {
  const enrollment = useBiometricEnrollmentPrompt({ driverId, ready, delayMs });

  return (
    <EnableBiometricsSheet
      open={enrollment.open}
      onOpenChange={enrollment.setOpen}
      label={enrollment.label}
      busy={enrollment.busy}
      error={enrollment.error}
      successLabel={enrollment.successLabel}
      onEnable={enrollment.onEnable}
      onRemindNextWeek={enrollment.onRemindNextWeek}
      onDontAskAgain={enrollment.onDontAskAgain}
    />
  );
}
