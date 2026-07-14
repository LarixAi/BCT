import type { DeviceSession, SecurityEvent } from "@/types/security";

export function buildMockOtherDeviceSessions(currentDeviceId: string): DeviceSession[] {
  const now = Date.now();
  return [
    {
      id: currentDeviceId,
      deviceName: "This phone",
      platform: "Android",
      locationLabel: "Wembley Depot",
      lastActiveAt: new Date(now - 2 * 60 * 1000).toISOString(),
      signedInAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      isCurrent: true,
      trusted: true,
    },
    {
      id: "dev_tablet_wembley",
      deviceName: "Samsung Galaxy Tab A9",
      platform: "Android",
      locationLabel: "Wembley Depot",
      lastActiveAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      signedInAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      trusted: true,
    },
    {
      id: "dev_iphone_personal",
      deviceName: "iPhone 14",
      platform: "iOS",
      locationLabel: "London",
      lastActiveAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      signedInAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      trusted: false,
    },
  ];
}

export function buildMockSecurityActivity(): SecurityEvent[] {
  const now = Date.now();
  return [
    {
      id: "evt_1",
      type: "sign_in",
      summary: "Signed in on this phone",
      deviceName: "This phone",
      occurredAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt_2",
      type: "mfa_verified",
      summary: "Identity verified with authenticator",
      deviceName: "This phone",
      occurredAt: new Date(now - 6 * 60 * 60 * 1000 + 30 * 1000).toISOString(),
    },
    {
      id: "evt_3",
      type: "biometric_enabled",
      summary: "Biometric unlock enabled",
      detail: "Face ID or fingerprint will be required when reopening the app.",
      deviceName: "This phone",
      occurredAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt_4",
      type: "sign_in",
      summary: "Signed in on Samsung Galaxy Tab A9",
      deviceName: "Samsung Galaxy Tab A9",
      occurredAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt_5",
      type: "password_reset_requested",
      summary: "Password reset link requested",
      detail: "Sent to registered work email.",
      deviceName: "Samsung Galaxy Tab A9",
      occurredAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt_6",
      type: "device_signed_out",
      summary: "Signed out iPhone 14 remotely",
      deviceName: "iPhone 14",
      occurredAt: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
