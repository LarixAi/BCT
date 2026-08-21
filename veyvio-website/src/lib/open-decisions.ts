/**
 * Homepage blueprint §21 — open decisions with recommended defaults.
 * Override via environment variables where noted; confirm with Legal/Commercial before production.
 */

export type DecisionStatus = "confirmed" | "provisional" | "blocked";

export const openDecisions = {
  legalCompanyName: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_LEGAL_COMPANY_NAME ?? "Veyvio Ltd",
    note: "Confirm registered legal name with Legal before footer and Organization schema go live.",
  },
  websiteLegalNotices: {
    status: "confirmed" as DecisionStatus,
    value: "founder-approved-2026-07-28",
    note: "Privacy, cookies, terms and vulnerability disclosure approved for publication on veyvio.co.uk. Company registered name remains provisional until Companies House confirmation. Solicitor review recommended for commercial contracts.",
  },
  productionDomain: {
    status: "confirmed" as DecisionStatus,
    value: import.meta.env.VITE_SITE_URL ?? "https://veyvio.co.uk",
  },
  salesEmail: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_SALES_EMAIL ?? "info@veyvio.co.uk",
    note: "Forwards to founder Gmail via Cloudflare Email Routing.",
  },
  supportEmail: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_SUPPORT_EMAIL ?? "support@veyvio.co.uk",
  },
  signInUrl: {
    status: "confirmed" as DecisionStatus,
    value: import.meta.env.VITE_SIGN_IN_URL ?? "https://veyvio-admin.pages.dev/login",
  },
  dataHostingRegion: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_DATA_HOSTING_REGION ?? "United Kingdom / European Union",
    note: "Engineering to confirm exact region before Trust Centre publication.",
  },
  crmProvider: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_CRM_PROVIDER ?? "hubspot",
    options: ["hubspot", "pipedrive", "stub"] as const,
  },
  emailProvider: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_EMAIL_PROVIDER ?? "resend",
    options: ["resend", "sendgrid", "stub"] as const,
  },
  consentProvider: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_CONSENT_PROVIDER ?? "cookiebot",
    note: "Analytics gated until consent platform is configured.",
  },
  calendarBookingUrl: {
    status: "provisional" as DecisionStatus,
    value: import.meta.env.VITE_CALENDAR_BOOKING_URL ?? "",
    note: "Cal.com or HubSpot meetings link — shown after successful demo submission when set.",
  },
  driverAppStoreAvailable: {
    status: "confirmed" as DecisionStatus,
    value: false,
    note: "No app-store badges until Gate 3 store launch (blueprint §21 #7).",
  },
} as const;

export const siteContact = {
  salesEmail: openDecisions.salesEmail.value,
  supportEmail: openDecisions.supportEmail.value,
  legalName: openDecisions.legalCompanyName.value,
  domain: openDecisions.productionDomain.value.replace(/\/$/, ""),
};
