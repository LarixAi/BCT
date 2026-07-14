export type AppLockTimeoutMinutes = 1 | 5 | 15 | 30;

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  browser?: string;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  platform: string;
  locationLabel: string;
  lastActiveAt: string;
  signedInAt: string;
  isCurrent: boolean;
  trusted: boolean;
}

export type SecurityEventType =
  | "sign_in"
  | "sign_out"
  | "password_change"
  | "password_reset_requested"
  | "biometric_enabled"
  | "biometric_disabled"
  | "app_lock_enabled"
  | "app_lock_disabled"
  | "device_signed_out"
  | "mfa_verified";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  summary: string;
  detail?: string;
  deviceName: string;
  occurredAt: string;
}
