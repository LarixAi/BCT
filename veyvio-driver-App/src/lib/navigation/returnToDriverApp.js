import { Capacitor, registerPlugin } from "@capacitor/core";
import { toast } from "@/components/ui/use-toast";

const DriverNavReturn = registerPlugin("DriverNavReturn");

/** Bring Veyvio Driver to the foreground (Google Maps moves to background). */
export async function bringDriverAppToForeground() {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    await DriverNavReturn.bringToForeground();
    return true;
  } catch (err) {
    console.warn("[returnToDriverApp] bringToForeground failed:", err);
    return false;
  }
}

export function showArrivalReturnToast(destinationLabel) {
  toast({
    title: "You've arrived",
    description: destinationLabel
      ? `Back in Veyvio — confirm arrival at ${destinationLabel.toLowerCase()}.`
      : "Back in Veyvio — confirm your arrival.",
  });
}
