import { getSupabaseClient } from "@/lib/supabase/client";

const SCHOOL_CONTRACT_TYPES = new Set(["school", "sen", "council_school_transport"]);

const DBS_REQUIREMENT_KEYS = new Set(["dbs", "dbs_safeguarding", "safeguarding", "safeguarding_certificate"]);

/**
 * Load requirement keys assigned to this driver (admin / Supabase source of truth).
 */
export async function loadDriverRequirementKeys(driverId) {
  const supabase = getSupabaseClient();

  const [{ data: driverRow }, { data: record }] = await Promise.all([
    supabase
      .from("drivers")
      .select("employment_type, work_permission_keys")
      .eq("id", driverId)
      .maybeSingle(),
    supabase
      .from("driver_onboarding_records")
      .select("requirement_set_id")
      .eq("driver_id", driverId)
      .maybeSingle(),
  ]);

  const keys = new Set();

  if (record?.requirement_set_id) {
    const { data: requirements } = await supabase
      .from("driver_onboarding_requirements")
      .select("requirement_key, required")
      .eq("requirement_set_id", record.requirement_set_id);

    for (const row of requirements ?? []) {
      if (row.required !== false) keys.add(row.requirement_key);
    }
  }

  const driver = driverRow
    ? { ...driverRow, can_do_school_runs: (driverRow.work_permission_keys ?? []).includes("school") }
    : driverRow;

  return {
    requirementKeys: [...keys],
    driver,
  };
}

export function requiresDbsCheck({ driver, requirementKeys = [] }) {
  if (!driver) return false;
  if (driver.can_do_school_runs) return true;
  if (requirementKeys.some((k) => DBS_REQUIREMENT_KEYS.has(k))) return true;
  const employment = String(driver.employment_type ?? "").toLowerCase();
  if (SCHOOL_CONTRACT_TYPES.has(employment)) return true;
  return false;
}

export async function getDriverOnboardingRequirements(driverId) {
  const { requirementKeys, driver } = await loadDriverRequirementKeys(driverId);
  return {
    requirementKeys,
    requiresDbs: requiresDbsCheck({ driver, requirementKeys }),
    requiresSafeguarding: requiresDbsCheck({ driver, requirementKeys }),
  };
}
