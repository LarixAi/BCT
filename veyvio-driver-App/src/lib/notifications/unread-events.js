/** Fired when in-app notification count may have changed (push, mark read, realtime). */
export const DRIVER_NOTIFICATIONS_CHANGED = "driver-notifications-changed";

export function notifyDriverNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DRIVER_NOTIFICATIONS_CHANGED));
  }
}
