/** Turn raw API / fetch errors into operational copy for the sync queue. */
export function formatSyncError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Update could not reach the server.";

  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string;
      code?: string;
      statusCode?: number;
    };
    if (
      parsed.code === "not_found" &&
      (parsed.message?.includes("API route not found") || parsed.statusCode === 404)
    ) {
      return "Yard sync is not available on the live server yet. Deploy the latest command-api, then retry failed updates.";
    }
    if (parsed.code === "mutation_not_supported" && parsed.message?.includes("inspection.")) {
      return "Body inspection sync is not on the live server yet. Apply migration 202607250001_body_condition_inspection.sql and deploy command-api from the Admin repo, then tap Retry failed.";
    }
    if (parsed.code === "mutation_not_supported" && parsed.message?.includes("damage.")) {
      return "Damage sync is not on the live server yet. Deploy the latest command-api, then tap Retry failed.";
    }
    if (parsed.message) return parsed.message;
  } catch {
    /* not JSON */
  }

  if (trimmed.includes("API route not found")) {
    return "Yard sync is not available on the live server yet. Deploy the latest command-api, then retry failed updates.";
  }

  if (trimmed.includes("Yard mutation not supported: inspection.")) {
    return "Body inspection sync is not on the live server yet. Apply migration 202607250001_body_condition_inspection.sql and deploy command-api from the Admin repo, then tap Retry failed.";
  }

  if (trimmed.includes("Inspection not found")) {
    return "Body inspection not on server yet — wait for the inspection start to sync, then retry failed updates.";
  }

  return trimmed;
}

/** True when failures are caused by a missing backend route (not bad payload data). */
export function isMissingSyncRouteError(raw: string | undefined): boolean {
  if (!raw) return false;
  return formatSyncError(raw).includes("not available on the live server");
}

/** True when body-condition handlers are not deployed on Command yet. */
export function isBodyConditionDeployError(raw: string | undefined): boolean {
  if (!raw) return false;
  const formatted = formatSyncError(raw);
  return formatted.includes("Body inspection sync is not on the live server");
}
