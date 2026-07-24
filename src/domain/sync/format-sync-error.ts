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
    if (parsed.message) return parsed.message;
  } catch {
    /* not JSON */
  }

  if (trimmed.includes("API route not found")) {
    return "Yard sync is not available on the live server yet. Deploy the latest command-api, then retry failed updates.";
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
