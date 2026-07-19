import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSupabaseClient } from "@/lib/supabase/client";
import { countUnread } from "@/services/notifications.service";
import { DRIVER_NOTIFICATIONS_CHANGED } from "@/lib/notifications/unread-events";

/**
 * Live unread notification count for the bottom nav badge.
 * Updates on push alerts, mark-read, polling, and inbox navigation — not every tab switch.
 */
export function useDriverUnreadNotificationCount(userId) {
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      const n = await countUnread(userId);
      setCount(n);
    } catch {
      /* keep last known count */
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onInbox =
      pathname === "/messages" ||
      pathname === "/notifications" ||
      pathname === "/contact" ||
      pathname.startsWith("/threads/");
    if (onInbox) void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!userId) return undefined;

    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(DRIVER_NOTIFICATIONS_CHANGED, onChanged);

    const interval = window.setInterval(() => {
      void refresh();
    }, 60_000);

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`driver-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(DRIVER_NOTIFICATIONS_CHANGED, onChanged);
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return count;
}
