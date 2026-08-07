import type { ClaimClassification } from "@/lib/claims-register";
import { companyPages } from "./company-pages";
import { legalPages } from "./legal-pages";
import { resourceArticles, resourceHubLinks } from "./resource-articles";
import { resourceHubPages } from "./resource-hub-pages";
import { solutionPages } from "./solution-pages";

export type TierOnePage = {
  path: string;
  title: string;
  eyebrow?: string;
  lead: string;
  sections: { heading: string; body: string }[];
  cta?: { label: string; href: string };
  claimIds?: string[];
  classification?: ClaimClassification;
  relatedLinks?: { label: string; href: string }[];
};

export const tierOnePages: TierOnePage[] = [
  {
    path: "/platform",
    title: "One connected platform for passenger transport operations",
    eyebrow: "Platform",
    lead: "Veyvio brings Command, Driver, Yard, Maintenance and customer access together around a shared operational record.",
    sections: [
      {
        heading: "Role-specific applications",
        body: "Each team uses an interface designed for their work — controllers, drivers, yard staff, maintenance teams and customers — without duplicating data entry or losing context.",
      },
      {
        heading: "Shared operational truth",
        body: "Bookings, duties, vehicle readiness, defects and compliance evidence connect through one data model so decisions are made from current information, not reconciled spreadsheets.",
      },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/platform/command",
    title: "Veyvio Command",
    eyebrow: "Operational control centre",
    lead: "Plan work, manage live operations and respond to exceptions from one control centre.",
    classification: "pilot",
    claimIds: ["app-command"],
    sections: [
      { heading: "Dispatch and live operations", body: "See today's runs, trips and duties. Respond to delays, cancellations and vehicle changes without losing audit history." },
      { heading: "Bookings to duties", body: "Move from passenger requirements to published driver work with eligibility and readiness checks in the path." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/platform/driver",
    title: "Veyvio Driver",
    eyebrow: "Mobile-first frontline workflow",
    lead: "Give drivers a clear, guided workflow for duties, checks, communication and end-of-shift handback.",
    classification: "pilot",
    claimIds: ["app-driver"],
    sections: [
      { heading: "Duty guidance", body: "Drivers see assigned work, stops and changes with offline-tolerant sync when connectivity drops." },
      { heading: "Checks and evidence", body: "Walkaround checks, incidents and handback steps create a controlled record without paper chasers." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/platform/yard",
    title: "Veyvio Yard",
    eyebrow: "Depot and vehicle readiness",
    lead: "Know where vehicles are, what condition they are in and what work must happen next.",
    classification: "pilot",
    claimIds: ["app-yard"],
    sections: [
      { heading: "Yard visibility", body: "Track bays, movements, damage and equipment so controllers know what can move." },
      { heading: "Readiness before dispatch", body: "Vehicle readiness feeds dispatch decisions — not a separate spreadsheet updated at end of shift." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/platform/maintenance",
    title: "Veyvio Maintenance",
    eyebrow: "Defects to return-to-service",
    lead: "Connect defects, inspections, servicing, tyres, work orders and return-to-service decisions.",
    classification: "in-development",
    claimIds: ["app-maintenance"],
    sections: [
      { heading: "From defect to evidence", body: "Maintenance teams work from the same defect and inspection history yard and dispatch already see." },
      { heading: "Controlled return to service", body: "Return-to-service decisions stay separate from the person who recorded the defect — evidence before assumption." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/platform/customer-portal",
    title: "Customer Portal",
    eyebrow: "Controlled customer access",
    lead: "Give authorised customers controlled access to bookings, passengers, communication and service information.",
    classification: "planned",
    claimIds: ["app-portal"],
    sections: [
      { heading: "Commissioner and customer visibility", body: "Share the right level of service information without opening full operational systems." },
    ],
    cta: { label: "Discuss requirements", href: "/contact" },
  },
  {
    path: "/pricing",
    title: "Pricing tailored to your operation",
    eyebrow: "Pricing",
    lead: "Veyvio is licensed for the modules, depots and scale your organisation needs. List pricing is not published while packaging is finalised.",
    sections: [
      { heading: "What affects pricing", body: "Fleet size, depots, licensed applications (Command, Driver, Yard, Maintenance), implementation scope and support level." },
      { heading: "How to get a quote", body: "Book a demonstration so we can understand your services and recommend suitable modules — no obligation." },
      { heading: "Procurement information", body: "Pricing basis, data-hosting location and service description content on this page and in the Trust Centre are written to support UK public-sector procurement review, including potential G-Cloud listing in future." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/trust",
    title: "Trust Centre",
    eyebrow: "Security and data protection",
    lead: "How Veyvio protects operational and passenger information for licensed operators.",
    sections: [
      { heading: "Tenant isolation", body: "Each company's bookings, passengers, vehicles and compliance records are logically separated and access-controlled." },
      { heading: "Data hosting", body: "Hosting location and data-processing terms are documented for procurement review. Passenger data may include special-category information — safeguarding and mobility needs require controlled access and clear retention policies." },
      { heading: "Accessibility", body: "Veyvio maintains a published accessibility statement for this website and designs product workflows for WCAG-informed usability." },
    ],
    relatedLinks: [
      { label: "Security", href: "/trust/security" },
      { label: "Tenant isolation", href: "/trust/tenant-isolation" },
      { label: "Privacy notice", href: "/legal/privacy" },
      { label: "Accessibility statement", href: "/legal/accessibility-statement" },
    ],
    cta: { label: "Tenant isolation", href: "/trust/tenant-isolation" },
  },
  {
    path: "/trust/security",
    title: "Security",
    eyebrow: "Trust Centre",
    lead: "Security practices for a multi-tenant passenger transport platform.",
    sections: [
      { heading: "Access control", body: "Role-based access scoped by company and depot. Authentication for staff applications is separate from this public site." },
      { heading: "Operational logging", body: "Important actions create audit history tied to the person, vehicle and reason behind the change." },
    ],
  },
  {
    path: "/trust/tenant-isolation",
    title: "Tenant isolation",
    eyebrow: "Trust Centre",
    lead: "Each company's data is logically separated. One operator cannot see another company's bookings, passengers, vehicles or compliance records without an explicit, audited configuration.",
    claimIds: ["tenant-isolation"],
    sections: [
      { heading: "Company boundaries", body: "Every operational record is scoped to a company. Application permissions respect depot and role boundaries." },
      { heading: "Support access", body: "Controlled support access is logged — support tooling cannot browse customer data without appropriate authorisation." },
    ],
    cta: { label: "Contact for security review", href: "/contact" },
  },
  {
    path: "/implementation",
    title: "Implementation",
    eyebrow: "Getting started",
    lead: "Move from your current process without losing operational control.",
    sections: [
      { heading: "Discovery and mapping", body: "We map your services, responsibilities and risk controls before configuration begins." },
      { heading: "Pilot to launch", body: "Controlled pilot, acceptance and operational launch with training aligned to each role." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/pilot-programme",
    title: "Pilot programme",
    eyebrow: "Design partners",
    lead: "Work with Veyvio while the platform is shaped around real passenger transport operations.",
    sections: [
      { heading: "Who it is for", body: "Operators willing to run controlled pilots, provide feedback and accept that some modules are still maturing." },
      { heading: "What we ask", body: "Clear operational priorities, a named operational sponsor and honest feedback on what blocks daily use." },
    ],
    cta: { label: "Apply for pilot discussion", href: "/demo" },
  },
  {
    path: "/resources",
    title: "Resource Centre",
    eyebrow: "Resources",
    lead: "Practical guidance for safer transport operations.",
    sections: [
      { heading: "Guides", body: "Educational articles on checks, damage workflows, readiness, handback and audit evidence — written for operators, not search engines alone." },
    ],
  },
  {
    path: "/support",
    title: "Help Centre",
    eyebrow: "Support",
    lead: "Support for existing Veyvio customers.",
    sections: [
      { heading: "Customer sign-in", body: "Staff users should sign in through their organisation's Veyvio application, not this marketing site." },
    ],
    cta: { label: "Sign in", href: "/sign-in" },
  },
  {
    path: "/status",
    title: "System status",
    eyebrow: "Status",
    lead: "Operational status for Veyvio platform services.",
    sections: [
      { heading: "Status service", body: "A dedicated status page will link from here before public launch. This marketing site remains available independently of product deployments." },
    ],
  },
  {
    path: "/industries",
    title: "Industries",
    eyebrow: "Passenger transport",
    lead: "Designed for the realities of community transport, contracted services and professional passenger fleets.",
    sections: [
      { heading: "Find your sector", body: "Each industry page explains operational problems Veyvio is built to address — not just a renamed headline." },
    ],
  },
  {
    path: "/industries/community-transport",
    title: "Community Transport",
    eyebrow: "Industry",
    lead: "Connect bookings, passengers, volunteer or employed drivers, vehicles, compliance and community-service evidence.",
    sections: [
      { heading: "Limited resources, high governance expectations", body: "Replace paper and spreadsheets with connected workflows that produce evidence funders and authorities can review." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/industries/dial-a-ride",
    title: "Dial-a-Ride",
    eyebrow: "Industry",
    lead: "Coordinate demand-responsive journeys with live visibility and clear driver guidance.",
    sections: [
      { heading: "Dynamic operations", body: "Manage bookings, runs and exceptions without controllers chasing drivers for status updates." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/industries/home-to-school",
    title: "Home-to-School Transport",
    eyebrow: "Industry",
    lead: "Manage routes, children, guardians, escorts, term dates, changes and safeguarding-sensitive information.",
    sections: [
      { heading: "Safeguarding-aware operations", body: "Controlled access to passenger information with audit history for changes and incidents." },
    ],
    cta: { label: "Contact sales", href: "/contact" },
  },
  {
    path: "/industries/send-transport",
    title: "SEND Transport",
    eyebrow: "Industry",
    lead: "Support passenger-specific requirements with controlled evidence and role-based access.",
    sections: [
      { heading: "Passenger-specific needs", body: "Requirements travel with the booking and duty — not in a separate folder." },
    ],
    cta: { label: "Contact sales", href: "/contact" },
  },
  {
    path: "/industries/local-authorities",
    title: "Local Authorities",
    eyebrow: "Industry",
    lead: "Service visibility, contract performance, passenger safety and provider accountability.",
    sections: [
      { heading: "Procurement-ready information", body: "Trust Centre, data hosting and accessibility documentation support formal procurement review." },
    ],
    cta: { label: "Contact sales", href: "/contact" },
  },
  {
    path: "/industries/healthcare-transport",
    title: "NHS and Healthcare Transport",
    eyebrow: "Industry",
    lead: "Coordinate patient and healthcare journeys with clear operational records.",
    sections: [
      { heading: "Healthcare journeys", body: "Connect booking requirements to driver duties and vehicle readiness for time-sensitive transport." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/industries/charities",
    title: "Charities and Community Organisations",
    eyebrow: "Industry",
    lead: "Run accessible services with limited staff and strong governance evidence.",
    sections: [
      { heading: "Practical for small teams", body: "Role-specific apps reduce training burden while keeping one operational picture." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/industries/psv",
    title: "PSV and Contracted Passenger Transport",
    eyebrow: "Industry",
    lead: "Manage contracted passenger services with connected fleet and compliance workflows.",
    sections: [
      { heading: "Contract performance", body: "Evidence for inspections, defects and service delivery in one platform." },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/legal/accessibility-statement",
    title: "Accessibility Statement",
    eyebrow: "Legal",
    lead: "This website targets WCAG 2.2 Level AA, including the nine success criteria introduced in WCAG 2.2.",
    sections: [
      { heading: "Conformance target", body: "We aim for WCAG 2.2 Level AA across this public website. Product applications are assessed separately as part of their release process." },
      { heading: "Measures taken", body: "Semantic structure, keyboard navigation, visible focus, sufficient contrast, reduced-motion support, form labels and skip links are built into the site template." },
      { heading: "Feedback", body: "If you encounter accessibility barriers on this site, contact us via the details on the Contact page. We review reports and prioritise fixes that block access to core information or the demo enquiry form." },
      { heading: "Preparation of this statement", body: "This statement was prepared and published on 28 July 2026 and will be updated when material site changes are released." },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
];

// Inject resource hub links after static definition
const resourcesHub = tierOnePages.find((page) => page.path === "/resources");
if (resourcesHub) {
  resourcesHub.relatedLinks = resourceHubLinks;
}

export const allSitePages: TierOnePage[] = [
  ...tierOnePages,
  ...solutionPages,
  ...resourceArticles,
  ...resourceHubPages,
  ...legalPages,
  ...companyPages,
];

const pageByPath = new Map(allSitePages.map((page) => [page.path, page]));

export function getTierOnePage(pathname: string): TierOnePage | undefined {
  const normalised = pathname.replace(/\/$/, "") || "/";
  return pageByPath.get(normalised);
}

export function getAllTierOnePaths() {
  return allSitePages.map((page) => page.path);
}
