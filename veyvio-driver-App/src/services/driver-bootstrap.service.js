import { getSupabaseClient } from "@/lib/supabase/client";
import { commandDriverBootstrap } from "@/lib/command-api";

/** Fresh enough to skip a remount refetch when switching tabs. */
const BOOTSTRAP_TTL_MS = 45_000;

/** @type {{ at: number, depotId: string | null, result: { ok: true, bootstrap: unknown } } | null} */
let cached = null;
/** @type {Promise<{ ok: boolean, bootstrap?: unknown, message?: string, status?: number }> | null} */
let inflight = null;

/**
 * Seed cache after auth/session already paid for a bootstrap round-trip.
 * @param {unknown} bootstrap
 * @param {string | null} [depotId]
 */
export function seedDriverBootstrapCache(bootstrap, depotId = null) {
  if (!bootstrap) return;
  cached = {
    at: Date.now(),
    depotId: depotId ?? null,
    result: { ok: true, bootstrap },
  };
}

export function invalidateDriverBootstrapCache() {
  cached = null;
  inflight = null;
}

/**
 * Load Command offline bootstrap for the signed-in driver.
 * Concurrent callers share one in-flight request; successful responses are cached briefly.
 * @param {{ depotId?: string | null, force?: boolean }} [opts]
 */
