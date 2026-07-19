import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";
import DriverSplashWordmark from "@/components/driver/launch/DriverSplashWordmark";

export default function DriverSplashScreen() {
  return (
    <div
      className="ridova-launch-splash"
      style={{ paddingTop: DRIVER_SCREEN_TOP }}
      role="status"
      aria-live="polite"
      aria-label="Loading Veyvio"
    >
      <DriverSplashWordmark />
    </div>
  );
}
