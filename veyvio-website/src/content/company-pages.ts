import type { TierOnePage } from "./tier-one-pages";

export const companyPages: TierOnePage[] = [
  {
    path: "/about",
    title: "About Veyvio",
    eyebrow: "Company",
    lead: "Veyvio builds connected transport operations software for passenger transport teams — community transport, contracted services and professional fleets.",
    sections: [
      {
        heading: "What we do",
        body: "We bring bookings, drivers, vehicles, yard activity, maintenance and compliance into one platform with role-specific applications. Each team sees what matters to them without duplicating data entry or losing operational context.",
      },
      {
        heading: "How we work",
        body: "We develop alongside real operators through controlled pilots. We do not claim features that are not built, and we do not publish customer evidence without permission.",
      },
      {
        heading: "Where we focus",
        body: "Our initial focus is UK passenger transport — particularly community transport and accessible services where connected yard, driver and dispatch workflows are underserved.",
      },
    ],
    relatedLinks: [
      { label: "Our mission", href: "/mission" },
      { label: "Partners", href: "/partners" },
      { label: "Pilot programme", href: "/pilot-programme" },
    ],
    cta: { label: "Book a demo", href: "/demo" },
  },
  {
    path: "/mission",
    title: "Our mission",
    eyebrow: "Company",
    lead: "Operational confidence for passenger transport — every team knows what is happening, what matters, and what to do next.",
    sections: [
      {
        heading: "Operational confidence",
        body: "Transport operations fail quietly when information is spread across paper, spreadsheets and messaging apps. Veyvio exists so teams can see what is happening, act on exceptions, and produce evidence without rebuilding history before every audit.",
      },
      {
        heading: "Safety before convenience",
        body: "Safety-critical information is never hidden for a simpler interface. Readiness, eligibility and evidence are part of the workflow — not a report generated after the fact.",
      },
      {
        heading: "Built for real operators",
        body: "We respect the constraints of limited staff, mixed fleets and governance expectations from funders and commissioners. Software should reduce uncertainty — not add another system nobody trusts.",
      },
    ],
    cta: { label: "Explore the platform", href: "/platform" },
  },
  {
    path: "/partners",
    title: "Partners",
    eyebrow: "Company",
    lead: "We work with implementation partners, industry bodies and technology providers where it helps operators deploy Veyvio successfully.",
    sections: [
      {
        heading: "Partner programme",
        body: "A formal partner programme is in development. We are interested in organisations with passenger transport implementation experience and a commitment to operational safety.",
      },
      {
        heading: "Integrations",
        body: "We do not list integration partners publicly until relationships are contractually and technically confirmed. If you represent a system operators depend on, contact us to discuss roadmap alignment.",
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
  {
    path: "/careers",
    title: "Careers",
    eyebrow: "Company",
    lead: "We are building a small, senior team focused on transport operations software done properly.",
    sections: [
      {
        heading: "Open roles",
        body: "No open positions are advertised at this time. If you have deep experience in passenger transport operations, compliance or mobile/offline systems engineering, you may send a brief introduction via our contact page.",
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
  {
    path: "/customer-success",
    title: "Customer success",
    eyebrow: "Company",
    lead: "How Veyvio supports operators from pilot through operational launch.",
    sections: [
      {
        heading: "Implementation partnership",
        body: "Customer success starts during implementation — workflow mapping, configuration, training and controlled pilot acceptance before operational launch.",
      },
      {
        heading: "Ongoing support",
        body: "Existing customers receive support through their organisation's agreed support route. Operational issues are handled through Veyvio applications, not this marketing website.",
      },
    ],
    cta: { label: "See implementation", href: "/implementation" },
  },
  {
    path: "/release-notes",
    title: "Release notes",
    eyebrow: "Resources",
    lead: "Product changes for Veyvio applications are communicated to licensed customers through their support channel.",
    sections: [
      {
        heading: "Public release notes",
        body: "A public release notes feed will publish here when we begin regular production releases to app stores and operator environments. Until then, pilot participants receive change information directly.",
      },
    ],
    cta: { label: "Pilot programme", href: "/pilot-programme" },
  },
];
