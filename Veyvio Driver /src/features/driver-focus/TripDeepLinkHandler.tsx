import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export function parseDutyNavUrl(url: string): string | null {
  const patterns = [
    /veyvio-driver:\/\/duties\/([^/?#]+)\/nav/i,
    /\/duties\/([^/?#]+)\/nav/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function TripDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const openDutyNav = (dutyId: string) => {
      void navigate({ to: "/duties/$dutyId/nav", params: { dutyId } });
    };

    const handleUrl = (url: string) => {
      const dutyId = parseDutyNavUrl(url);
      if (dutyId) openDutyNav(dutyId);
    };

    void App.getLaunchUrl().then((result) => {
      if (result?.url) handleUrl(result.url);
    });

    let disposed = false;
    const listeners: Array<{ remove: () => Promise<void> }> = [];

    void App.addListener("appUrlOpen", ({ url }) => handleUrl(url)).then((handle) => {
      if (!disposed) listeners.push(handle);
      else void handle.remove();
    });

    if (Capacitor.isPluginAvailable("LocalNotifications")) {
      void import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
        void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
          const dutyId = event.notification.extra?.dutyId;
          if (typeof dutyId === "string") openDutyNav(dutyId);
        }).then((handle) => {
          if (!disposed) listeners.push(handle);
          else void handle.remove();
        });
      });
    }

    return () => {
      disposed = true;
      void Promise.all(listeners.map((listener) => listener.remove()));
    };
  }, [navigate]);

  return null;
}
