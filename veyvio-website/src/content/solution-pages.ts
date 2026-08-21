import type { TierOnePage } from "./tier-one-pages";

export const solutionPages: TierOnePage[] = [
  {
    path: "/solutions",
    title: "Solutions for connected transport operations",
    eyebrow: "Solutions",
    lead: "Address operational problems with connected workflows — not another disconnected tool.",
    sections: [
      {
        heading: "Choose your operational priority",
        body: "Each solution explains a problem Veyvio solves and which applications are involved. Solutions share one data model across Command, Driver, Yard and Maintenance.",
      },
    ],
    relatedLinks: [
      { label: "Transport operations", href: "/solutions/transport-operations" },
      { label: "Fleet safety and compliance", href: "/solutions/fleet-safety-compliance" },
      { label: "Vehicle readiness", href: "/solutions/vehicle-readiness" },
      { label: "Workforce readiness", href: "/solutions/workforce-readiness" },
      { label: "Multi-depot operations", href: "/solutions/multi-depot" },
      { label: "Accessible transport", href: "/solutions/accessible-transport" },
      { label: "Audit and evidence", href: "/solutions/audit-evidence" },
    ],
  },
  {
    path: "/solutions/transport-operations",
    title: "Transport operations",
    eyebrow: "Solution",
    lead: "Plan work, publish duties and manage live exceptions from one operational control centre.",
    sections: [
      { heading: "The problem", body: "Controllers chase updates across bookings, spreadsheets and phone calls when information is not connected to driver and vehicle status." },
      { heading: "How Veyvio helps", body: "Command connects bookings, duties, drivers and vehicle readiness so dispatch decisions use current operational truth." },
    ],
    cta: { label: "Explore Veyvio Command", href: "/platform/command" },
  },
  {
    path: "/solutions/fleet-safety-compliance",
    title: "Fleet safety and compliance",
    eyebrow: "Solution",
    lead: "Build safety checks, evidence and audit history into daily workflows.",
    sections: [
      { heading: "The problem", body: "Compliance evidence is scattered across paper, photos and separate systems — difficult to retrieve when it matters." },
      { heading: "How Veyvio helps", body: "Eligibility checks, vehicle readiness, defects and overrides stay connected to the duty and vehicle they relate to. Veyvio helps organisations manage compliance responsibilities — it does not guarantee legal compliance." },
    ],
    cta: { label: "Explore safety and compliance", href: "/trust" },
  },
  {
    path: "/solutions/vehicle-readiness",
    title: "Vehicle readiness",
    eyebrow: "Solution",
    lead: "Know whether a vehicle is truly ready for work before it is assigned.",
    classification: "pilot",
    claimIds: ["vehicle-readiness"],
    sections: [
      { heading: "The problem", body: "Readiness is asserted manually or discovered too late — after a vehicle is already assigned." },
      { heading: "How Veyvio helps", body: "Yard, maintenance and check evidence feed a readiness outcome calculated from configured rules — Ready, Warning, Restricted, Not ready or Unknown." },
    ],
    cta: { label: "Explore Veyvio Yard", href: "/platform/yard" },
  },
  {
    path: "/solutions/workforce-readiness",
    title: "Workforce readiness",
    eyebrow: "Solution",
    lead: "Confirm driver eligibility and role requirements before assignment.",
    sections: [
      { heading: "The problem", body: "Driver documents, training and expiries live in folders and spreadsheets disconnected from dispatch." },
      { heading: "How Veyvio helps", body: "Command checks eligibility against configured rules before duties are published, with audit history for overrides." },
    ],
    cta: { label: "Explore Veyvio Command", href: "/platform/command" },
  },
  {
    path: "/solutions/multi-depot",
    title: "Multi-depot operations",
    eyebrow: "Solution",
    lead: "Keep depots, permissions and resources separated within one licensed operator.",
    sections: [
      { heading: "The problem", body: "Multi-depot operators struggle when each site maintains its own spreadsheets and local workarounds." },
      { heading: "How Veyvio helps", body: "Company and depot boundaries scope vehicles, staff and permissions while leadership retains cross-depot visibility." },
    ],
    cta: { label: "Learn about tenant isolation", href: "/trust/tenant-isolation" },
  },
  {
    path: "/solutions/accessible-transport",
    title: "Accessible transport",
    eyebrow: "Solution",
    lead: "Support passenger-specific requirements through connected booking, duty and evidence workflows.",
    sections: [
      { heading: "The problem", body: "Passenger needs are recorded in one place but do not travel with the duty the driver receives." },
      { heading: "How Veyvio helps", body: "Requirements stay attached to bookings and duties with controlled access for safeguarding-sensitive information." },
    ],
    cta: { label: "Community transport", href: "/community-transport" },
  },
  {
    path: "/solutions/audit-evidence",
    title: "Audit and evidence",
    eyebrow: "Solution",
    lead: "Produce operational evidence that is easy to retrieve and hard to dispute.",
    sections: [
      { heading: "The problem", body: "Audit requests trigger days of document gathering because evidence was never connected to operational events." },
      { heading: "How Veyvio helps", body: "Checks, defects, incidents, maintenance and overrides retain history tied to company, person, vehicle and journey." },
    ],
    cta: { label: "Visit the Trust Centre", href: "/trust" },
  },
  {
    path: "/integrations",
    title: "Integrations",
    eyebrow: "Platform",
    lead: "Veyvio does not list integration partners publicly until they are contractually and technically confirmed (blueprint §10).",
    sections: [
      { heading: "Current public position", body: "No third-party integrations are advertised on this website at this stage. An internal integrations roadmap is maintained separately from public marketing." },
      { heading: "Discuss your requirements", body: "If your organisation depends on specific systems, tell us during a demonstration so we can assess fit and delivery timing honestly." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
];
