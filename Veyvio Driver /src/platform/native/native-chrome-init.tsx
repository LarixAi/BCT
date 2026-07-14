import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export function NativeChromeInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void SplashScreen.hide().catch(() => undefined);
  }, []);
  return null;
}
