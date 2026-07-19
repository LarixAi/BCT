import { getSupabaseClient } from "@/lib/supabase/client";
import { hasCompletedVehicleCheckToday, listAssignableVehicles } from "@/services/vehicle-check.service";

export async function loadContractAssignedVehicles(driver) {
  const options = await listAssignableVehicles(driver);
  return options.filter((o) => !o.isOwnPcoVehicle);
}

export async function evaluateContractTransportReadiness(driver) {
  const blockers = [];
  const warnings = [];

  const assigned = await loadContractAssignedVehicles(driver);
  const fleetVehicle = assigned[0]?.vehicle ?? null;

  if (!driver.canDoSchoolRuns && !driver.canDoCoachWork && assigned.length === 0) {
    blockers.push("PHV route work is not enabled on your profile — contact your operator.");
  }

  if (!fleetVehicle) {
    blockers.push("No fleet vehicle assigned for today — check Jobs or contact dispatch.");
  }

  if (driver.canDoSchoolRuns && !driver.dbsExpiryDate) {
    blockers.push("DBS certificate expiry is required for school transport work.");
  }

  const checkDone = fleetVehicle
    ? await hasCompletedVehicleCheckToday(driver, { vehicleId: fleetVehicle.id })
    : await hasCompletedVehicleCheckToday(driver);

  if (!checkDone) {
    blockers.push("Complete today's walkaround on your assigned fleet vehicle.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    assignedVehicles: assigned,
    fleetVehicle,
    checkDone,
  };
}

export async function loadContractTransportSummary(driver) {
  const supabase = getSupabaseClient();

  const { data: jobs } = await supabase
    .from("driver_jobs_today")
    .select("job_id, route_name, service_date, vehicle_registration")
    .order("scheduled_start_at", { ascending: true });

  const { data: jobTypes } = await supabase
    .from("jobs")
    .select("id, job_type, customer_booking_id")
    .in("id", (jobs ?? []).map((j) => j.job_id).filter(Boolean));

  const typeById = new Map((jobTypes ?? []).map((j) => [j.id, j]));

  const contractJobs = (jobs ?? []).filter((row) => {
    const meta = typeById.get(row.job_id);
    if (!meta) return true;
    return meta.job_type !== "private_hire" && !meta.customer_booking_id;
  });

  return {
    todayJobCount: contractJobs.length,
    nextJob: contractJobs[0] ?? null,
    hasSchoolWork: Boolean(driver.canDoSchoolRuns),
    hasCoachWork: Boolean(driver.canDoCoachWork),
  };
}
