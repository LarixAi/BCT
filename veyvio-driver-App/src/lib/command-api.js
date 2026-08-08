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

async function readApiFailure(response, fallback) {
  try {
    const body = await response.json();
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message ?? body.error ?? fallback;
    return {
      status: response.status,
      code: body.code ?? body.errorCode ?? null,
      message,
    };
  } catch {
    return { status: response.status, code: null, message: fallback };
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

export async function commandGetDriverVehicleReadiness(accessToken, vehicleId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const qs = `?vehicleId=${encodeURIComponent(vehicleId)}`;
  const response = await fetch(`${base}/driver/vehicle-readiness${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Vehicle readiness could not be loaded.") };
  }

  return { ok: true, readiness: await response.json() };
}

export async function commandGetDriverVehicleTimeline(accessToken, vehicleId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const qs = `?vehicleId=${encodeURIComponent(vehicleId)}`;
  const response = await fetch(`${base}/driver/vehicle-timeline${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Vehicle timeline could not be loaded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandGetDriverAdBlueRecords(accessToken, vehicleId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const qs = `?vehicleId=${encodeURIComponent(vehicleId)}`;
  const response = await fetch(`${base}/driver/adblue-records${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "AdBlue history could not be loaded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandPostDriverAdBlueRefill(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/adblue-refill`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "AdBlue refill could not be recorded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandPostDriverFuelRefill(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/fuel-refill`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Fuel refill could not be recorded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandStartJourney(accessToken, journeyId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/journeys/${encodeURIComponent(journeyId)}/start`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Journey could not be started.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandCompleteJourney(accessToken, journeyId, input = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/journeys/${encodeURIComponent(journeyId)}/complete`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Journey could not be completed.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandArriveJourneyStop(accessToken, journeyId, input = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(
    `${base}/driver/journeys/${encodeURIComponent(journeyId)}/stops/arrive`,
    {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Stop arrive could not be recorded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandCompleteJourneyStop(accessToken, journeyId, input = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(
    `${base}/driver/journeys/${encodeURIComponent(journeyId)}/stops/complete`,
    {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Stop complete could not be recorded.") };
  }

  return { ok: true, ...(await response.json()) };
}

/** F-13 — tenant-scoped signed URL via Command (preferred over direct Supabase storage). */
export async function commandCreateSignedUrl(accessToken, { bucket, storageKey, expiresInSeconds = 3600 }) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/storage/signed-url`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({ bucket, storageKey, expiresInSeconds }),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Signed URL could not be created.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandPostDriverVehicleEquipment(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/vehicle-equipment`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Equipment check could not be saved.") };
  }

  return { ok: true, ...(await response.json()) };
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

export async function commandDriverOnboardingProgress(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/onboarding/progress`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Onboarding progress could not be loaded.") };
  }

  return { ok: true, progress: await response.json() };
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

export async function commandListJourneySequenceAcknowledgements(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured.", acknowledgements: [] };

  const response = await fetch(`${base}/driver/journey-sequence-acknowledgements`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return {
      ok: false,
      message: await readError(response, "Journey sequence acknowledgements could not be loaded."),
      acknowledgements: [],
    };
  }

  const payload = await response.json();
  return { ok: true, acknowledgements: Array.isArray(payload?.acknowledgements) ? payload.acknowledgements : [] };
}

export async function commandAdvanceJourneySequenceAcknowledgement(
  accessToken,
  tripKey,
  { status, declineReason } = {},
) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(
    `${base}/driver/journey-sequence-acknowledgements/${encodeURIComponent(tripKey)}/advance`,
    {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: JSON.stringify({
        status,
        ...(declineReason ? { declineReason } : {}),
      }),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      message: await readError(response, "Journey sequence acknowledgement could not be updated."),
    };
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
    const failure = await readApiFailure(response, "Could not sign on for this duty.");
    return {
      ok: false,
      ...failure,
      blocked: failure.code === "dispatch_blocked" || response.status === 403,
    };
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

export async function commandPostDriverVehicleParked(accessToken, input = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/vehicle-parked`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Parking location could not be recorded.") };
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
    const failure = await readApiFailure(response, "Could not sign off this duty.");
    return {
      ok: false,
      ...failure,
      blocked: failure.code === "dispatch_blocked" || response.status === 403,
    };
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
    const failure = await readApiFailure(response, "Defect could not be reported.");
    return { ok: false, ...failure };
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
    const failure = await readApiFailure(response, "Incident could not be reported.");
    return { ok: false, ...failure };
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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function commandSubmitDocument(accessToken, input, fileOrPrepared) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const anon = getSupabaseAnonKey();
  let response;

  const prepared =
    fileOrPrepared?.body instanceof ArrayBuffer
      ? {
          body: fileOrPrepared.body,
          contentType: fileOrPrepared.contentType ?? "image/jpeg",
          uploadName: input.fileName ?? fileOrPrepared.fileName ?? "document.jpg",
        }
      : null;

  if ((prepared || fileOrPrepared) && typeof FormData !== "undefined") {
    const form = new FormData();
    const uploadName = prepared?.uploadName ?? input.fileName ?? fileOrPrepared?.name ?? "document.jpg";
    if (prepared?.body) {
      form.append("file", new Blob([prepared.body], { type: prepared.contentType }), uploadName);
    } else {
      form.append("file", fileOrPrepared, uploadName);
    }
    form.append("requirementType", input.requirementType ?? input.documentType ?? "");
    form.append("documentType", input.documentType ?? input.requirementType ?? "");
    if (input.label) form.append("label", input.label);
    if (input.expiryDate) form.append("expiryDate", input.expiryDate);
    if (input.referenceNumber) form.append("referenceNumber", input.referenceNumber);
    if (input.notes) form.append("notes", input.notes);

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    if (anon) headers.apikey = anon;

    response = await fetch(`${base}/driver/documents`, {
      method: "POST",
      credentials: "omit",
      headers,
      body: form,
    });
  } else {
    response = await fetch(`${base}/driver/documents`, {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: JSON.stringify(input),
    });
  }

  if (!response.ok && prepared?.body) {
    const message = await readError(response, "Document could not be submitted.");
    const retry = await fetch(`${base}/driver/documents`, {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: JSON.stringify({
        ...input,
        fileName: prepared.uploadName,
        mimeType: prepared.contentType,
        fileBase64: arrayBufferToBase64(prepared.body),
      }),
    });
    if (retry.ok) {
      return { ok: true, document: await retry.json() };
    }
    return { ok: false, message: message || (await readError(retry, "Document could not be submitted.")) };
  }

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

export async function commandUpdateDriverProfile(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/profile`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Your profile could not be saved.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandUpdateDriverContact(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/onboarding/contact`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Your address could not be saved.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandUpdateDriverOnboardingStep(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/onboarding/step`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "This step could not be saved.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandSubmitDriverOnboarding(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/onboarding/submit`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Your onboarding could not be submitted.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandUpsertDriverDevice(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/devices`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: response.status === 403 ? "device_revoked" : undefined,
      message: await readError(response, "Trusted device could not be updated."),
    };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandGetDriverDeviceStatus(accessToken, deviceKey) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const qs = `?deviceKey=${encodeURIComponent(deviceKey)}`;
  const response = await fetch(`${base}/driver/devices/status${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Device security status could not be loaded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandPostDriverSecurityEvent(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/security-events`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Security event could not be recorded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandListDriverTraining(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/training`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Training could not be loaded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandUpdateDriverTrainingProgress(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/training/progress`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Training progress could not be saved.") };
  }

  return { ok: true, assignment: await response.json() };
}

export async function commandGetDriverHolidayBalance(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/holiday/balance`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Holiday balance could not be loaded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandListDriverHolidayRequests(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/holiday/requests`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Time-off requests could not be loaded.") };
  }

  return { ok: true, ...(await response.json()) };
}

export async function commandSubmitDriverHolidayRequest(accessToken, payload) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/holiday/requests`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Time-off request could not be submitted.") };
  }

  return { ok: true, ...(await response.json()) };
}

function mapCommandNotification(row) {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? "Notification"),
    message: row.body != null ? String(row.body) : row.message != null ? String(row.message) : "",
    body: row.body != null ? String(row.body) : row.message != null ? String(row.message) : "",
    severity: String(row.severity ?? "info"),
    status: String(row.status ?? (row.readAt ? "read" : "unread")),
    created_at: String(row.createdAt ?? row.created_at ?? ""),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    read_at: row.readAt != null ? String(row.readAt) : row.read_at != null ? String(row.read_at) : null,
    readAt: row.readAt != null ? String(row.readAt) : row.read_at != null ? String(row.read_at) : null,
    notification_type: String(row.notificationType ?? row.notification_type ?? "system"),
    notificationType: String(row.notificationType ?? row.notification_type ?? "system"),
    action_url: row.actionUrl != null ? String(row.actionUrl) : row.action_url != null ? String(row.action_url) : null,
    actionUrl: row.actionUrl != null ? String(row.actionUrl) : row.action_url != null ? String(row.action_url) : null,
    entity_type: row.sourceEntityType != null ? String(row.sourceEntityType) : null,
    entity_id: row.sourceEntityId != null ? String(row.sourceEntityId) : null,
  };
}

export async function commandListNotifications(accessToken, { unreadOnly = false } = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const qs = unreadOnly ? "?unread_only=true" : "";
  const response = await fetch(`${base}/notifications${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Notifications could not be loaded.") };
  }

  const rows = await response.json();
  return {
    ok: true,
    notifications: (Array.isArray(rows) ? rows : []).map(mapCommandNotification),
  };
}

export async function commandNotificationUnreadCount(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/notifications/unread-count`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Unread count could not be loaded.") };
  }

  const body = await response.json();
  return { ok: true, count: Number(body?.count ?? 0) };
}

export async function commandMarkNotificationRead(accessToken, notificationId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  let response = await fetch(`${base}/notifications/${notificationId}/read`, {
    method: "PATCH",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: "{}",
  });

  if (!response.ok) {
    response = await fetch(`${base}/notifications/${notificationId}/read`, {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: "{}",
    });
  }

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Notification could not be marked read.") };
  }

  return { ok: true, ...(await response.json().catch(() => ({}))) };
}

export async function commandMarkAllNotificationsRead(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  let response = await fetch(`${base}/notifications/read-all`, {
    method: "PATCH",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: "{}",
  });

  if (!response.ok) {
    response = await fetch(`${base}/notifications/read-all`, {
      method: "POST",
      credentials: "omit",
      headers: bearerHeaders(accessToken),
      body: "{}",
    });
  }

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Notifications could not be marked read.") };
  }

  return { ok: true, ...(await response.json().catch(() => ({}))) };
}

export async function commandCreateVehicleSwapRequest(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/vehicle-swap-requests`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Swap request could not be sent.") };
  }

  return { ok: true, request: await response.json() };
}

export async function commandListDriverVehicleSwapRequests(accessToken) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/vehicle-swap-requests`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Swap requests could not be loaded.") };
  }

  return { ok: true, requests: await response.json() };
}

export async function commandSubmitDutyCloseout(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/duty-closeout`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Duty closeout could not be saved.") };
  }

  return { ok: true, closeout: await response.json() };
}

export async function commandGetDutyCloseout(accessToken, { dutyId, jobId } = {}) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const params = new URLSearchParams();
  if (dutyId) params.set("dutyId", dutyId);
  if (jobId) params.set("jobId", jobId);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${base}/driver/duty-closeout${qs}`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (response.status === 404) return { ok: true, closeout: null };
  if (!response.ok) {
    return { ok: false, message: await readError(response, "Closeout could not be loaded.") };
  }

  return { ok: true, closeout: await response.json() };
}

export async function commandRecordJobExecution(accessToken, input) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/jobs/execution`, {
    method: "POST",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Job step could not be recorded on Command.") };
  }

  return { ok: true, event: await response.json() };
}

export async function commandGetJobExecution(accessToken, jobId) {
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL is not configured." };

  const response = await fetch(`${base}/driver/jobs/${encodeURIComponent(jobId)}/execution`, {
    method: "GET",
    credentials: "omit",
    headers: bearerHeaders(accessToken),
  });

  if (!response.ok) {
    return { ok: false, message: await readError(response, "Job execution could not be loaded.") };
  }

  return { ok: true, snapshot: await response.json() };
}
