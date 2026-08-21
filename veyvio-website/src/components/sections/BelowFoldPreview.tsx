import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta, trackEvent } from "@/lib/analytics";

type ProductKey = "command" | "driver" | "yard" | "maintenance" | "customer";
type OperatorKey = "community" | "school" | "healthcare" | "psv";
type DifferentiatorKey =
  | "operational-truth"
  | "safety"
  | "readiness"
  | "offline"
  | "tenant-isolation";

type PreviewRow = {
  title: string;
  detail: string;
  status: string;
  attention?: boolean;
};

const productData: Record<
  ProductKey,
  {
    name: string;
    shortName: string;
    title: string;
    description: string;
    badge: string;
    href: string;
    stats: [string, string][];
    rows: PreviewRow[];
  }
> = {
  command: {
    name: "Veyvio Command",
    shortName: "Command",
    title: "Today’s live operation",
    description:
      "Bookings, duties, vehicles and exceptions in one calm operational view.",
    badge: "Live",
    href: "/platform/command",
    stats: [
      ["Duties live", "18"],
      ["Vehicles ready", "24 / 27"],
      ["Needs attention", "3"],
    ],
    rows: [
      { title: "CT-104 · North Loop", detail: "A. Morgan · BX62 BCT", status: "On time" },
      { title: "SEND-08 · School run", detail: "J. Patel · LK19 VYO", status: "Ready" },
      {
        title: "DAR-22 · East zone",
        detail: "Driver swap requested",
        status: "Review",
        attention: true,
      },
    ],
  },
  driver: {
    name: "Veyvio Driver",
    shortName: "Driver",
    title: "Today’s guided duty",
    description:
      "Duties, checks, messages and handback stay clear in one mobile workflow.",
    badge: "On time",
    href: "/platform/driver",
    stats: [
      ["Stops left", "6"],
      ["Checks queued", "0"],
      ["New messages", "1"],
    ],
    rows: [
      { title: "Green Lane Centre", detail: "Arrive by 08:48", status: "Next" },
      {
        title: "Passenger requirements",
        detail: "Mobility aid noted",
        status: "Viewed",
      },
      {
        title: "End-of-shift handback",
        detail: "Available after final stop",
        status: "Later",
      },
    ],
  },
  yard: {
    name: "Veyvio Yard",
    shortName: "Yard",
    title: "North depot readiness",
    description:
      "Location, keys, equipment, damage and readiness connect to live assignments.",
    badge: "24 ready",
    href: "/platform/yard",
    stats: [
      ["Vehicles ready", "24"],
      ["Warnings", "2"],
      ["VOR", "1"],
    ],
    rows: [
      { title: "BX62 BCT", detail: "Bay 04 · keys logged", status: "Ready" },
      { title: "LK19 VYO", detail: "Equipment check complete", status: "Ready" },
      {
        title: "YN68 CTD",
        detail: "Ramp inspection required",
        status: "Restricted",
        attention: true,
      },
    ],
  },
  maintenance: {
    name: "Veyvio Maintenance",
    shortName: "Maintenance",
    title: "Fleet work and release",
    description:
      "Defects, work orders and return-to-service decisions remain linked to the vehicle.",
    badge: "3 active",
    href: "/platform/maintenance",
    stats: [
      ["Work orders", "3"],
      ["Due soon", "5"],
      ["Awaiting approval", "1"],
    ],
    rows: [
      {
        title: "WO-218 · Ramp inspection",
        detail: "YN68 CTD",
        status: "In progress",
        attention: true,
      },
      { title: "WO-214 · Tyre replacement", detail: "BX17 PSV", status: "Complete" },
      { title: "WO-209 · Safety inspection", detail: "LK19 VYO", status: "Approved" },
    ],
  },
  customer: {
    name: "Customer Portal",
    shortName: "Customer",
    title: "Authorised service view",
    description:
      "Customers see only the bookings and service information they are allowed to access.",
    badge: "Controlled access",
    href: "/platform/customer-portal",
    stats: [
      ["Bookings", "14"],
      ["Upcoming", "6"],
      ["Messages", "2"],
    ],
    rows: [
      { title: "CT-104 · North Loop", detail: "Sunday · 08:35", status: "Confirmed" },
      { title: "DAR-22 · East zone", detail: "Sunday · 10:10", status: "Upcoming" },
      {
        title: "Service request 184",
        detail: "Additional requirement received",
        status: "Review",
        attention: true,
      },
    ],
  },
};

