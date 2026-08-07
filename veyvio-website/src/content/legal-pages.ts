import type { TierOnePage } from "./tier-one-pages";
import { siteContact } from "../lib/open-decisions";

const company = siteContact.legalName;
const domain = siteContact.domain.replace(/^https?:\/\//, "");
const salesEmail = siteContact.salesEmail;
const supportEmail = siteContact.supportEmail;
const effectiveDate = "28 July 2026";

/**
 * Website legal notices for veyvio.co.uk.
 * Founder-approved for publication on 28 July 2026.
 * Company registered name remains provisional until Companies House confirmation
 * (see openDecisions.legalCompanyName). Solicitor review recommended for formal
 * commercial contracts — these pages govern the marketing website only.
 */
export const legalPages: TierOnePage[] = [
  {
    path: "/legal/privacy",
    title: "Privacy Notice",
    eyebrow: "Legal",
    lead: `How ${company} collects and uses personal information when you use ${domain} and submit a demonstration enquiry. Effective ${effectiveDate}.`,
    sections: [
      {
        heading: "Who we are (controller)",
        body: `${company} ("Veyvio", "we", "us") is the controller for personal data collected through the public website at ${domain}. For privacy enquiries email ${salesEmail} (or ${supportEmail}). This notice covers the marketing website and demonstration enquiry form only. Use of Veyvio product applications (Command, Driver, Yard) by authorised users of a customer organisation is described in the Product Applications Privacy Notice at /legal/product-privacy, and is also governed by that organisation's agreement with us.`,
      },
      {
        heading: "Information we collect on this website",
        body: "When you submit a demonstration enquiry we collect your name, work email address, organisation name, service type, fleet size band, and a record of your consent to our processing for that enquiry. We may also collect technical data such as IP address, browser type, device category and pages visited if you accept analytics cookies. We do not collect passenger, safeguarding, special-category or health information through this marketing site.",
      },
      {
        heading: "How we use your information",
        body: "We use enquiry data to respond to your request, schedule a demonstration, keep a sales record of the enquiry, and assess whether Veyvio may be suitable for your organisation. We use analytics data, where consented, to understand how visitors use the website and improve content. We do not sell personal information and we do not use website enquiry data for automated decision-making that produces legal or similarly significant effects.",
      },
      {
        heading: "Lawful bases (UK GDPR)",
        body: "We process demonstration enquiries on the basis of legitimate interests in responding to business enquiries (Article 6(1)(f)) and, where you ask us to take steps toward a commercial engagement, steps prior to entering a contract at your request (Article 6(1)(b)). Where we send marketing communications beyond responding to your enquiry, we will rely on consent (Article 6(1)(a)). Analytics cookies are used only with your consent.",
      },
      {
        heading: "Sharing and processors",
        body: "We use service providers to operate this website and process enquiries. Current processors may include: Cloudflare (hosting and security), Resend (transactional email), HubSpot (CRM / enquiry records), and Cal.com (calendar scheduling links). These providers process data on our instructions under appropriate agreements. We may disclose information if required by law or to protect rights, safety or security.",
      },
      {
        heading: "International transfers",
        body: "Some service providers may process data outside the UK. Where this occurs we implement appropriate safeguards such as UK International Data Transfer Agreements, the UK Addendum to the EU SCCs, or adequacy regulations, consistent with UK GDPR requirements.",
      },
      {
        heading: "Retention",
        body: "Demonstration enquiry records are retained for as long as needed to manage the sales process and meet legal obligations, then deleted or anonymised. As a working rule we review open marketing enquiries at least every 24 months. Analytics data is retained according to our analytics configuration, typically no longer than 26 months.",
      },
      {
        heading: "Your rights",
        body: "Under UK GDPR you have rights to access, rectify, erase, restrict, object and port your personal data, and to withdraw consent where processing is consent-based. You may lodge a complaint with the UK Information Commissioner's Office (ico.org.uk). To exercise rights, contact us at the email above. We may need to verify your identity before fulfilling a request.",
      },
      {
        heading: "Children",
        body: "This website is aimed at business and organisational users. We do not knowingly collect personal data from children through the marketing site.",
      },
      {
        heading: "Changes",
        body: `We may update this notice when our practices or legal requirements change. The effective date at the top of this page will be updated on publication. Current effective date: ${effectiveDate}.`,
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
  {
    path: "/legal/cookies",
    title: "Cookie Notice",
    eyebrow: "Legal",
    lead: `How ${domain} uses cookies and similar technologies. Effective ${effectiveDate}.`,
    sections: [
      {
        heading: "What are cookies?",
        body: "Cookies are small text files stored on your device. We also use similar technologies such as local storage for cookie consent preferences.",
      },
      {
        heading: "Essential cookies and storage",
        body: "Essential technologies are required for the website to function. They include security and load-balancing features provided by our hosting platform (Cloudflare) and our local consent preference key (veyvio-cookie-consent) stored in your browser so we remember your choice. Essential technologies cannot be switched off through our cookie banner.",
      },
      {
        heading: "Analytics cookies",
        body: "If you accept analytics cookies, we may collect aggregated information about how visitors use the website (for example pages viewed, CTA clicks and device category). Analytics events are gated behind consent and are not sent until you choose Accept analytics in the cookie banner. If no analytics endpoint is configured, events are not transmitted off-device.",
      },
      {
        heading: "Cookie / storage summary",
        body: "veyvio-cookie-consent (local storage) — stores Accept analytics / Essential only preference — essential — retained until you clear site data or change preference. Cloudflare security / CDN cookies — network and security — essential — duration set by Cloudflare. Optional analytics identifiers — only if an analytics endpoint is enabled and you consent — typically session or up to 26 months depending on provider configuration.",
      },
      {
        heading: "Managing preferences",
        body: "You can change your choice at any time using Cookie preferences in the website footer. You can also control cookies through your browser settings. Blocking essential technologies may affect site functionality.",
      },
      {
        heading: "Third-party cookies",
        body: "If you follow an optional calendar booking link (for example Cal.com) after submitting a demonstration enquiry, that provider may set its own cookies subject to its privacy notice. We review third-party scripts before enabling them in production and do not load marketing trackers by default.",
      },
      {
        heading: "Changes",
        body: `We may update this notice when our cookie practices change. Current effective date: ${effectiveDate}.`,
      },
    ],
    cta: { label: "Privacy notice", href: "/legal/privacy" },
  },
  {
    path: "/legal/product-privacy",
    title: "Product Applications Privacy Notice",
    eyebrow: "Legal",
    lead: `How ${company} processes personal data in Veyvio Command, Driver and Yard when used by authorised staff of a customer organisation. Effective ${effectiveDate}. Store listing URL: https://${domain}/legal/product-privacy`,
    sections: [
      {
        heading: "Scope",
        body: `This notice covers the Veyvio product applications: Command (operations), Driver (mobile duty app), and Yard (depot readiness). It does not cover the public marketing website — see /legal/privacy. Your employer or transport operator (the customer organisation) typically decides how operational records are used day to day; ${company} processes data to provide the licensed software service.`,
      },
      {
        heading: "Roles",
        body: `For most operational personal data entered by staff while delivering passenger transport services, the customer organisation is the controller and ${company} acts as a processor under the organisation's agreement. Where we process account, billing, support or security logs for our own purposes (for example authentication security and product integrity), ${company} is the controller. Privacy requests from end users should normally go through the customer organisation first; you may also contact ${supportEmail}.`,
      },
      {
        heading: "Categories of personal data",
        body: "Depending on role and features enabled: account identifiers (name, work email, company membership); duty and assignment records; vehicle check and defect evidence including photos; precise location while the Driver app is in use for duty progress or location-tagged safety reports; messages and notifications related to operations; device identifiers used for push delivery; and technical logs needed to operate and secure the service. We do not sell this data and we do not use it for advertising.",
      },
      {
        heading: "Location",
        body: "Veyvio Driver requests precise location when in use for duty tracking, parking context and evidence tagging. Background location is not requested. Location is not used for marketing.",
      },
      {
        heading: "Lawful bases",
        body: "Processing for the customer organisation is typically necessary for performance of a contract or legitimate interests in safe transport operations, as set out in that organisation's policies. Our own processing for service security and support relies on legitimate interests and, where applicable, legal obligation.",
      },
      {
        heading: "Sharing and processors",
        body: "Data is hosted with infrastructure and platform providers under contracts (including Supabase for auth/database and, where enabled, Firebase Cloud Messaging for device push delivery). Access is tenant-scoped by company. Support staff access customer data only when authorised and logged. We may disclose information if required by law or to protect rights, safety or security.",
      },
      {
        heading: "Retention and deletion",
        body: `Retention follows the customer organisation's agreement and operational need (including compliance and audit). Individuals may request deletion or access via their organisation or by emailing ${supportEmail}; we will coordinate with the customer organisation where they are the controller.`,
      },
      {
        heading: "International transfers",
        body: "Where providers process data outside the UK we use appropriate safeguards consistent with UK GDPR (for example IDTA / UK Addendum to SCCs or adequacy).",
      },
      {
        heading: "Your rights",
        body: `Under UK GDPR you may have rights to access, rectify, erase, restrict, object and port personal data, and to lodge a complaint with the ICO (ico.org.uk). Exercise rights via your organisation or ${supportEmail}.`,
      },
      {
        heading: "Children",
        body: "Product applications are for authorised adult staff of customer organisations. Passenger information entered by staff is governed by the customer organisation's safeguarding and data-protection policies.",
      },
      {
        heading: "Changes",
        body: `We may update this notice when product practices or legal requirements change. Current effective date: ${effectiveDate}.`,
      },
    ],
    cta: { label: "Website privacy notice", href: "/legal/privacy" },
  },
  {
    path: "/legal/terms",
    title: "Website Terms of Use",
    eyebrow: "Legal",
    lead: `Terms governing access to and use of ${domain}. Effective ${effectiveDate}.`,
    sections: [
      {
        heading: "Acceptance",
        body: `By accessing this website you agree to these terms. If you do not agree, do not use the website. Use of Veyvio software products is governed by separate licence or service agreements with your organisation.`,
      },
      {
        heading: "Permitted use",
        body: "You may use this website to learn about Veyvio, submit legitimate business enquiries and access publicly available resources. You must not misuse the site, attempt unauthorised access, introduce malware, scrape content in violation of robots directives, reverse engineer non-public interfaces, or use the site in any unlawful manner.",
      },
      {
        heading: "Demonstration enquiries",
        body: "Information you submit through demonstration or contact forms must be accurate to the best of your knowledge. Submitting enquiries on behalf of an organisation implies you have authority to make business contact on its behalf or are requesting information in a personal capacity for evaluation. Submitting an enquiry does not create a contract to supply software.",
      },
      {
        heading: "Intellectual property",
        body: "All content on this website — including text, graphics, logos, product screenshots and software interfaces depicted — is owned by or licensed to Veyvio unless stated otherwise. You may not copy, modify or redistribute content except for personal, non-commercial reference or with our written permission.",
      },
      {
        heading: "Product information and claims",
        body: "We aim to describe Veyvio capabilities accurately. Features may be marked as pilot, in development or planned. Public claims are governed by our internal claims register. Nothing on this website constitutes a binding offer to supply software. Availability, pricing and scope are confirmed only in commercial agreements.",
      },
      {
        heading: "Disclaimer",
        body: "This website is provided as is. To the fullest extent permitted by law we exclude warranties that the site will be uninterrupted or error-free. Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded under applicable law.",
      },
      {
        heading: "Governing law",
        body: "These terms are governed by the laws of England and Wales. Courts of England and Wales have exclusive jurisdiction, without prejudice to mandatory consumer rights where applicable.",
      },
      {
        heading: "Changes",
        body: `We may update these terms from time to time. Continued use of the website after publication constitutes acceptance of the updated terms. Current effective date: ${effectiveDate}.`,
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
  {
    path: "/legal/vulnerability-disclosure",
    title: "Vulnerability Disclosure",
    eyebrow: "Legal",
    lead: `How to report security vulnerabilities in Veyvio products and this website. Effective ${effectiveDate}.`,
    sections: [
      {
        heading: "Reporting",
        body: `Please report suspected security vulnerabilities to ${supportEmail} (and copy ${salesEmail} if needed) with sufficient detail to reproduce the issue. Do not publicly disclose vulnerabilities before we have had a reasonable opportunity to investigate and remediate.`,
      },
      {
        heading: "What to include",
        body: "Affected URL or product area, steps to reproduce, potential impact, and your contact details. We aim to acknowledge reports within five business days.",
      },
      {
        heading: "Safe harbour",
        body: "We will not pursue legal action against researchers who act in good faith, avoid privacy violations and service disruption, and give us reasonable time to fix confirmed issues.",
      },
      {
        heading: "Out of scope",
        body: "Social engineering of staff, denial-of-service testing against production without prior written approval, and physical attacks are out of scope.",
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
];
