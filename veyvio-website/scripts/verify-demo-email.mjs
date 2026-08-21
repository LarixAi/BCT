#!/usr/bin/env node
/**
 * Probe production (or local) demo enquiry pipeline for Resend delivery honesty.
 *
 *   npm run verify:demo-email
 *   DEMO_API_URL=https://veyvio.co.uk/api/demo npm run verify:demo-email
 *
 * Does not invent Companies House names. Reports emailDelivered from the API.
 */
const API = (process.env.DEMO_API_URL || "https://veyvio.co.uk/api/demo").replace(/\/$/, "");

const payload = {
  name: "Veyvio Demo Probe",
  email: process.env.DEMO_PROBE_EMAIL || "demo-probe@veyvio.co.uk",
  organisation: "Veyvio Readiness Probe",
  serviceType: "community-transport",
  fleetSize: "1-10",
  consent: true,
  honeypot: "",
};

async function main() {
  console.log(`POST ${API}\n`);
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (!res.ok || body?.ok !== true) {
    console.error("\nFAIL: demo API did not accept the enquiry.");
    process.exit(1);
  }

  const delivered = body.emailDelivered === true;
  const explicitlyFalse = body.emailDelivered === false;
  const pendingMsg =
    /confirmation email pending/i.test(String(body.message ?? "")) ||
    /could not be sent/i.test(String(body.message ?? ""));
  const legacyOk =
    body.emailDelivered === undefined &&
    !pendingMsg &&
    /we will be in touch shortly/i.test(String(body.message ?? ""));

  console.log("\n--- Delivery honesty ---");
  console.log(`emailDelivered: ${body.emailDelivered === undefined ? "(field missing — redeploy website worker)" : body.emailDelivered}`);
  console.log(`message implies pending/failure: ${pendingMsg}`);
  if (delivered) {
    console.log(
      "PASS: Resend path reported delivery. Confirm inbox + Resend dashboard for the probe address.",
    );
  } else if (legacyOk) {
    console.log(
      "SOFT: Live API accepted enquiry with success copy but without emailDelivered. Redeploy veyvio-website so probes can prove Resend; check Resend logs for this reference.",
    );
  } else if (explicitlyFalse || pendingMsg) {
    console.log(
      "SOFT: Enquiry saved but confirmation email was not delivered. Check EMAIL_PROVIDER=resend, RESEND_API_KEY, and that DEMO_FROM_EMAIL uses a verified domain.",
    );
  } else {
    console.log("SOFT: Unable to confirm email delivery from response shape.");
  }
  console.log(
    "\nCompanies House: still operator-only — set VITE_LEGAL_COMPANY_NAME after registration is confirmed, then redeploy the website.",
  );

  // Non-zero only when API is broken; undelivered email is expected residual until Resend domain is verified.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