const operatorData: Record<
  OperatorKey,
  {
    label: string;
    title: string;
    description: string;
    benefits: string[];
    workflow: [string, string][];
  }
> = {
  community: {
    label: "Community transport",
    title: "Connect limited resources with strong governance.",
    description:
      "Bring bookings, volunteer or employed drivers, vehicle readiness and community-service evidence into one operational flow.",
    benefits: [
      "Accessible passenger requirements stay visible",
      "Driver and vehicle checks happen before assignment",
      "Evidence is easier to retrieve for funders and authorities",
    ],
    workflow: [
      ["Plan the booking", "Capture passenger needs and service commitments."],
      ["Confirm people and vehicle", "Apply eligibility and readiness rules."],
      ["Operate with a shared view", "Keep controllers, drivers and yard aligned."],
      ["Keep the evidence", "Retain checks, decisions and service outcomes."],
    ],
  },
  school: {
    label: "SEND & school",
    title: "Keep complex passenger needs clear across every hand-off.",
    description:
      "Connect routes, children, guardians, escorts, term dates, changes and safeguarding-sensitive information with controlled access.",
    benefits: [
      "Passenger requirements reach only authorised roles",
      "Driver, escort and vehicle suitability stay visible",
      "Route changes keep an attributable history",
    ],
    workflow: [
      ["Build the route", "Combine term dates, stops and passenger requirements."],
      ["Check the assigned team", "Confirm driver, escort and vehicle eligibility."],
      ["Share controlled updates", "Keep guardians and operations aligned."],
      ["Retain the record", "Preserve delivery, exceptions and decisions."],
    ],
  },
  healthcare: {
    label: "Healthcare",
    title: "Coordinate time-sensitive journeys with controlled information.",
    description:
      "Give authorised teams the right service detail while keeping operational records, changes and outcomes connected.",
    benefits: [
      "Journey requirements stay clear to the assigned team",
      "Live exceptions reach operations without informal workarounds",
      "Service evidence remains attributable and retrievable",
    ],
    workflow: [
      ["Capture the requirement", "Record authorised journey and mobility needs."],
      ["Confirm readiness", "Check the people, vehicle and equipment."],
      ["Manage the live journey", "Share progress and exceptions with operations."],
      ["Close with evidence", "Retain the operational outcome and reason."],
    ],
  },
  psv: {
    label: "PSV & contracted",
    title: "Connect service delivery, fleet readiness and contract evidence.",
    description:
      "Manage scheduled services across drivers, vehicles and depots with a live view of readiness, exceptions and performance evidence.",
    benefits: [
      "Dispatch sees readiness before assigning work",
      "Defects and maintenance stay linked to the vehicle",
      "Contract and audit evidence is easier to retrieve",
    ],
    workflow: [
      ["Plan the service", "Build duties around the contracted operating plan."],
      ["Release the right vehicle", "Apply fleet readiness rules before operation."],
      ["Track live delivery", "Own delays, swaps and operational exceptions."],
      ["Review outcomes", "Use connected evidence for service reporting."],
    ],
  },
};

const differentiators: {
  key: DifferentiatorKey;
  title: string;
  description: string;
}[] = [
  {
    key: "operational-truth",
    title: "One operational truth",
    description:
      "Command, Driver, Yard and Maintenance share live state, so bookings, duties, checks and defects stay connected.",
  },
  {
    key: "safety",
    title: "Safety built into the workflow",
    description:
      "Driver eligibility, vehicle readiness and configured gates help stop unsafe assignments before work reaches the road.",
  },
  {
    key: "readiness",
    title: "Vehicle readiness before every move",
    description:
      "Checks, defects, VOR and return-to-service decisions stay visible to dispatch, yard and maintenance teams.",
  },
  {
    key: "offline",
    title: "Frontline work that keeps moving",
    description:
      "Driver and Yard workflows can queue selected actions safely and make their sync state clear when connectivity returns.",
  },
  {
    key: "tenant-isolation",
    title: "Tenant-isolated by design",
    description:
      "Each operator’s data remains separated through company boundaries, application scopes and controlled support access.",
  },
];

