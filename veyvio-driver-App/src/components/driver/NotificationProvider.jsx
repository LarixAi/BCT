import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import toast from "react-hot-toast";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import {
  isPushAvailable,
  registerForPushNotifications,
  touchPushTokenLastSeen,
} from "@/services/push-registration.service";
import {
  extractNotificationData,
  routeFromNotificationData,
} from "@/lib/notifications/notification-router";
import { notifyDriverNotificationsChanged } from "@/lib/notifications/unread-events";
import { playNotificationSound } from "@/lib/notifications/notification-sound";
import { useDriverNotificationAlert } from "@/hooks/useDriverNotificationAlert";

/**
 * Registers FCM push tokens and handles notification taps / foreground alerts.
 * Skipped entirely when Firebase is not configured (no google-services.json).
 */
export default function NotificationProvider({ children }) {
  const navigate = useNavigate();
  const { session, driver, screen } = useDriverSupabaseAuth();
  const registeredRef = useRef(false);
  const tokenRef = useRef(null);
  const pushEnabled = isPushAvailable();

  useDriverNotificationAlert(session?.userId);

  useEffect(() => {
    if (!pushEnabled) return;
    if (screen !== "app" || !session?.userId || !driver?.id || !session.organisationId) return;
    if (registeredRef.current) return;

    registeredRef.current = true;

    void registerForPushNotifications({
      driverId: driver.id,
      userId: session.userId,
      organisationId: session.organisationId,
    }).then((result) => {
      if (result.ok && result.token) {
        tokenRef.current = result.token;
      } else if (result.reason === "denied") {
        toast("Enable notifications in Settings for job and message alerts.", { icon: "🔔" });
      }
    });
  }, [pushEnabled, screen, session?.userId, session?.organisationId, driver?.id]);

  useEffect(() => {
    if (!pushEnabled) return;
    if (screen !== "app" || !driver?.id || !tokenRef.current) return;
    void touchPushTokenLastSeen(driver.id, tokenRef.current);
  }, [pushEnabled, screen, driver?.id]);

  useEffect(() => {
    if (!pushEnabled) return;

    const navigateFromPush = (notification) => {
      const data = extractNotificationData(notification);
      routeFromNotificationData(data, navigate);
    };

    const receivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        notifyDriverNotificationsChanged();
        playNotificationSound();
        const data = extractNotificationData(notification);
        const title = notification.title ?? notification.notification?.title ?? "New alert";
        const isMessage =
          data.type === "driver_message_received" ||
          data.type === "admin_message_received" ||
          data.screen === "MessageThread";

        toast(
          (t) => (
            <button
              type="button"
              className="flex w-full items-start gap-2 text-left"
              onClick={() => {
                toast.dismiss(t.id);
                routeFromNotificationData(data, navigate);
              }}
            >
              <span>{isMessage ? "💬" : "🔔"}</span>
              <span className="text-sm font-semibold">{title}</span>
            </button>
          ),
          { duration: 6000 },
        );
      },
    );

    const actionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        notifyDriverNotificationsChanged();
        navigateFromPush(action.notification);
      },
    );

    return () => {
      void receivedListener.then((l) => l.remove());
      void actionListener.then((l) => l.remove());
    };
  }, [pushEnabled, navigate]);

  return children;
}
