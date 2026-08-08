import { openDecisions } from "@/lib/open-decisions";

export type DemoSubmission = {
  name: string;
  email: string;
  organisation: string;
  serviceType: string;
  fleetSize: string;
  consent: boolean;
  honeypot?: string;
};

export type DemoSubmissionResult = {
  ok: boolean;
  reference: string;
  calendarUrl?: string;
  message: string;
  emailDelivered?: boolean;
  persisted?: boolean;
  crmStatus?: "ok" | "skipped_stub" | "error";
};

export async function submitDemoEnquiry(payload: DemoSubmission): Promise<DemoSubmissionResult> {
  const response = await fetch("/api/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as DemoSubmissionResult & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "Submission failed");
  }

  return data;
}

export function getCalendarBookingUrl() {
  const url = openDecisions.calendarBookingUrl.value;
  return url || undefined;
}
