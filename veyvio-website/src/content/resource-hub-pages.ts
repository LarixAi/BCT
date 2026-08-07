import type { TierOnePage } from "./tier-one-pages";
import { resourceHubLinks } from "./resource-articles";

export const resourceHubPages: TierOnePage[] = [
  {
    path: "/resources/guides",
    title: "Guides",
    eyebrow: "Resources",
    lead: "Practical guides for passenger transport operations teams.",
    sections: [
      {
        heading: "Featured guides",
        body: "Step-by-step guidance on checks, damage workflows, readiness, handback and audit evidence — written for operators.",
      },
    ],
    relatedLinks: resourceHubLinks,
    cta: { label: "Visit Resource Centre", href: "/resources" },
  },
  {
    path: "/resources/templates",
    title: "Templates",
    eyebrow: "Resources",
    lead: "Downloadable templates to support operational workflows while evaluating or implementing Veyvio.",
    sections: [
      {
        heading: "Coming soon",
        body: "Vehicle check templates, handback checklists and implementation planning worksheets will publish here after operational review. Register interest through a demonstration enquiry.",
      },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/resources/insights",
    title: "Insights",
    eyebrow: "Resources",
    lead: "Perspectives on connected transport operations, compliance and community transport governance.",
    sections: [
      {
        heading: "Publishing cadence",
        body: "Insights articles will publish when we have substantiated operational learnings to share — not for search traffic alone (blueprint §7 Section 13).",
      },
    ],
    cta: { label: "Resource Centre", href: "/resources" },
  },
  {
    path: "/resources/glossary",
    title: "Glossary",
    eyebrow: "Resources",
    lead: "Common terms used across Veyvio and passenger transport operations.",
    sections: [
      {
        heading: "Duty",
        body: "Published work assigned to a driver for a defined period, including stops, checks and handback requirements.",
      },
      {
        heading: "Vehicle readiness",
        body: "A calculated outcome based on checks, defects, MOT, servicing and configured rules — not a manual assertion.",
      },
      {
        heading: "VOR (Vehicle off road)",
        body: "A vehicle status indicating it must not enter service until defined work or approvals are complete.",
      },
      {
        heading: "Return to service",
        body: "A controlled decision that a vehicle may re-enter operational use, separate from the person who recorded a defect.",
      },
      {
        heading: "Tenant isolation",
        body: "Logical separation of each licensed operator's data so one company cannot access another's records.",
      },
    ],
  },
  {
    path: "/resources/faqs",
    title: "Frequently asked questions",
    eyebrow: "Resources",
    lead: "Common questions from transport operators evaluating Veyvio.",
    sections: [
      {
        heading: "Who is Veyvio for?",
        body: "Passenger transport operators — community transport, dial-a-Ride, school and SEND transport, healthcare transport and contracted PSV services.",
      },
      {
        heading: "Do you publish pricing?",
        body: "Not as a public list. Pricing depends on fleet size, depots, licensed modules and implementation scope. Book a demonstration for a tailored quote.",
      },
      {
        heading: "Is Veyvio legally compliant out of the box?",
        body: "No software can guarantee legal compliance. Veyvio helps organisations manage compliance responsibilities through configured rules, evidence and audit history. Your organisation remains responsible for meeting applicable requirements.",
      },
      {
        heading: "Can we run a pilot?",
        body: "Yes. We run controlled pilots with operators willing to provide structured feedback. See the pilot programme page.",
      },
      {
        heading: "Where is data hosted?",
        body: "Hosting location is documented in the Trust Centre for procurement review. Contact us for current data-processing terms.",
      },
    ],
    relatedLinks: [
      { label: "Pilot programme", href: "/pilot-programme" },
      { label: "Trust Centre", href: "/trust" },
      { label: "Book a demo", href: "/demo" },
    ],
  },
];
