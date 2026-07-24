import { getCommandAccessToken } from "@/lib/command-session";
import { getCommandApiBaseUrl } from "@/lib/command-api";

/**
 * Submit driver condition acknowledgement to Command API.
 */
export async function submitConditionAcknowledgement({
  vehicleId,
  driverId,
  acknowledgementType,
  statement,
  inspectionId,
  assignmentId,
  deviceId,
}) {
  const token = await getCommandAccessToken();
  if (!token) {
    return { ok: false, message: "Sign in required to record acknowledgement." };
  }

  const res = await fetch(`${getCommandApiBaseUrl()}/driver/condition-acknowledgements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      vehicleId,
      driverId,
      acknowledgementType,
      statement,
      inspectionId,
      assignmentId,
      deviceId,
      createProvisionalReport: ["condition_differs", "new_damage_found"].includes(acknowledgementType),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, message: err.message ?? "Could not record acknowledgement." };
  }

  const data = await res.json();
  return { ok: true, serverId: data.serverId };
}
