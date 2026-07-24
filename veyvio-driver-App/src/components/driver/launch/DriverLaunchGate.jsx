import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { shouldShowLaunchExperience } from "@core-support/brand";
import DriverSplashScreen from "@/components/driver/launch/DriverSplashScreen";
import DriverWelcomeScreen from "@/components/driver/launch/DriverWelcomeScreen";
import { isDriverAuthCallbackLocation, isDriverAuthCallbackUrl } from "@/lib/driverAuthDeepLink";
import { APP_DELIVERY, hasSeenDriverWelcome, SPLASH_DURATION_MS } from "@/lib/driverLaunch";

function shouldSkipLaunchInitially() {
  if (typeof window === "undefined") return false;
  return isDriverAuthCallbackLocation(window.location.href, window.location.pathname);
}

export default function DriverLaunchGate({ children }) {
  // Install splash/welcome only on the native shell — not desktop browser / mobile emulation.
  const showLaunch =
    Capacitor.isNativePlatform() && shouldShowLaunchExperience(APP_DELIVERY);
  const [skipLaunch, setSkipLaunch] = useState(shouldSkipLaunchInitially);
  const [phase, setPhase] = useState(showLaunch && !skipLaunch ? "splash" : "done");

  useEffect(() => {
    if (!showLaunch || skipLaunch) return;
    if (!Capacitor.isNativePlatform()) return;

    void App.getLaunchUrl()
      .then((result) => {
        if (result?.url && isDriverAuthCallbackUrl(result.url)) {
          setSkipLaunch(true);
          setPhase("done");
        }
      })
      .catch(() => {
        /* web / unsupported */
      });
  }, [showLaunch, skipLaunch]);

  useEffect(() => {
    if (!showLaunch || phase !== "splash" || skipLaunch) return undefined;
    const timer = window.setTimeout(() => {
      setPhase(hasSeenDriverWelcome() ? "done" : "welcome");
    }, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase, showLaunch, skipLaunch]);

  if (!showLaunch || skipLaunch || phase === "done") return children;
  if (phase === "splash") return <DriverSplashScreen />;
  return <DriverWelcomeScreen onComplete={() => setPhase("done")} />;
}
