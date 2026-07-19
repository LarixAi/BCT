/**
 * TfL Dispatch Compliance Validator
 * Run before every job offer is sent to a driver.
 * Returns { ok: boolean, blockers: string[], warnings: string[] }
 */
export function validateDispatchCompliance(driver, vehicle) {
  const blockers = [];
  const warnings = [];
  const today = new Date().toISOString().split("T")[0];

  // ── DRIVER CHECKS ────────────────────────────────────────────────────────────

  // PHV licence
  if (!driver.phv_licence_number) {
    blockers.push("Driver has no PHV licence number recorded.");
  } else if (!driver.phv_licence_verified) {
    blockers.push("Driver's PHV licence has not been verified by compliance.");
  } else if (driver.phv_licence_expiry && driver.phv_licence_expiry < today) {
    blockers.push(`Driver's PHV licence expired on ${driver.phv_licence_expiry}.`);
  } else if (driver.phv_licence_expiry) {
    const daysLeft = Math.ceil((new Date(driver.phv_licence_expiry) - new Date()) / 86400000);
    if (daysLeft <= 30) warnings.push(`Driver PHV licence expires in ${daysLeft} day(s).`);
  }

  // Driving licence
  if (driver.driving_licence_expiry && driver.driving_licence_expiry < today) {
    blockers.push(`Driver's driving licence expired on ${driver.driving_licence_expiry}.`);
  }

  // Right to work
  if (!driver.right_to_work_verified) {
    blockers.push("Driver's right to work has not been verified.");
  }

  // Driver status
  if (driver.status === "suspended") {
    blockers.push("Driver is suspended and cannot receive job offers.");
  }
  if (driver.status === "inactive") {
    blockers.push("Driver is inactive.");
  }
  if (driver.status === "pending_verification") {
    blockers.push("Driver is pending verification and cannot be dispatched.");
  }

  // Daily safety check
  const todayStr = new Date().toISOString().split("T")[0];
  if (!driver.daily_check_completed_today || driver.daily_check_date !== todayStr) {
    blockers.push("Driver has not completed today's vehicle safety check.");
  }

  // ── VEHICLE CHECKS ───────────────────────────────────────────────────────────

  // Vehicle PHV licence
  if (!vehicle.phv_licence_number) {
    blockers.push("Vehicle has no PHV licence number recorded.");
  } else if (!vehicle.phv_licence_verified) {
    blockers.push("Vehicle's PHV licence has not been verified.");
  } else if (vehicle.phv_licence_expiry && vehicle.phv_licence_expiry < today) {
    blockers.push(`Vehicle PHV licence expired on ${vehicle.phv_licence_expiry}.`);
  } else if (vehicle.phv_licence_expiry) {
    const daysLeft = Math.ceil((new Date(vehicle.phv_licence_expiry) - new Date()) / 86400000);
    if (daysLeft <= 30) warnings.push(`Vehicle PHV licence expires in ${daysLeft} day(s).`);
  }

  // MOT
  if (!vehicle.mot_expiry) {
    blockers.push("Vehicle has no MOT expiry recorded.");
  } else if (vehicle.mot_expiry < today) {
    blockers.push(`Vehicle MOT expired on ${vehicle.mot_expiry}.`);
  } else {
    const daysLeft = Math.ceil((new Date(vehicle.mot_expiry) - new Date()) / 86400000);
    if (daysLeft <= 30) warnings.push(`Vehicle MOT expires in ${daysLeft} day(s).`);
  }

  // Insurance
  if (!vehicle.insurance_expiry) {
    blockers.push("Vehicle has no insurance expiry recorded.");
  } else if (vehicle.insurance_expiry < today) {
    blockers.push(`Vehicle insurance expired on ${vehicle.insurance_expiry}.`);
  } else if (!vehicle.insurance_verified) {
    blockers.push("Vehicle insurance has not been verified.");
  } else {
    const daysLeft = Math.ceil((new Date(vehicle.insurance_expiry) - new Date()) / 86400000);
    if (daysLeft <= 14) warnings.push(`Vehicle insurance expires in ${daysLeft} day(s).`);
  }

  // Vehicle status
  if (vehicle.status === "suspended" || vehicle.status === "off_road") {
    blockers.push(`Vehicle is ${vehicle.status} and cannot be dispatched.`);
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  };
}