import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SystemBarType, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

/** Configures status bar style and hides the native splash once the web app is ready. */
export function NativeChromeInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        await SystemBars.setStyle({
          style: SystemBarsStyle.Dark,
          bar: SystemBarType.StatusBar,
        });
      } catch {
        // SystemBars unavailable on older web runtimes — safe to ignore.
      }
      try {
        await SplashScreen.hide();
      } catch {
        // Splash may already be hidden.
      }
    })();
  }, []);

  return null;
}
