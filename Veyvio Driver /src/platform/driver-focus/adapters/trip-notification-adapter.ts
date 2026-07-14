import { Capacitor } from "@capacitor/core";
import type { TripOverlayPayload } from "./stub-adapters";
import { tripNavDeepLink } from "@/platform/native/plugins/trip-overlay-plugin";

const TRIP_NOTIFICATION_ID = 9001;
const TRIP_CHANNEL_ID = "veyvio-active-trip";

export interface TripNotificationAdapter {
  readonly supported: boolean;
  show(payload: TripOverlayPayload): Promise<void>;
  hide(): Promise<void>;
  isVisible(): boolean;
}

class WebTripNotificationAdapter implements TripNotificationAdapter {
  readonly supported = typeof window !== "undefined" && "Notification" in window;
  private visible = false;

  isVisible(): boolean {
    return this.visible;
  }

  async show(payload: TripOverlayPayload): Promise<void> {
    if (!this.supported) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return;

    const body = [
      `Next: ${payload.nextStopLabel}`,
      `${payload.etaLabel} · ${payload.distanceLabel}`,
      payload.passengerProgressLabel,
    ].join("\n");

    new Notification(`Veyvio · ${payload.tripStateLabel}`, {
      body,
      tag: "veyvio-active-trip",
      requireInteraction: true,
    });
    this.visible = true;
  }

  async hide(): Promise<void> {
    this.visible = false;
  }
}

class NativeTripNotificationAdapter implements TripNotificationAdapter {
  readonly supported = true;
  private visible = false;

  isVisible(): boolean {
    return this.visible;
  }

  async show(payload: TripOverlayPayload): Promise<void> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") return;

    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: TRIP_CHANNEL_ID,
        name: "Active trip",
        description: "Operational trip updates while Veyvio is in the background",
        importance: 4,
        visibility: 0,
      });
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: TRIP_NOTIFICATION_ID,
          title: `Veyvio · ${payload.tripStateLabel}`,
          body: `Next: ${payload.nextStopLabel} · ${payload.etaLabel}`,
          extra: {
            dutyId: payload.dutyId,
            action: "open",
            deepLink: tripNavDeepLink(payload.dutyId),
          },
          ongoing: true,
          autoCancel: false,
          channelId: TRIP_CHANNEL_ID,
        },
      ],
    });
    this.visible = true;
  }

  async hide(): Promise<void> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: TRIP_NOTIFICATION_ID }] });
    this.visible = false;
  }
}

export function createTripNotificationAdapter(): TripNotificationAdapter {
  if (Capacitor.isNativePlatform()) return new NativeTripNotificationAdapter();
  return new WebTripNotificationAdapter();
}
