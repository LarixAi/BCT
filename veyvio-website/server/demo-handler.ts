function newReferenceId() {
  return `VY-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export type DemoSubmission = {
  name: string;
  email: string;
  organisation: string;
  serviceType: string;
  fleetSize: string;
  consent: boolean;
  honeypot?: string;
};

export type LeadRecord = DemoSubmission & {
  reference: string;
  submittedAt: string;
  source: "veyvio-website-demo";
};

export type DemoEnv = {
  CRM_PROVIDER?: string;
  HUBSPOT_ACCESS_TOKEN?: string;
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  DEMO_FROM_EMAIL?: string;
  DEMO_NOTIFY_EMAIL?: string;
  SALES_EMAIL?: string;
  CALENDAR_BOOKING_URL?: string;
};

export type LeadStore = {
  save(lead: LeadRecord): Promise<{ persisted: true; reference: string }>;
};

export type DemoResult = {
  ok: true;
  reference: string;
  calendarUrl?: string;
  message: string;
  /** True only after durable persist succeeded. */
  persisted: true;
  /** True only when Resend accepted the confirmation send. Never true for stub / missing key / send failure. */
  emailDelivered: boolean;
  crmStatus: "ok" | "skipped_stub" | "error";
};

export function validateSubmission(input: unknown): DemoSubmission {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid submission");
  }
  const data = input as Record<string, unknown>;
  const name = String(data.name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const organisation = String(data.organisation ?? "").trim();
  const serviceType = String(data.serviceType ?? "").trim();
  const fleetSize = String(data.fleetSize ?? "").trim();
  const consent = data.consent === true;
  const honeypot = String(data.honeypot ?? "").trim();

  if (honeypot) throw new Error("Rejected");
  if (!name || !email || !organisation || !serviceType || !fleetSize) {
    throw new Error("All fields are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  if (!consent) {
    throw new Error("Consent is required to process this enquiry");
  }

  return { name, email, organisation, serviceType, fleetSize, consent };
}

export function buildCalendarUrl(baseUrl: string, lead: LeadRecord): string {
  if (!baseUrl) return "";
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("name", lead.name);
    url.searchParams.set("email", lead.email);
    if (!url.searchParams.has("notes")) {
      url.searchParams.set(
        "notes",
        `${lead.organisation} · ${lead.serviceType} · ${lead.fleetSize} fleet · ref ${lead.reference}`,
      );
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

async function createHubSpotLead(lead: LeadRecord, token: string) {
  const detail = `${lead.serviceType} · ${lead.fleetSize} fleet · ref ${lead.reference}`;
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email: lead.email,
        firstname: lead.name.split(" ")[0],
        lastname: lead.name.split(" ").slice(1).join(" ") || "Enquiry",
        company: lead.organisation,
        jobtitle: `Demo enquiry — ${detail}`,
        hs_lead_status: "NEW",
      },
    }),
  });

  if (response.status === 409) {
    console.warn("[demo-pipeline] HubSpot contact may already exist", lead.email);
    return;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CRM error: ${text}`);
  }
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  text: string,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email error: ${body}`);
  }
}

/**
 * Persist-first demo enquiry (F-03 / TD-025).
 * Stub CRM/email must never be the authority for success.
 */
export async function processDemoSubmission(
  payload: DemoSubmission,
  env: DemoEnv,
  store: LeadStore,
): Promise<DemoResult> {
  if (!store) {
    throw new Error("Lead store is not configured");
  }

  const lead: LeadRecord = {
    ...payload,
    reference: newReferenceId(),
    submittedAt: new Date().toISOString(),
    source: "veyvio-website-demo",
  };

  try {
    await store.save(lead);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[demo-pipeline] Persist failed", { reference: lead.reference, error: reason });
    throw new Error(`Enquiry could not be saved (${reason})`);
  }

  let crmStatus: DemoResult["crmStatus"] = "skipped_stub";
  const crmProvider = env.CRM_PROVIDER ?? "stub";
  if (crmProvider === "hubspot" && env.HUBSPOT_ACCESS_TOKEN) {
    try {
      await createHubSpotLead(lead, env.HUBSPOT_ACCESS_TOKEN);
      crmStatus = "ok";
    } catch (err) {
      crmStatus = "error";
      console.error("[demo-pipeline] CRM failed after persist", {
        reference: lead.reference,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    console.info("[demo-pipeline] CRM stub after persist", {
      reference: lead.reference,
      email: lead.email,
      organisation: lead.organisation,
    });
  }

  const emailProvider = env.EMAIL_PROVIDER ?? "stub";
  const from = env.DEMO_FROM_EMAIL ?? "Veyvio <onboarding@resend.dev>";
  let emailSent = false;
  let emailFailureReason: string | null = null;
  if (emailProvider === "resend" && env.RESEND_API_KEY) {
    try {
      await sendResendEmail(
        env.RESEND_API_KEY,
        from,
        [lead.email],
        "Your Veyvio demonstration enquiry",
        `Thank you, ${lead.name}.\n\nWe received your enquiry (reference ${lead.reference}). The Veyvio team will review your requirements and be in touch.\n\nOrganisation: ${lead.organisation}\nService type: ${lead.serviceType}\nFleet size: ${lead.fleetSize}`,
      );

      const notifyTo = env.DEMO_NOTIFY_EMAIL ?? env.SALES_EMAIL ?? "info@veyvio.co.uk";
      await sendResendEmail(
        env.RESEND_API_KEY,
        from,
        [notifyTo],
        `New Veyvio demo enquiry — ${lead.organisation}`,
        `Reference: ${lead.reference}\nName: ${lead.name}\nEmail: ${lead.email}\nOrganisation: ${lead.organisation}\nService: ${lead.serviceType}\nFleet: ${lead.fleetSize}`,
      );
      emailSent = true;
    } catch (err) {
      emailFailureReason = err instanceof Error ? err.message : String(err);
      console.error("[demo-pipeline] Email failed after persist", {
        reference: lead.reference,
        error: emailFailureReason,
      });
    }
  } else if (emailProvider === "resend" && !env.RESEND_API_KEY) {
    emailFailureReason = "RESEND_API_KEY not configured";
    console.info("[demo-pipeline] Email skipped — no RESEND_API_KEY", { reference: lead.reference });
  } else {
    console.info("[demo-pipeline] Email stub after persist", { reference: lead.reference, to: lead.email });
  }

  const calendarUrl = env.CALENDAR_BOOKING_URL
    ? buildCalendarUrl(env.CALENDAR_BOOKING_URL, lead)
    : undefined;

  const message = emailSent
    ? `Enquiry saved (reference ${lead.reference}). We will be in touch shortly.`
    : emailFailureReason
      ? `Enquiry saved (reference ${lead.reference}). Confirmation email could not be sent yet (${emailFailureReason}). Our team still has your details on file.`
      : `Enquiry saved (reference ${lead.reference}). Confirmation email is pending — your details are stored even if CRM/email integrations are not live.`;

  return {
    ok: true,
    reference: lead.reference,
    calendarUrl,
    message,
    persisted: true,
    emailDelivered: emailSent,
    crmStatus,
  };
}

export function demoErrorStatus(message: string): number {
  if (message === "Rejected") return 400;
  if (
    message.startsWith("All fields") ||
    message.startsWith("Enter a valid") ||
    message.startsWith("Consent") ||
    message.startsWith("Invalid")
  ) {
    return 400;
  }
  return 500;
}
