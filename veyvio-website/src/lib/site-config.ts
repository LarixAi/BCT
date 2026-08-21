import { siteContact } from "./open-decisions";

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; status?: string }[];
};

export const utilityLinks = [
  { label: "System status", href: "/status" },
  { label: "Support", href: "/support" },
  { label: "Contact", href: "/contact" },
] as const;

export const mainNav: NavItem[] = [
  {
    label: "Platform",
    href: "/platform",
    children: [
      { label: "Platform overview", href: "/platform" },
      { label: "Veyvio Command", href: "/platform/command" },
      { label: "Veyvio Driver", href: "/platform/driver" },
      { label: "Veyvio Yard", href: "/platform/yard" },
      {
        label: "Veyvio Maintenance",
        href: "/platform/maintenance",
        status: "Coming soon",
      },
      {
        label: "Customer portal",
        href: "/platform/customer-portal",
        status: "Coming soon",
      },
    ],
  },
  {
    label: "Solutions",
    href: "/solutions",
    children: [
      { label: "Solutions overview", href: "/solutions" },
      { label: "Transport operations", href: "/solutions/transport-operations" },
      { label: "Fleet safety and compliance", href: "/solutions/fleet-safety-compliance" },
      { label: "Vehicle readiness", href: "/solutions/vehicle-readiness" },
      { label: "Multi-depot operations", href: "/solutions/multi-depot" },
    ],
  },
  {
    label: "Industries",
    href: "/industries",
    children: [
      { label: "Community transport", href: "/industries/community-transport" },
      { label: "Dial-a-Ride", href: "/industries/dial-a-ride" },
      { label: "Home-to-school transport", href: "/industries/home-to-school" },
      { label: "SEND transport", href: "/industries/send-transport" },
      { label: "Local authorities", href: "/industries/local-authorities" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "Company", href: "/about" },
];

export const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Platform overview", href: "/platform" },
      { label: "Veyvio Command", href: "/platform/command" },
      { label: "Veyvio Driver", href: "/platform/driver" },
      { label: "Veyvio Yard", href: "/platform/yard" },
      { label: "Veyvio Maintenance", href: "/platform/maintenance" },
      { label: "Customer portal", href: "/platform/customer-portal" },
      { label: "Integrations", href: "/integrations" },
      { label: "Mobile applications", href: "/platform/driver" },
    ],
  },
  {
    title: "Solutions",
    links: [
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
    title: "Industries",
    links: [
      { label: "Community transport", href: "/industries/community-transport" },
      { label: "Dial-a-Ride", href: "/industries/dial-a-ride" },
      { label: "School transport", href: "/industries/home-to-school" },
      { label: "SEND transport", href: "/industries/send-transport" },
      { label: "Local authorities", href: "/industries/local-authorities" },
      { label: "Healthcare transport", href: "/industries/healthcare-transport" },
      { label: "PSV operators", href: "/industries/psv" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Resource centre", href: "/resources" },
      { label: "Guides", href: "/resources/guides" },
      { label: "Templates", href: "/resources/templates" },
      { label: "Insights", href: "/resources/insights" },
      { label: "Glossary", href: "/resources/glossary" },
      { label: "FAQs", href: "/resources/faqs" },
      { label: "Release notes", href: "/release-notes" },
      { label: "Help centre", href: "/support" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Mission", href: "/mission" },
      { label: "Partners", href: "/partners" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Customer success", href: "/customer-success" },
    ],
  },
  {
    title: "Trust and legal",
    links: [
      { label: "Trust centre", href: "/trust" },
      { label: "Security", href: "/trust/security" },
      { label: "Tenant isolation", href: "/trust/tenant-isolation" },
      { label: "Privacy notice", href: "/legal/privacy" },
      { label: "Product apps privacy", href: "/legal/product-privacy" },
      { label: "Cookie notice", href: "/legal/cookies" },
      { label: "Accessibility", href: "/legal/accessibility-statement" },
      { label: "Website terms", href: "/legal/terms" },
      { label: "Vulnerability disclosure", href: "/legal/vulnerability-disclosure" },
      { label: "Help / support", href: "/support" },
      { label: "System status", href: "/status" },
    ],
  },
] as const;

export function getStructuredData() {
  const base = siteContact.domain;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "Veyvio",
        legalName: siteContact.legalName,
        url: `${base}/`,
        description:
          "A connected transport management platform for passenger transport operations.",
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          email: siteContact.salesEmail,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/`,
        name: "Veyvio",
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${base}/#homepage`,
        url: `${base}/`,
        name: "Veyvio | Connected Transport Management Platform",
        isPartOf: { "@id": `${base}/#website` },
        about: { "@id": `${base}/#organization` },
      },
    ],
  };
}
