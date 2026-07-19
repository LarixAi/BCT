import { updateCarPlayForSession, clearCarPlayActiveTrip } from "@/lib/navigation/driverCarPlay";
import { updateAndroidAutoForSession, clearAndroidAutoActiveTrip } from "@/lib/navigation/driverAndroidAuto";

/** Push active trip to in-car displays (Apple CarPlay + Android Auto). */
export async function syncInCarActiveTrip(session, options) {
  await Promise.all([
    updateCarPlayForSession(session, options),
    updateAndroidAutoForSession(session, options),
  ]);
}

export async function clearInCarActiveTrip() {
  await Promise.all([clearCarPlayActiveTrip(), clearAndroidAutoActiveTrip()]);
}