const caseStudyPreviews = [
  {
    key: "community-pilot",
    title: "A community transport workflow pilot",
    description:
      "A representative view of how bookings, people, vehicles and hand-offs can be mapped before a controlled pilot.",
    image: "/images/case-studies/community-pilot-preview-v1.png",
    alt: "A community transport team reviewing a tablet beside an accessible minibus",
    tags: ["Community transport", "Pilot preview"],
  },
  {
    key: "vehicle-readiness",
    title: "Vehicle readiness before service",
    description:
      "A practical look at the checks, evidence and release decisions that help teams prepare an accessible vehicle.",
    image: "/images/case-studies/vehicle-readiness-preview-v1.png",
    alt: "A driver inspecting an accessible minibus ramp before service",
    tags: ["Vehicle readiness", "Pilot preview"],
  },
  {
    key: "live-coordination",
    title: "Live coordination across roles",
    description:
      "A representative operations story connecting controllers, drivers and live vehicle state in one shared workflow.",
    image: "/images/case-studies/live-coordination-preview-v1.png",
    alt: "Transport controllers coordinating routes with a tablet and live operations screens",
    tags: ["Transport operations", "Pilot preview"],
  },
] as const;

const comparisonRows = [
  {
    question: "Can this vehicle be assigned?",
    disconnected: "Readiness checked across separate records.",
    connected: "Configured gates use current evidence.",
    risk: "high",
  },
  {
    question: "Is this driver eligible?",
    disconnected: "Expiry and role checks depend on manual review.",
    connected: "Eligibility is checked before assignment.",
    risk: "high",
  },
  {
    question: "What is happening now?",
    disconnected: "Controllers chase updates across calls and messages.",
    connected: "Live duty state is shared by role.",
    risk: "medium",
  },
  {
    question: "What happened to the defect?",
    disconnected: "Damage, maintenance and release decisions are separated.",
    connected: "Defect-to-return-to-service history stays linked.",
    risk: "high",
  },
  {
    question: "Can we retrieve the evidence?",
    disconnected: "Records are assembled after the event.",
    connected: "Checks, actions and ownership retain audit history.",
    risk: "medium",
  },
] as const;

function RevealSection({
  children,
  className = "",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={ref}
      aria-labelledby={labelledBy}
      className={`${className} ${visible ? "reveal is-visible" : "reveal"}`}
    >
      {children}
    </section>
  );
}

