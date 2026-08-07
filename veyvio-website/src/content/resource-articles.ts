import type { TierOnePage } from "./tier-one-pages";

export const resourceArticles: TierOnePage[] = [
  {
    path: "/resources/moving-from-paper-vehicle-checks",
    title: "Moving from paper vehicle checks",
    eyebrow: "Guide",
    lead: "A practical path from paper walkarounds to digital checks with photographic evidence and audit history.",
    sections: [
      { heading: "Start with the duty workflow", body: "Drivers need checks that fit the start-of-shift path — not a separate admin task. Define which checks block duty acceptance and which create attention items." },
      { heading: "Evidence before assumption", body: "Photographs and defect records should link to the vehicle and check instance, not a messaging thread. Yard and maintenance teams need the same record dispatch sees." },
      { heading: "Roll out in phases", body: "Pilot one depot, confirm offline behaviour and review evidence quality before expanding. Veyvio supports configured checks designed to align with the DVSA Guide to Maintaining Roadworthiness — your organisation remains responsible for meeting applicable requirements." },
    ],
    cta: { label: "Explore Veyvio Driver", href: "/platform/driver" },
  },
  {
    path: "/resources/building-a-vehicle-damage-workflow",
    title: "Building a vehicle-damage workflow",
    eyebrow: "Guide",
    lead: "Connect damage reporting, bay placement, maintenance and return-to-service decisions.",
    sections: [
      { heading: "Separate observation from approval", body: "The person who records damage should not be the sole approver for return to service. Veyvio Yard and Maintenance support this separation by role." },
      { heading: "Make damage visible early", body: "Known damage should affect readiness before dispatch, not after a controller has already assigned the vehicle." },
    ],
    cta: { label: "Explore Veyvio Yard", href: "/platform/yard" },
  },
  {
    path: "/resources/preparing-for-transport-software-implementation",
    title: "Preparing for transport software implementation",
    eyebrow: "Guide",
    lead: "Reduce implementation risk by mapping services, roles and data before configuration begins.",
    sections: [
      { heading: "Workflow before software", body: "Document how bookings become duties today — including exceptions, paper workarounds and who approves overrides." },
      { heading: "Name your operational sponsor", body: "Implementation succeeds when a transport lead owns decisions on priorities, pilot scope and acceptance criteria." },
    ],
    cta: { label: "See how implementation works", href: "/implementation" },
  },
  {
    path: "/resources/managing-driver-and-vehicle-readiness",
    title: "Managing driver and vehicle readiness",
    eyebrow: "Guide",
    lead: "Treat readiness as calculated evidence — not a checkbox on a whiteboard.",
    sections: [
      { heading: "Define readiness inputs", body: "Checks, MOT, defects, VOR, tyres, equipment and approvals should each have an owner and a refresh rule." },
      { heading: "Use clear outcomes", body: "Ready, Warning, Restricted, Not ready and Unknown give controllers language they can act on." },
    ],
    cta: { label: "Explore vehicle readiness", href: "/solutions/vehicle-readiness" },
  },
  {
    path: "/resources/improving-end-of-shift-vehicle-handback",
    title: "Improving end-of-shift vehicle handback",
    eyebrow: "Guide",
    lead: "Close the loop between driver handback, yard inspection and next-shift readiness.",
    sections: [
      { heading: "Handback is operational data", body: "Fuel, damage, equipment and cab condition reported at handback should update yard and maintenance queues automatically." },
      { heading: "Reduce next-shift surprises", body: "When handback defects are visible overnight, morning dispatch starts from fact — not phone calls." },
    ],
    cta: { label: "Explore Veyvio Driver", href: "/platform/driver" },
  },
  {
    path: "/resources/understanding-operational-audit-evidence",
    title: "Understanding operational audit evidence",
    eyebrow: "Guide",
    lead: "What good evidence looks like for funders, commissioners and internal governance.",
    sections: [
      { heading: "Evidence must be retrievable", body: "An audit trail is only useful if it can be filtered by vehicle, driver, date and event type without manual reconstruction." },
      { heading: "Overrides need reasons", body: "Authorised overrides should record who approved them, why and what evidence was reviewed." },
    ],
    cta: { label: "Visit the Trust Centre", href: "/trust" },
  },
];

export const resourceHubLinks = resourceArticles.map((article) => ({
  label: article.title,
  href: article.path,
}));
