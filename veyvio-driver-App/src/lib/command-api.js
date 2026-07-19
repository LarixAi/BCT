import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Base URL for Veyvio Command edge API (auth + driver session). */
export function getCommandApiBaseUrl() {
  const configured = import.meta.env.VITE_COMMAND_API_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const auth = import.meta.env.VITE_AUTH_API_BASE_URL?.replace(/\/$/, "");
  if (auth) return auth;
  const supabase = getSupabaseUrl()?.replace(/\/$/, "");
  if (supabase) return `${supabase}/functions/v1/command-api`;
  return null;
}

function publicHeaders() {
  const anon = getSupabaseAnonKey();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (anon) {
    headers.apikey = anon;
    headers.Authorization = `Bearer ${anon}`;
  }
  return headers;
}

function bearerHeaders(accessToken) {
  const anon = getSupabaseAnonKey();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (anon) headers.apikey = anon;
  return headers;
}

async function readError(response, fallback) {
  try {
    const body = await response.json();
    if (Array.isArray(body.message)) return body.message.join(", ");
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function commandLogin(email, password) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    credentials: "omit",
    headers: publicHeaders(),
    body: JSON.stringify({ email, password, rememberMe: true }),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Email or password is incorrect.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandSelectTenant(accessToken, refreshToken, companyId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/auth/select-tenant`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({ companyId, tenantId: companyId, refreshToken }),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "This company could not be selected.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandDriverBootstrap(accessToken, depotId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, status: 0, message: "Command API URL is not configured." };

  const qs = depotId ? `?depotId=${encodeURIComponent(depotId)}` : "";
  const response = await fetch(`${base}/driver/bootstrap${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    let message = "Driver data could not be loaded.";
    try {
      const body = await response.json();
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else message = body.message ?? body.error ?? message;
    } catch {
      /* keep fallback */
    }
    return { ok: false, status: response.status, message };
  }

  return { ok: true, bootstrap: await response.json() };
}

export async function commandDriverSession(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, status: 0, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/auth/driver-session`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    let message = "No Driver account is linked to this login.";
    let code = null;
    try {
      const body = await response.json();
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else message = body.message ?? body.error ?? message;
      code = body.code ?? body.error ?? null;
    } catch {
      /* keep fallback */
    }
    return { ok: false, status: response.status, code, message };
  }

  return { ok: true, session: await response.json() };
}

export async function commandAcknowledgeDuty(accessToken, dutyId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/duties/${encodeURIComponent(dutyId)}/acknowledge`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Duty could not be acknowledged.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandSignOnDuty(accessToken, dutyId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/duties/${encodeURIComponent(dutyId)}/sign-on`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Could not sign on for this duty.") };
  }

  return { ok: true, ...(await response.json()) };
}

/** Push live GPS to Command Live Operations (duty_live_positions). */
export async function commandPostDriverLocation(accessToken, input = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/location`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({
      dutyId: input.dutyId ?? undefined,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters ?? undefined,
      heading: input.heading ?? undefined,
      speedMps: input.speedMps ?? undefined,
      recordedAt: input.recordedAt ?? undefined,
      vehicleId: input.vehicleId ?? undefined,
    }),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Location could not be sent to Command.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandSignOffDuty(accessToken, dutyId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/duties/${encodeURIComponent(dutyId)}/sign-off`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Could not sign off this duty.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandListDriverMessages(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/messages`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Messages could not be loaded.") };
  }

  return { ok: true, inbox: await response.json() };
}

export async function commandReplyDriverMessage(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/messages`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Reply could not be sent.") };
  }

  return { ok: true, message: await response.json() };
}

export async function commandStartDriverMessage(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/messages/start`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Message could not be sent.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandGetDriverMessageThread(accessToken, conversationId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(
    `${base}/driver/messages/${encodeURIComponent(conversationId)}`,
    {
      method: "GET",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
    },
  );

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Conversation could not be loaded.") };
  }

  const payload = await response.json();
  return { ok: true, thread: payload.thread, messages: payload.messages ?? [] };
}

export async function commandMarkDriverMessageRead(accessToken, conversationId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(
    `${base}/driver/messages/${encodeURIComponent(conversationId)}/read`,
    {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Could not mark message as read.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandReportDefect(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/defects`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Defect could not be reported.") };
  }

  return { ok: true, defect: await response.json() };
}

export async function commandReportIncident(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/incidents`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Incident could not be reported.") };
  }

  return { ok: true, incident: await response.json() };
}

export async function commandSubmitVehicleCheck(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/vehicle-checks`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Vehicle check could not be submitted.") };
  }

  return { ok: true, check: await response.json() };
}

export async function commandListDocuments(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/documents`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Documents could not be loaded.") };
  }

  return { ok: true, documents: await response.json() };
}

export async function commandSubmitDocument(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/documents`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Document could not be submitted.") };
  }

  return { ok: true, document: await response.json() };
}

export async function commandListVehicleChecks(accessToken, { today = true, limit = 40 } = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const params = new URLSearchParams();
  if (!today) params.set("today", "0");
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${base}/driver/vehicle-checks${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Vehicle checks could not be loaded.") };
  }

  return { ok: true, checks: await response.json() };
}