function ProductPreview() {
  const [selected, setSelected] = useState<ProductKey>("command");
  const product = productData[selected];

  return (
    <RevealSection
      className="border-t border-veyvio-border bg-white py-20 sm:py-24"
      labelledBy="preview-platform-heading"
    >
      <div className="section-container">
        <div className="grid items-end gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
              The connected ecosystem
            </p>
            <h2 id="preview-platform-heading" className="section-heading mt-3 max-w-xl">
              Every role gets a focused application. Every action stays connected.
            </h2>
          </div>
          <p className="max-w-xl text-lg text-veyvio-muted">
            Explore each application without losing the shared operational story that makes
            Veyvio different from a collection of point tools.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <div className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {(Object.keys(productData) as ProductKey[]).map((key) => {
              const item = productData[key];
              const active = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelected(key);
                    trackEvent("application_card_selected", {
                      section: `homepage_mock_product_${key}`,
                    });
                  }}
                  className={`group flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "border-veyvio-deep bg-veyvio-deep text-white shadow-lg shadow-veyvio-deep/10"
                      : "border-veyvio-border bg-white text-veyvio-deep hover:border-veyvio-teal hover:bg-veyvio-surface"
                  }`}
                >
                  <span>{item.name}</span>
                  <span
                    className={`transition-transform group-hover:translate-x-0.5 ${
                      active ? "text-veyvio-lime" : "text-veyvio-teal"
                    }`}
                    aria-hidden
                  >
                    →
                  </span>
                </button>
              );
            })}
          </div>

          <article className="overflow-hidden rounded-[1.75rem] border border-veyvio-border bg-veyvio-surface shadow-[0_22px_70px_rgba(23,62,72,0.1)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-veyvio-border bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
                  {product.name}
                </p>
                <h3 className="mt-1 font-marketing text-2xl font-bold text-veyvio-deep">
                  {product.title}
                </h3>
              </div>
              <span className="rounded-full bg-veyvio-lime/15 px-3 py-1 text-xs font-semibold text-veyvio-deep">
                {product.badge}
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-veyvio-border border-b border-veyvio-border bg-white">
              {product.stats.map(([label, value]) => (
                <div key={label} className="min-w-0 px-3 py-4 sm:px-6">
                  <span className="block truncate text-xs text-veyvio-muted">{label}</span>
                  <strong className="mt-1 block font-marketing text-xl text-veyvio-deep sm:text-2xl">
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-6">
              <div className="overflow-hidden rounded-2xl border border-veyvio-border bg-white">
                {product.rows.map((row) => (
                  <div
                    key={row.title}
                    className="grid gap-2 border-b border-veyvio-border px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)_auto] sm:items-center"
                  >
                    <strong className="text-sm text-veyvio-deep">{row.title}</strong>
                    <span className="text-sm text-veyvio-muted">{row.detail}</span>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-veyvio-deep">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          row.attention ? "bg-amber-500" : "bg-veyvio-lime"
                        }`}
                        aria-hidden
                      />
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-veyvio-border bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="max-w-xl text-sm text-veyvio-muted">{product.description}</p>
              <Link
                to={product.href}
                className="shrink-0 text-sm font-semibold text-veyvio-teal hover:underline"
              >
                Explore {product.shortName} →
              </Link>
            </div>
          </article>
        </div>

        <div className="mt-16 grid overflow-hidden rounded-2xl border border-veyvio-border bg-white sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Tenant isolated", "Each operator’s data stays properly separated."],
            ["Offline capable", "Frontline work stays clear when signal drops."],
            ["Evidence based", "Readiness comes from configured rules and evidence."],
            ["Audit ready", "Material decisions keep their history and owner."],
          ].map(([title, copy], index) => (
            <div
              key={title}
              className={`p-5 ${
                index < 3 ? "border-b border-veyvio-border lg:border-b-0 lg:border-r" : ""
              } ${index === 1 ? "sm:border-l lg:border-l-0" : ""}`}
            >
              <strong className="font-marketing text-base text-veyvio-deep">{title}</strong>
              <p className="mt-2 text-sm text-veyvio-muted">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function OperatorFit() {
  const [selected, setSelected] = useState<OperatorKey>("community");
  const operator = operatorData[selected];

  return (
    <RevealSection
      className="border-t border-veyvio-border bg-veyvio-surface py-20 sm:py-24"
      labelledBy="operator-fit-heading"
    >
      <div className="section-container">
        <div className="grid items-end gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
              Start with your operation
            </p>
            <h2 id="operator-fit-heading" className="section-heading mt-3 max-w-xl">
              Show visitors the Veyvio journey that fits them.
            </h2>
          </div>
          <p className="max-w-xl text-lg text-veyvio-muted">
            The page can serve different operator types without forcing everyone through the
            same generic feature sequence.
          </p>
        </div>

        <div
          className="mt-10 flex flex-wrap gap-2"
          role="group"
          aria-label="Choose your operation type"
        >
          {(Object.keys(operatorData) as OperatorKey[]).map((key) => {
            const item = operatorData[key];
            const active = key === selected;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelected(key);
                  trackEvent("industry_selected", {
                    section: `homepage_mock_operator_${key}`,
                  });
                }}
                className={`min-h-11 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-veyvio-deep bg-veyvio-deep text-white"
                    : "border-veyvio-border bg-white text-veyvio-deep hover:border-veyvio-teal"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="py-2">
            <p className="text-sm font-semibold text-veyvio-teal">{operator.label}</p>
            <h3 className="mt-3 font-marketing text-3xl font-bold tracking-tight text-veyvio-deep">
              {operator.title}
            </h3>
            <p className="mt-4 text-lg text-veyvio-muted">{operator.description}</p>
            <ul className="mt-7 space-y-3">
              {operator.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-veyvio-deep">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-veyvio-lime/20 text-xs font-bold"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <article className="rounded-[1.75rem] border border-veyvio-border bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-veyvio-muted">
              Recommended connected workflow
            </p>
            <ol className="mt-7 space-y-0">
              {operator.workflow.map(([title, copy], index) => (
                <li key={title} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-veyvio-deep text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    {index < operator.workflow.length - 1 && (
                      <span className="h-12 w-px bg-veyvio-border" aria-hidden />
                    )}
                  </div>
                  <div className="pb-6">
                    <strong className="text-sm text-veyvio-deep">{title}</strong>
                    <p className="mt-1 text-sm text-veyvio-muted">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </RevealSection>
  );
}

function WhatSetsVeyvioApart() {
  const [expanded, setExpanded] = useState<DifferentiatorKey | null>(null);

  return (
    <RevealSection
      className="border-t border-veyvio-border bg-white py-20 sm:py-24 lg:py-28"
      labelledBy="what-sets-veyvio-apart-heading"
    >
      <div className="section-container">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:gap-20 xl:gap-24">
          <div className="min-w-0">
            <h2
              id="what-sets-veyvio-apart-heading"
              className="max-w-[9ch] font-marketing text-4xl font-bold leading-[0.98] tracking-[-0.04em] text-veyvio-deep sm:text-5xl lg:text-[4rem]"
            >
              What sets Veyvio apart
            </h2>
            <div className="mt-10 sm:mt-12 lg:mt-14">
              <img
                src="/images/sections/veyvio-connected-apps-v1.png"
                alt="Veyvio Command, Yard and Driver applications shown together across laptop, tablet and phone"
                width={1448}
                height={1086}
                loading="lazy"
                className="h-auto w-full max-w-[680px]"
              />
            </div>
          </div>

          <div className="border-t border-veyvio-border">
            {differentiators.map((item) => {
              const isExpanded = expanded === item.key;
              const panelId = `differentiator-${item.key}`;

              return (
                <div key={item.key} className="border-b border-veyvio-border">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => {
                      setExpanded(isExpanded ? null : item.key);
                      if (!isExpanded) {
                        trackEvent("solution_selected", {
                          section: `homepage_differentiator_${item.key}`,
                        });
                      }
                    }}
                    className="group flex min-h-[88px] w-full items-center justify-between gap-6 py-6 text-left font-marketing text-xl font-bold leading-tight text-veyvio-deep transition-colors hover:text-veyvio-teal sm:min-h-[98px] sm:text-2xl"
                  >
                    <span>{item.title}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-2xl font-normal transition duration-200 group-hover:border-veyvio-border ${
                        isExpanded ? "rotate-180 bg-veyvio-surface" : ""
                      }`}
                    >
                      ↓
                    </span>
                  </button>
                  <div
                    id={panelId}
                    hidden={!isExpanded}
                    className="max-w-xl pb-7 pr-14 text-base leading-relaxed text-veyvio-muted sm:text-lg"
                  >
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function OperatingModelComparison() {
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const rows = highRiskOnly
    ? comparisonRows.filter((row) => row.risk === "high")
    : comparisonRows;

  return (
    <RevealSection
      className="border-t border-veyvio-border bg-veyvio-deep py-20 text-white sm:py-24"
      labelledBy="operating-model-heading"
    >
      <div className="section-container">
        <div className="grid items-end gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-lime">
              Compare the operating model
            </p>
            <h2
              id="operating-model-heading"
              className="mt-3 max-w-xl font-marketing text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Help buyers compare outcomes, not marketing claims.
            </h2>
          </div>
          <p className="max-w-xl text-lg text-white/70">
            A focused comparison keeps visitors oriented and works cleanly on mobile without a
            dense competitor table.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-white/70">
            Showing {rows.length} workflow {rows.length === 1 ? "gap" : "gaps"}.
          </p>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={highRiskOnly}
              onChange={(event) => setHighRiskOnly(event.target.checked)}
              className="h-4 w-4 accent-veyvio-lime"
            />
            Higher-risk gaps only
          </label>
        </div>

        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-white/15 lg:block">
          <table className="w-full border-collapse text-left">
            <thead className="bg-white/8">
              <tr>
                <th scope="col" className="px-5 py-4 text-sm font-semibold">
                  Operational question
                </th>
                <th scope="col" className="px-5 py-4 text-sm font-semibold">
                  Disconnected process
                </th>
                <th scope="col" className="px-5 py-4 text-sm font-semibold">
                  Connected with Veyvio
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.question} className="border-t border-white/15">
                  <th scope="row" className="px-5 py-5 text-sm font-semibold text-white">
                    {row.question}
                  </th>
                  <td className="px-5 py-5 text-sm text-white/65">{row.disconnected}</td>
                  <td className="px-5 py-5 text-sm text-white">
                    <span className="inline-flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-veyvio-lime" />
                      {row.connected}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 lg:hidden">
          {rows.map((row) => (
            <article key={row.question} className="rounded-2xl border border-white/15 p-5">
              <h3 className="font-marketing text-lg font-bold">{row.question}</h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-white/60">Disconnected process</dt>
                  <dd className="mt-1 text-white/75">{row.disconnected}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-veyvio-lime">Connected with Veyvio</dt>
                  <dd className="mt-1 text-white">{row.connected}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function SolutionFinder() {
  return (
    <RevealSection
      className="border-t border-veyvio-border bg-white py-20 sm:py-24 lg:py-28"
      labelledBy="solution-finder-heading"
    >
      <div className="section-container">
        <article className="overflow-hidden bg-[#269DB4] shadow-[0_24px_80px_rgba(23,62,72,0.14)] lg:grid lg:min-h-[680px] lg:grid-cols-[1.08fr_.92fr]">
          <div className="flex flex-col px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14 lg:py-14 xl:px-16">
            <h2
              id="solution-finder-heading"
              className="max-w-[18ch] font-marketing text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3rem]"
            >
              Find a transport solution that is right for your organisation
            </h2>

            <ol className="mt-10 space-y-5 sm:mt-12">
              {[
                "Book a free discovery call",
                "Tell us about your services, fleet and goals",
                "Explore where Veyvio fits your operation",
                "Choose a clear, controlled next step",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-4 text-base font-semibold sm:text-lg">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-marketing text-sm font-bold text-veyvio-deep">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <Link
              to="/demo"
              className="mt-12 inline-flex min-h-20 w-full max-w-[430px] items-center justify-center rounded-2xl bg-white px-6 py-5 text-center font-marketing text-xl font-bold text-veyvio-deep shadow-lg shadow-veyvio-deep/10 transition hover:-translate-y-0.5 hover:shadow-xl sm:text-2xl lg:mt-auto"
              onClick={() =>
                trackCta("demo_cta_selected", "Request a free consultation", {
                  section: "homepage_solution_finder",
                  ctaPosition: "inline",
                })
              }
            >
              Request a free consultation
            </Link>
          </div>

          <div className="relative min-h-[460px] overflow-hidden bg-veyvio-deep sm:min-h-[560px] lg:min-h-0">
            <img
              src="/images/sections/veyvio-mobile-consultation-v1.png"
              alt="A hand holding a phone showing an accessible Veyvio transport workflow"
              width={1122}
              height={1402}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        </article>
      </div>
    </RevealSection>
  );
}

function PilotAndConversion() {
  const [caseStudyIndex, setCaseStudyIndex] = useState(0);
  const visibleCaseStudies = [
    caseStudyPreviews[caseStudyIndex],
    caseStudyPreviews[(caseStudyIndex + 1) % caseStudyPreviews.length],
  ];

  const showPreviousCaseStudy = () => {
    setCaseStudyIndex(
      (current) => (current - 1 + caseStudyPreviews.length) % caseStudyPreviews.length,
    );
  };

  const showNextCaseStudy = () => {
    setCaseStudyIndex((current) => (current + 1) % caseStudyPreviews.length);
  };

  return (
    <>
      <RevealSection
        className="border-t border-veyvio-border bg-veyvio-surface py-20 sm:py-24"
        labelledBy="pilot-evidence-heading"
      >
        <div className="section-container grid items-center gap-12 lg:grid-cols-[1.08fr_.92fr] lg:gap-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
              Real evidence only
            </p>
            <h2 id="pilot-evidence-heading" className="section-heading mt-3 max-w-2xl">
              Built with real transport operations in mind.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-veyvio-muted">
              Until approved customer outcomes exist, the pilot programme can show how operators
              shape, test and accept the platform—without invented logos, testimonials or scale
              claims.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pilot-programme" className="btn-primary">
                Explore the pilot programme
              </Link>
              <Link to="/trust" className="btn-secondary">
                Review product evidence
              </Link>
            </div>
          </div>

          <ul className="space-y-4">
            {[
              "Workflow discovery grounded in the operator’s real services",
              "Controlled sample data and agreed acceptance criteria",
              "Verified milestones published only when approved",
              "Case studies grouped by operator type when evidence exists",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 rounded-2xl border border-veyvio-border bg-white p-4 text-sm text-veyvio-deep"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-veyvio-lime/20 text-xs font-bold"
                  aria-hidden
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="section-container mt-20 border-t border-veyvio-border pt-16 sm:mt-24 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="font-marketing text-4xl font-bold tracking-[-0.035em] text-veyvio-deep sm:text-5xl">
              Check case studies
            </h3>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-veyvio-muted">
              Explore representative operator stories now. Verified customer outcomes will be
              added only when the evidence is approved.
            </p>
          </div>

          <div
            className="mt-12 grid gap-5 lg:grid-cols-2"
            aria-live="polite"
            aria-label="Case study previews"
          >
            {visibleCaseStudies.map((study, position) => (
              <article
                key={`${study.key}-${position}`}
                className={`overflow-hidden rounded-[1.5rem] border border-veyvio-border bg-white shadow-sm ${
                  position === 1 ? "hidden lg:block" : ""
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-veyvio-deep">
                  <img
                    src={study.image}
                    alt={study.alt}
                    width={1448}
                    height={1086}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
                  />
                  <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-veyvio-deep shadow-sm">
                    Illustrative pilot story
                  </span>
                </div>

                <div className="p-6 sm:p-7">
                  <h4 className="font-marketing text-2xl font-bold tracking-tight text-veyvio-deep">
                    {study.title}
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-veyvio-muted">
                    {study.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {study.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-veyvio-surface px-3 py-1.5 text-xs font-semibold text-veyvio-deep"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-2" aria-label="Case study slide position">
              {caseStudyPreviews.map((study, index) => (
                <button
                  key={study.key}
                  type="button"
                  aria-label={`Show ${study.title}`}
                  aria-current={index === caseStudyIndex ? "true" : undefined}
                  onClick={() => setCaseStudyIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === caseStudyIndex
                      ? "w-9 bg-veyvio-deep"
                      : "w-2.5 bg-veyvio-border hover:bg-veyvio-teal"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                aria-label="Previous case study"
                onClick={showPreviousCaseStudy}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-veyvio-border bg-white text-xl font-semibold text-veyvio-deep transition hover:border-veyvio-teal hover:bg-veyvio-surface"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next case study"
                onClick={showNextCaseStudy}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-veyvio-deep text-xl font-semibold text-white transition hover:bg-veyvio-teal"
              >
                →
              </button>
            </div>
          </div>

          <div className="mt-9 text-center">
            <Link to="/pilot-programme" className="btn-secondary">
              Explore the pilot programme
            </Link>
          </div>
        </div>
      </RevealSection>

      <RevealSection
        className="border-t border-veyvio-border bg-white py-20 sm:py-24"
        labelledBy="preview-final-heading"
      >
        <div className="section-container">
          <div className="overflow-hidden rounded-[2rem] bg-veyvio-deep px-6 py-12 text-white shadow-[0_24px_80px_rgba(23,62,72,0.18)] sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 lg:px-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-lime">
                A tailored next step
              </p>
              <h2
                id="preview-final-heading"
                className="mt-3 max-w-2xl font-marketing text-3xl font-bold tracking-tight sm:text-4xl"
              >
                See how Veyvio could work for your organisation.
              </h2>
              <p className="mt-4 max-w-2xl text-white/70">
                Tell us about your services, fleet and current workflow. The demonstration is
                tailored, uses sample data and carries no obligation.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:justify-end">
              <Link
                to="/demo"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-veyvio-lime px-6 py-2.5 text-sm font-semibold text-veyvio-deep transition hover:bg-veyvio-green"
                onClick={() =>
                  trackCta("demo_cta_selected", "Book a tailored demo", {
                    section: "below_fold_mock",
                    ctaPosition: "final",
                  })
                }
              >
                Book a tailored demo
              </Link>
              <Link
                to="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Contact Veyvio
              </Link>
            </div>
          </div>
        </div>
      </RevealSection>
    </>
  );
}

export function BelowFoldPreview() {
  return (
    <>
      <ProductPreview />
      <OperatorFit />
      <WhatSetsVeyvioApart />
      <OperatingModelComparison />
      <SolutionFinder />
      <PilotAndConversion />
    </>
  );
}
