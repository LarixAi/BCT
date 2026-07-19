import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { playNotificationSound } from "@/lib/notifications/notification-sound";
import { notifyDriverNotificationsChanged } from "@/lib/notifications/unread-events";

/**
 * Plays an alert when a new in-app notification row is inserted for this driver.
 * Covers web sessions and cases where push arrives after the DB row exists.
 */
export function useDriverNotificationAlert(userId) {
  useEffect(() => {
    if (!userId) return undefined;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`driver-notification-alert-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          playNotificationSound();
          notifyDriverNotificationsChanged();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
