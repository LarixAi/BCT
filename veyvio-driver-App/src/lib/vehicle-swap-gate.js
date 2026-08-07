/**
 * Block unverified vehicle swaps while signed on to an active duty.
 * Ops must reassign on Command before the driver uses a different vehicle.
 */

function resolveActiveDuty(duties) {
  if (!Array.isArray(duties)) return null;
  return (
    duties.find((duty) => duty?.actualSignOnAt && !duty?.actualSignOffAt) ??
    duties.find((duty) => String(duty?.lifecycleStatus ?? "") === "in_progress") ??
    null
  );
}

function dutyVehicleId(duty) {
  const vehicle = duty?.vehicle ?? {};
  return vehicle.id ?? vehicle.vehicleId ?? null;
}

function dutyVehicleRegistration(duty) {
  const vehicle = duty?.vehicle ?? {};
  return vehicle.registrationNumber ?? vehicle.registration ?? "your duty vehicle";
}

/**
 * @param {object|null} bootstrap Command bootstrap payload
 * @param {string} vehicleId Vehicle the driver wants to select
 */
export function validateVehicleSelection(bootstrap, vehicleId) {
  if (!vehicleId) return { ok: false, message: "Choose a vehicle first." };

  const active = resolveActiveDuty(bootstrap?.duties);
  if (!active) return { ok: true };

  const assignedId = dutyVehicleId(active);
  if (!assignedId) return { ok: true };
  if (String(assignedId) === String(vehicleId)) return { ok: true };

  return {
    ok: false,
    code: "mid_duty_vehicle_swap_blocked",
    message: `You are signed on to ${dutyVehicleRegistration(active)}. Contact dispatch before using a different vehicle.`,
    activeDutyId: String(active.id ?? active.dutyId ?? ""),
    assignedVehicleId: String(assignedId),
  };
}

export function getActiveDutyVehicleSummary(bootstrap) {
  const active = resolveActiveDuty(bootstrap?.duties);
  if (!active) return null;
  const id = dutyVehicleId(active);
  if (!id) return null;
  return {
    dutyId: String(active.id ?? active.dutyId ?? ""),
    vehicleId: String(id),
    registration: dutyVehicleRegistration(active),
    routeName: active.routeName ?? active.reference ?? "Active duty",
  };
}
