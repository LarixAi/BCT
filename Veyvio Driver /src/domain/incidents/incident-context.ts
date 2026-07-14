import type { DutyDetail } from "@/types/duty";
import type { IncidentOperationalContext } from "@veyvio/incidents";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useDriverStore } from "@/store/driver";

const APP_VERSION = "0.1.0";

export function buildIncidentOperationalContext(duty?: DutyDetail | null): IncidentOperationalContext {
  const session = useSessionStore.getState();
  const tenancy = useTenancyStore.getState();
  const driverState = useDriverStore.getState();
  const activeDuty =
    duty ??
    (driverState.activeDutyId ? driverState.getDuty(driverState.activeDutyId) ?? driverState.dutyDetails[driverState.activeDutyId] : null);

  const run = activeDuty?.runs.find((r) => r.status === "active") ?? activeDuty?.runs[0];
  const passengers =
    run?.stops.flatMap((stop) =>
      stop.passengerTasks.map((task) => ({
        passengerId: task.passengerId,
        name: task.passengerName,
      })),
    ) ?? [];

  const uniquePassengers = Array.from(new Map(passengers.map((p) => [p.passengerId, p])).values()).map(
    (passenger) => {
      const profile = getPassengerProfile(passenger.passengerId);
      return {
        ...passenger,
        name: profile?.displayName ?? passenger.name,
        accessibilitySummary: profile?.journeySummary,
      };
    },
  );

  return {
    driverId: session.user?.driverId,
    driverName: session.user ? `${session.user.firstName} ${session.user.lastName}` : undefined,
    vehicleId: activeDuty?.vehicle?.id,
    vehicleRegistration: activeDuty?.vehicle?.registrationNumber,
    tripId: activeDuty?.id,
    runId: run?.id,
    runReference: run?.name,
    depotId: tenancy.depotId ?? undefined,
    depotName: tenancy.depotName ?? undefined,
    passengerManifest: uniquePassengers,
    deviceId: session.ensureCurrentDeviceId(),
    appVersion: APP_VERSION,
    onlineAtSubmission: typeof navigator !== "undefined" ? navigator.onLine : true,
    openDefectIds: activeDuty?.vehicle?.knownDefects?.length ? ["known-defects"] : [],
  };
}

export async function resolveIncidentLocationLabel(): Promise<string> {
  if (typeof navigator !== "undefined" && "geolocation" in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 60_000 });
      });
      return `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
    } catch {
      // Fall through to duty stop or placeholder.
    }
  }
  return "Current location from device GPS";
}