export async function loadDriverBootstrap(opts = {}) {
  const depotId = opts.depotId ?? null;
  const force = Boolean(opts.force);

  if (!force && cached?.result?.ok && Date.now() - cached.at < BOOTSTRAP_TTL_MS) {
    return cached.result;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { ok: false, message: "Not signed in." };
    }

    const result = await commandDriverBootstrap(session.access_token, depotId);
    if (result?.ok && result.bootstrap) {
      cached = {
        at: Date.now(),
        depotId,
        result: { ok: true, bootstrap: result.bootstrap },
      };
    }
    return result;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Map bootstrap homeSummary → shape DriverShiftHero / home can use. */
export function dutyStateFromHomeSummary(homeSummary) {
  if (!homeSummary) return null;

  const duty = homeSummary.duty ?? {};
  const vehicle = homeSummary.vehicleAssignment;
  const status = String(duty.status ?? "off_duty");
  const operationalState = String(homeSummary.operationalState ?? "");
  const onDuty =
    status === "on_duty" ||
    operationalState === "on_duty" ||
    Boolean(duty.signOnAt && !duty.signOffAt);
  const shiftEnded =
    operationalState === "duty_complete" || Boolean(duty.signOffAt);

  return {
    isSignedOn: onDuty && !shiftEnded,
    isShiftEnded: shiftEnded,
    shift:
      onDuty || shiftEnded
        ? {
            signOnAt: duty.signOnAt ?? null,
            signOffAt: duty.signOffAt ?? null,
          }
        : null,
    primaryVehicle: vehicle?.registration
      ? { registration: vehicle.registration, id: vehicle.vehicleId }
      : null,
    scheduledStart: duty.scheduledStart ?? null,
    scheduledStartLabel: duty.scheduledStartLabel ?? duty.scheduledStart ?? null,
    nextTrip: homeSummary.nextTrip ?? null,
    operationalState: homeSummary.operationalState ?? null,
    dutyId: duty.dutyId ?? null,
    source: "command",
  };
}

/** Prefer Command duty sign-on over legacy Ridova shift rows. */
export function mergeDutyState(commandDutyState, legacyDutyState) {
  if (commandDutyState?.isSignedOn || commandDutyState?.isShiftEnded) {
    return {
      ...(legacyDutyState ?? {}),
      ...commandDutyState,
      primaryVehicle: commandDutyState.primaryVehicle ?? legacyDutyState?.primaryVehicle ?? null,
      scheduledStart: commandDutyState.scheduledStart ?? legacyDutyState?.scheduledStart ?? null,
      scheduledStartLabel:
        commandDutyState.scheduledStartLabel ?? legacyDutyState?.scheduledStartLabel ?? null,
      nextTrip: commandDutyState.nextTrip ?? legacyDutyState?.nextTrip ?? null,
      shift: {
        signOnAt:
          commandDutyState.shift?.signOnAt ?? legacyDutyState?.shift?.signOnAt ?? null,
        signOffAt:
          commandDutyState.shift?.signOffAt ?? legacyDutyState?.shift?.signOffAt ?? null,
      },
    };
  }
  if (legacyDutyState?.isSignedOn || legacyDutyState?.isShiftEnded) {
    return legacyDutyState;
  }
  return commandDutyState ?? legacyDutyState ?? null;
}

/** Fallback when homeSummary lags — read sign-on from published duties. */
export function dutyStateFromBootstrapDuties(bootstrap) {
  const duties = Array.isArray(bootstrap?.duties) ? bootstrap.duties : [];
  const duty =
    duties.find((row) => row?.actualSignOnAt && !row?.actualSignOffAt) ??
    duties.find((row) => String(row?.lifecycleStatus ?? "") === "in_progress") ??
    duties[0] ??
    null;
  if (!duty) return null;

  const signedOff = Boolean(duty.actualSignOffAt) || duty.lifecycleStatus === "completed";
  const signedOn =
    !signedOff &&
    (Boolean(duty.actualSignOnAt) ||
      duty.lifecycleStatus === "in_progress" ||
      duty.status === "signed_on");
  const vehicle = duty.vehicle;

  return {
    isSignedOn: signedOn,
    isShiftEnded: signedOff,
    shift:
      signedOn || signedOff
        ? {
            signOnAt: duty.actualSignOnAt ?? null,
            signOffAt: duty.actualSignOffAt ?? null,
          }
        : null,
    primaryVehicle: vehicle?.registrationNumber
      ? {
          registration: vehicle.registrationNumber,
          id: vehicle.id ?? null,
        }
      : null,
    scheduledStart: duty.startTime ?? null,
    scheduledStartLabel: duty.startTime ?? null,
    nextTrip: duty.routeName
      ? { name: duty.routeName, startTime: duty.startTime ?? null }
      : null,
    operationalState: signedOff ? "duty_complete" : signedOn ? "on_duty" : null,
    dutyId: duty.id ?? null,
    source: "command",
  };
}

/** Same source as the Home "Next duty" card — keeps My duty in sync with that row. */
export function dutyStateFromTripsSchedule(bootstrap) {
  const trip = bootstrap?.legacy?.tripsSchedule?.today?.[0];
  if (!trip) return null;

  const label = String(trip.primaryActionLabel ?? "");
  const signedOn = label === "On duty" || String(trip.status) === "in_progress";
  const reg = trip.vehicleRegistration ?? null;

  return {
    isSignedOn: signedOn,
    isShiftEnded: false,
    shift: signedOn
      ? {
          // Sign-on time may only exist on duties/homeSummary; keep null so timer can fill later.
          signOnAt: null,
          signOffAt: null,
        }
      : null,
    primaryVehicle: reg ? { registration: reg, id: null } : null,
    scheduledStart: trip.scheduledStart ?? null,
    scheduledStartLabel: trip.scheduledStart ?? null,
    nextTrip: {
      name: trip.runName || trip.reference || "Duty",
      startTime: trip.scheduledStart ?? null,
    },
    operationalState: signedOn ? "on_duty" : null,
    dutyId: trip.dutyId ?? trip.id ?? null,
    source: "command",
  };
}

/** Command-first duty projection used by Home. */
export function commandDutyStateFromBootstrap(bootstrap, homeSummary) {
  return mergeDutyState(
    mergeDutyState(
      dutyStateFromBootstrapDuties(bootstrap),
      dutyStateFromHomeSummary(homeSummary),
    ),
    dutyStateFromTripsSchedule(bootstrap),
  );
}

export function walkaroundSafetyFromHomeSummary(homeSummary) {
  const vehicle = homeSummary?.vehicleAssignment;
  if (!vehicle?.registration) return null;

  const checkRequired = vehicle.checkStatus === "required" || vehicle.checkStatus === "due";
  return {
    registration: vehicle.registration,
    checkRequired,
    checkComplete: vehicle.checkStatus === "complete" || vehicle.checkStatus === "passed",
    vehicleBlocked: vehicle.roadworthinessStatus === "vor",
    vehicleId: vehicle.vehicleId,
  };
}
