/** Canonical driver onboarding / app-invite notification type ids. */
export const DRIVER_ONBOARDING_NOTIFICATION_TYPES = [
  'driver.onboarding.request_sent',
  'driver.onboarding.request_opened',
  'driver.onboarding.reminder_sent',
  'driver.onboarding.request_overdue',
  'driver.onboarding.evidence_submitted',
  'driver.onboarding.evidence_rejected',
  'driver.onboarding.evidence_approved',
  'driver.onboarding.training_requested',
  'driver.onboarding.training_assigned',
  'driver.onboarding.training_completed',
  'driver.onboarding.ready_for_activation',
  'driver.app_invite.delivery_failed',
  'driver.app_invite.expiring',
  'driver.app_invite.accepted',
] as const

export type DriverOnboardingNotificationType =
  (typeof DRIVER_ONBOARDING_NOTIFICATION_TYPES)[number]
