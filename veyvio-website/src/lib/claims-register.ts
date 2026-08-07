/**
 * Homepage blueprint Part E — claims substantiation register.
 * Review at every content publish; only Approved classifications may appear publicly.
 */

export type ClaimClassification =
  | "available"
  | "pilot"
  | "in-development"
  | "planned"
  | "exploratory";

export type ClaimEntry = {
  id: string;
  claim: string;
  classification: ClaimClassification;
  evidence: string;
  owner: string;
  lastVerified?: string;
  /** When false, claim must not render on public pages */
  approvedForPublic: boolean;
};

export const claimsRegister: ClaimEntry[] = [
  {
    id: "positioning-headline",
    claim: "One connected platform for safer, clearer transport operations.",
    classification: "available",
    evidence: "Positioning statement — blueprint Part A.5 differentiation analysis",
    owner: "Product Marketing",
    approvedForPublic: true,
  },
  {
    id: "app-command",
    claim: "Veyvio Command — plan work, manage live operations and respond to exceptions.",
    classification: "pilot",
    evidence: "Gate 1 pilot — Admin dispatch and live operations",
    owner: "Product",
    approvedForPublic: true,
  },
  {
    id: "app-driver",
    claim: "Veyvio Driver — duties, checks, communication and end-of-shift handback.",
    classification: "pilot",
    evidence: "Gate 1 device exit tests — veyvio-driver-App",
    owner: "Product",
    approvedForPublic: true,
  },
  {
    id: "app-yard",
    claim: "Veyvio Yard — vehicle location, condition and readiness.",
    classification: "pilot",
    evidence: "Yard app operational workflows — repo root src/",
    owner: "Product",
    approvedForPublic: true,
  },
  {
    id: "app-maintenance",
    claim: "Veyvio Maintenance — defects, inspections, work orders and return to service.",
    classification: "in-development",
    evidence: "Admin maintenance control centre — partial implementation",
    owner: "Product",
    approvedForPublic: true,
  },
  {
    id: "app-portal",
    claim: "Customer Portal — controlled customer access to bookings and service information.",
    classification: "planned",
    evidence: "Combined Blueprint — not yet in pilot scope",
    owner: "Product",
    approvedForPublic: true,
  },
  {
    id: "vehicle-readiness",
    claim: "Readiness outputs: Ready, Warning, Restricted, Not ready, Unknown.",
    classification: "pilot",
    evidence: "Compliance engine + yard readiness gates",
    owner: "Engineering",
    approvedForPublic: true,
  },
  {
    id: "tenant-isolation",
    claim: "Each company's information is properly separated.",
    classification: "available",
    evidence: "RLS + company_id scoping — command-api, tenant isolation smoke tests",
    owner: "Security",
    approvedForPublic: true,
  },
  {
    id: "offline-operations",
    claim: "Driver and Yard offline queuing with visible sync state.",
    classification: "pilot",
    evidence: "Driver ops outbox + server revalidation on reconnect",
    owner: "Engineering",
    approvedForPublic: true,
  },
  {
    id: "compliance-guarantee",
    claim: "Veyvio makes your organisation legally compliant.",
    classification: "exploratory",
    evidence: "MUST NOT PUBLISH — blueprint §7 Section 5 wording rule",
    owner: "Legal",
    approvedForPublic: false,
  },
  {
    id: "app-store-badges",
    claim: "Download on App Store / Google Play.",
    classification: "planned",
    evidence: "Gate 3 store readiness — not yet live",
    owner: "Engineering",
    approvedForPublic: false,
  },
  {
    id: "customer-logos",
    claim: "Customer logos or testimonials.",
    classification: "exploratory",
    evidence: "None approved — use pilot programme section only",
    owner: "Marketing",
    approvedForPublic: false,
  },
];

export function getApprovedClaims() {
  return claimsRegister.filter((entry) => entry.approvedForPublic);
}

export function getClaim(id: string) {
  return claimsRegister.find((entry) => entry.id === id);
}

export function assertClaimApproved(id: string) {
  const claim = getClaim(id);
  return claim?.approvedForPublic === true;
}
