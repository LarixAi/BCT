import type { IncomingMessage, ServerResponse } from "node:http";
import { demoErrorStatus, processDemoSubmission, validateSubmission } from "./demo-handler";
import { createFileLeadStore } from "./demo-leads-store";

const leadStore = createFileLeadStore();

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function nodeEnv() {
  return {
    ENVIRONMENT: process.env.ENVIRONMENT ?? process.env.NODE_ENV,
    CRM_PROVIDER: process.env.CRM_PROVIDER ?? process.env.VITE_CRM_PROVIDER,
    HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? process.env.VITE_EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    DEMO_FROM_EMAIL: process.env.DEMO_FROM_EMAIL,
    DEMO_NOTIFY_EMAIL: process.env.DEMO_NOTIFY_EMAIL,
    SALES_EMAIL: process.env.VITE_SALES_EMAIL,
    CALENDAR_BOOKING_URL:
      process.env.CALENDAR_BOOKING_URL ?? process.env.VITE_CALENDAR_BOOKING_URL,
  };
}

export async function handleDemoSubmission(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const payload = validateSubmission(await readJsonBody(req));
    const result = await processDemoSubmission(payload, nodeEnv(), leadStore);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed";
    res.statusCode = demoErrorStatus(message);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}
