import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type RouteStepKey =
  | "school"
  | "term"
  | "direction"
  | "pupils"
  | "stops"
  | "crew"
  | "safeguarding"
  | "publish";

type RouteStep = {
  key: RouteStepKey;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  fields: Array<[string, string, "plain" | "pass" | "warn"]>;
};

const routeSteps: RouteStep[] = [
  {
    key: "school",
    number: "01",
    label: "School",
    eyebrow: "The service and its handover point",
    title: "Begin with the school, contract and handover process.",
    copy:
      "Keep the transport entrance, school contact, contract reference, handover procedure and closure process beside the route.",
    accent: "#2498b1",
    fields: [
      ["School", "Oakfield Learning Centre", "plain"],
      ["Transport entrance", "East gate · Bay 2", "plain"],
      ["School contact", "Transport coordinator", "pass"],
      ["Handover process", "Confirmed", "pass"],
    ],
  },
  {
    key: "term",
    number: "02",
    label: "Term",
    eyebrow: "A calendar that understands school work",
    title: "Define the term once and retain its exceptions.",
    copy:
      "Academic year, term dates, operating weekdays, holidays and closures shape a recurring pattern without creating a year of stale jobs.",
    accent: "#7ab82e",
    fields: [
      ["Academic year", "2026 / 27", "plain"],
      ["Term", "Autumn", "plain"],
      ["Operating days", "Monday–Friday", "pass"],
      ["Generation window", "Next 8 weeks", "pass"],
    ],
  },
  {
    key: "direction",
    number: "03",
    label: "Direction",
    eyebrow: "AM and PM are separate truths",
    title: "Give each direction its own timing pattern.",
    copy:
      "Depot departure, required school arrival and afternoon collection can be planned separately while remaining part of the same route version.",
    accent: "#6650bd",
    fields: [
      ["Direction", "AM + PM", "plain"],
      ["Depot departure", "07:12", "plain"],
      ["School arrival", "08:38 required", "warn"],
      ["Afternoon collection", "15:20", "plain"],
    ],
  },
  {
    key: "pupils",
    number: "04",
    label: "Pupils",
    eyebrow: "The roster belongs to the route version",
    title: "Carry the current pupil and guardian context.",
    copy:
      "Select the pupils for this pattern and retain only the authorised passenger, guardian, mobility and communication information needed by each role.",
    accent: "#ef6b5c",
    fields: [
      ["Pupil roster", "12 pupils", "plain"],
      ["Guardians", "Contacts verified", "pass"],
      ["Passenger requirements", "3 route-specific", "warn"],
      ["Information scope", "Purpose-limited", "pass"],
    ],
  },
  {
    key: "stops",
    number: "05",
    label: "Stops",
    eyebrow: "A sequence built from current passengers",
    title: "Turn the roster into an ordered route.",
    copy:
      "Build AM pickups and school drop-off, then retain planned times, dwell and the relationship between each stop and its passenger task.",
    accent: "#e7a331",
    fields: [
      ["AM stops", "8 pickups + school", "plain"],
      ["First pickup", "07:28 · North Avenue", "plain"],
      ["Planned dwell", "3–5 minutes", "plain"],
      ["Travel feasibility", "Review traffic buffer", "warn"],
    ],
  },
  {
    key: "crew",
    number: "06",
    label: "Crew",
    eyebrow: "Preferences become dated assignments later",
    title: "State what the route needs from people and vehicle.",
    copy:
      "Vehicle type, seats, wheelchair spaces and passenger-assistant requirement shape eligibility before a dated duty is assigned.",
    accent: "#2aa8c2",
    fields: [
      ["Vehicle", "Accessible minibus", "plain"],
      ["Seats", "16 required", "pass"],
      ["Wheelchair spaces", "1 required", "warn"],
      ["Passenger assistant", "Required", "warn"],
    ],
  },
  {
    key: "safeguarding",
    number: "07",
    label: "Safeguarding",
    eyebrow: "Sensitive context stays controlled",
    title: "Make handover and escalation unambiguous.",
    copy:
      "Record whether an authorised adult is required, what happens if nobody is present and which confidential instructions reach the assigned frontline role.",
    accent: "#d95568",
    fields: [
      ["Authorised handover", "Required", "warn"],
      ["No adult present", "Escalation process set", "pass"],
      ["Driver instructions", "Restricted to duty", "pass"],
      ["Access events", "Recorded", "pass"],
    ],
  },
  {
    key: "publish",
    number: "08",
    label: "Publish",
    eyebrow: "The pattern becomes controlled work",
    title: "Publish a route version and create dated jobs.",
    copy:
      "Review the school, term, directions, pupils, stops, crew and safeguarding rules before generating the next rolling window of work.",
    accent: "#7ab82e",
    fields: [
      ["Route", "SCH-204 · Version 3", "plain"],
      ["Directions", "AM + PM", "pass"],
      ["Jobs to create", "76 dated jobs", "warn"],
      ["Route state", "Ready to publish", "pass"],
    ],
  },
];

const schoolRunGates = [
  {
    title: "Driver eligible",
    copy: "Configured licence, role, training, safeguarding and school-work requirements are current.",
    result: "Supported",
    colour: "#6650bd",
  },
  {
    title: "Assistant confirmed",
    copy: "The dated duty includes the passenger assistant required by the route pattern.",
    result: "Assigned",
    colour: "#2498b1",
  },
  {
    title: "Vehicle suitable",
    copy: "Seats, accessibility equipment, restrictions and current release state support the work.",
    result: "Ready",
    colour: "#7ab82e",
  },
  {
    title: "Handover understood",
    copy: "The assigned frontline roles receive the authorised procedure and escalation path.",
    result: "Acknowledged",
    colour: "#e7a331",
  },
] as const;

const informationPath = [
  {
    role: "Guardian",
    title: "Known contact",
    copy: "Authorised contact and handover information is held against the passenger record.",
    colour: "#e7a331",
  },
  {
    role: "Controller",
    title: "Complete context",
    copy: "Operations can plan the route, own changes and decide what the duty requires.",
    colour: "#2498b1",
  },
  {
    role: "Driver & assistant",
    title: "Relevant context",
    copy: "The frontline sees the stop, passenger task and instructions needed for this duty.",
    colour: "#6650bd",
  },
  {
    role: "School",
    title: "Controlled handover",
    copy: "Arrival, passenger handover and exceptions become attributable service events.",
    colour: "#7ab82e",
  },
] as const;

const dailyExceptions = [
  ["Pupil absent", "Record the attendance outcome without breaking the rest of the route.", "#e7a331"],
  ["No authorised adult", "Hold the handover and follow the configured escalation process.", "#d95568"],
  ["School closure", "Protect future work through a dated calendar exception.", "#2498b1"],
  ["Vehicle unavailable", "Keep the duty blocked until a suitable ready replacement is supported.", "#7ab82e"],
] as const;

const faqs = [
  {
    question: "How is a school route different from a normal recurring booking?",
    answer:
      "A school route has a dedicated school record, term calendar, AM and PM patterns, pupil roster, guardian and safeguarding context, ordered stops, crew requirements and route versioning. Publishing creates dated operational work from that controlled pattern.",
  },
  {
    question: "Does every user see all pupil and safeguarding information?",
    answer:
      "No. The target design is deny-by-default, field-restricted and purpose-limited. Controllers may need fuller operational context, while a driver or passenger assistant should receive only the information relevant to the assigned duty. Access to sensitive fields should be attributable and auditable.",
  },
  {
    question: "What happens when a pupil or stop changes during term?",
    answer:
      "The route pattern can be versioned so the current roster and stop sequence remain explainable. Future dated work can be regenerated within a controlled rolling window while completed and historical work keeps its original context.",
  },
  {
    question: "How does Yard support Home-to-School work?",
    answer:
      "Yard publishes the current physical state of the vehicle, including location, checks, seats, accessibility equipment, restrictions, defects and VOR. School-specific walkaround items can include seatbelts, emergency contacts, loose objects and accessibility equipment.",
  },
  {
    question: "Does Veyvio replace the operator’s safeguarding responsibilities?",
    answer:
      "No. Veyvio can help restrict information, configure assignment gates, guide authorised workflows and retain evidence. The operator remains responsible for safeguarding, legal, regulatory, employment, contractual and information-governance obligations.",
  },
];

function CheckMark({ colour = "#7ab82e" }: { colour?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.64rem] font-black text-white"
      style={{ backgroundColor: colour }}
    >
      ✓
    </span>
  );
}

function FieldState({ state }: { state: "plain" | "pass" | "warn" }) {
  if (state === "plain") return null;
  return (
    <span
      className={`rounded-full px-2 py-1 text-[0.48rem] font-black uppercase tracking-[.1em] ${
        state === "pass" ? "bg-[#e8f5d6] text-[#466f1d]" : "bg-[#fff0dc] text-[#8d5b18]"
      }`}
    >
      {state === "pass" ? "checked" : "review"}
    </span>
  );
}

function SchoolRoutePreview({ step }: { step: RouteStep }) {
  return (
    <div className="relative min-h-[38rem] overflow-hidden rounded-[2rem] bg-[#eef4f4] p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 size-64 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: step.accent }}
      />
      <div className="relative mx-auto max-w-[35rem] overflow-hidden rounded-[1.5rem] border border-[#d6e1e1] bg-white shadow-[0_30px_75px_rgba(23,62,72,.16)]">
        <div className="flex items-center justify-between border-b border-[#e0e7e7] px-5 py-4">
          <div>
            <p className="text-[0.54rem] font-black uppercase tracking-[.16em]" style={{ color: step.accent }}>
              Create school route
            </p>
            <p className="mt-1 text-sm font-extrabold text-veyvio-deep">SCH-204 · Oakfield</p>
          </div>
          <span className="rounded-full bg-[#f1f5f5] px-3 py-1 text-[0.52rem] font-black uppercase tracking-[.14em] text-veyvio-muted">
            Draft v3
          </span>
        </div>
        <div className="overflow-x-auto border-b border-[#e0e7e7] px-4 py-3">
          <div className="flex min-w-[40rem] items-center gap-1.5">
            {routeSteps.map((item) => {
              const active = item.key === step.key;
              const complete = Number(item.number) < Number(step.number);
              return (
                <div key={item.key} className="flex flex-1 items-center gap-1">
                  <span
                    className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.46rem] font-black ${
                      active ? "text-white" : complete ? "bg-[#e8f5d6] text-[#466f1d]" : "bg-[#edf2f3] text-veyvio-muted"
                    }`}
                    style={active ? { backgroundColor: step.accent } : undefined}
                  >
                    {complete ? "✓" : item.number}
                  </span>
                  <span className={`text-[0.42rem] font-bold ${active ? "text-veyvio-deep" : "text-veyvio-muted"}`}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-[.15em]" style={{ color: step.accent }}>
                Step {step.number}
              </p>
              <h3 className="mt-1.5 font-marketing text-xl font-extrabold text-veyvio-deep">{step.label}</h3>
            </div>
            <span className="rounded-full bg-[#e4f3f6] px-3 py-1 text-[0.52rem] font-bold text-[#276b7c]">Auto-saved</span>
          </div>
          <div className="mt-5 space-y-2.5">
            {step.fields.map(([label, value, state]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-[#dfe7e8] bg-[#fbfcfc] p-4">
                <div>
                  <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
                  <p className="mt-1 text-[0.72rem] font-extrabold text-veyvio-deep">{value}</p>
                </div>
                <FieldState state={state} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" tabIndex={-1} className="rounded-lg border border-[#d7e1e2] px-4 py-2 text-[0.62rem] font-bold text-veyvio-muted">
              Back
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="rounded-lg px-4 py-2 text-[0.62rem] font-extrabold text-white"
              style={{ backgroundColor: step.accent }}
            >
              {step.key === "publish" ? "Publish route" : "Continue"}
            </button>
          </div>
        </div>
      </div>
      <div className="relative -mt-4 ml-auto mr-3 max-w-[17rem] rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-white/55">Route history</p>
        <p className="mt-1 text-sm font-extrabold">Version 3 · step {step.number}</p>
        <p className="mt-1 text-xs text-white/65">Pattern, author and change remain attributable</p>
      </div>
    </div>
  );
}

export function HomeToSchoolPage() {
  const [activeStep, setActiveStep] = useState<RouteStepKey>("school");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const routeReveal = useRevealOnScroll<HTMLElement>();
  const safeguardReveal = useRevealOnScroll<HTMLElement>();
  const yardReveal = useRevealOnScroll<HTMLElement>();
  const exceptionReveal = useRevealOnScroll<HTMLElement>();
  const selectedStep = routeSteps.find((step) => step.key === activeStep) ?? routeSteps[0];

  usePageMeta({
    title: "Home-to-School Transport",
    description:
      "Coordinate school routes, term calendars, pupils, guardians, escorts, safeguarding, vehicle readiness and daily Home-to-School delivery with Veyvio.",
    path: "/industries/home-to-school",
  });

  return (
    <div className="overflow-hidden bg-[#fffdf8]">
      <section className="relative min-h-[calc(100svh-5rem)] bg-veyvio-deep px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
        <div aria-hidden="true" className="absolute -left-24 top-24 size-96 rounded-full bg-[#2498b1]/20 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-9rem] right-[28%] size-96 rounded-full bg-[#e7a331]/15 blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-[#f0bd59]" />
              <p className="text-xs font-black uppercase tracking-[.24em] text-[#f0bd59]">Home-to-School Transport</p>
            </div>
            <h1 className="page-hero-title max-w-[11ch]">
              Every school run. One controlled service record.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/68 sm:text-xl">
              Keep the school, term, pupil, guardian, route, crew, vehicle and authorised handover context connected from pattern to daily duty.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f0bd59] px-7 text-sm font-extrabold text-veyvio-deep shadow-[0_12px_34px_rgba(0,0,0,.22)] transition hover:bg-[#ffd175]"
                onClick={() =>
                  trackCta("demo_cta_selected", "Discuss Home-to-School", {
                    page: "/industries/home-to-school",
                    section: "hero",
                    ctaPosition: "primary",
                  })
                }
              >
                Discuss Home-to-School
              </Link>
              <a href="#school-route" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/22 px-7 text-sm font-extrabold text-white transition hover:bg-white/8">
                Build a route
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {["Term patterns", "Pupil rosters", "Driver & assistant", "Authorised handover"].map((item) => (
                <span key={item} className="rounded-full border border-white/14 bg-white/6 px-3 py-2 text-xs font-bold text-white/72">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.2rem] bg-[#0a3440] shadow-[0_35px_100px_rgba(0,0,0,.35)]">
              <img
                src="/images/case-studies/live-coordination-preview-v1.png"
                alt="A transport operations team coordinating live routes beside an accessible vehicle"
                className="aspect-[1.06/1] w-full object-cover"
              />
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-4">
                {[
                  ["12", "pupils"],
                  ["08:38", "school arrival"],
                  ["Confirmed", "assistant"],
                  ["Ready", "vehicle"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-veyvio-deep/88 p-3 text-white backdrop-blur-md">
                    <span className="font-marketing text-sm font-extrabold sm:text-base">{value}</span>
                    <span className="mt-1 block text-[0.48rem] font-black uppercase tracking-[.1em] text-white/52">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-5 top-8 hidden rounded-2xl bg-[#f0bd59] p-4 text-veyvio-deep shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:block">
              <p className="text-[0.54rem] font-black uppercase tracking-[.16em]">SCH-204 · Version 3</p>
              <p className="mt-1 text-sm font-extrabold">Pattern → dated jobs → duty</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e5dfd3] bg-[#fff7e7] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.76fr_1.24fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#9a6b17]">The operating model</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Plan the pattern. Protect the dated truth.
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["01", "Route pattern", "School, term, roster, stops and requirements"],
              ["02", "Dated jobs", "Current work generated within a rolling window"],
              ["03", "Guided duty", "Assigned people and vehicle deliver the run"],
            ].map(([number, title, copy]) => (
              <article key={number} className="rounded-[1.4rem] bg-white p-6 shadow-[0_15px_45px_rgba(57,43,18,.07)]">
                <p className="text-xs font-black text-[#b27b19]">{number}</p>
                <h3 className="mt-7 font-marketing text-xl font-extrabold text-veyvio-deep">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-veyvio-muted">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="school-route"
        ref={routeReveal.ref}
        className={`reveal px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${routeReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Eight steps, one route version</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Make recurring work explainable.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Select a step to explore how the school route moves from a controlled pattern into the next window of dated operational work.
            </p>
          </div>

          <div role="tablist" aria-label="School route creation steps" className="mt-10 flex gap-2 overflow-x-auto pb-2">
            {routeSteps.map((step) => {
              const active = activeStep === step.key;
              return (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  id={`school-route-tab-${step.key}`}
                  aria-controls={`school-route-panel-${step.key}`}
                  aria-selected={active}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-extrabold transition ${
                    active
                      ? "border-veyvio-deep bg-veyvio-deep text-white"
                      : "border-[#d4dfdf] bg-white text-veyvio-deep hover:border-[#e7a331]"
                  }`}
                  onClick={() => setActiveStep(step.key)}
                >
                  <span className={`text-[0.58rem] ${active ? "text-white/55" : "text-[#b27b19]"}`}>{step.number}</span>
                  {step.label}
                </button>
              );
            })}
          </div>

          <div
            key={selectedStep.key}
            id={`school-route-panel-${selectedStep.key}`}
            role="tabpanel"
            aria-labelledby={`school-route-tab-${selectedStep.key}`}
            className="mt-6 grid overflow-hidden rounded-[2.2rem] border border-[#dce5e5] bg-white shadow-[0_24px_70px_rgba(23,62,72,.08)] lg:grid-cols-[.78fr_1.22fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.64rem] font-black uppercase tracking-[.18em]" style={{ color: selectedStep.accent }}>
                {selectedStep.eyebrow}
              </p>
              <h3 className="mt-4 max-w-[13ch] font-marketing text-3xl font-extrabold leading-tight tracking-[-.04em] text-veyvio-deep sm:text-4xl">
                {selectedStep.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">{selectedStep.copy}</p>
              <div className="mt-9 space-y-3 border-t border-[#e0e6e6] pt-7">
                {[
                  "Save and resume the route without losing context",
                  "Version changes instead of rewriting history",
                  "Generate current work from one controlled pattern",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm font-semibold text-veyvio-muted">
                    <CheckMark colour={selectedStep.accent} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <SchoolRoutePreview step={selectedStep} />
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-veyvio-muted">
            Representative product workflow. Exact school, contract, calendar, safeguarding, eligibility and job-generation rules are agreed and configured during pilot discovery.
          </p>
        </div>
      </section>

      <section
        ref={safeguardReveal.ref}
        className={`reveal bg-veyvio-deep px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8 ${safeguardReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.88fr_1.12fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#f0bd59]">Purpose-limited information</p>
              <h2 className="mt-4 max-w-[14ch] font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                Safeguarding context follows an authorised path.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-white/65 lg:justify-self-end">
              The service record stays whole, while each person sees only the passenger and handover information needed for their role and assigned work.
            </p>
          </div>
          <div className="mt-12 grid gap-3 lg:grid-cols-4">
            {informationPath.map((item, index) => (
              <article key={item.role} className="group min-h-[20rem] rounded-[1.6rem] border border-white/12 bg-white/6 p-6 transition hover:-translate-y-2 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <span className="font-marketing text-sm font-black" style={{ color: item.colour }}>0{index + 1}</span>
                  {index < informationPath.length - 1 ? <span className="text-xl text-white/28">→</span> : null}
                </div>
                <p className="mt-10 text-[0.62rem] font-black uppercase tracking-[.16em]" style={{ color: item.colour }}>{item.role}</p>
                <h3 className="mt-3 font-marketing text-2xl font-extrabold">{item.title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/58">{item.copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#f0bd59]/28 bg-[#f0bd59]/8 p-5">
            <p className="text-sm font-bold text-white">
              Sensitive passenger and safeguarding data should be field-restricted, purpose-limited and logged when viewed—not copied into unrestricted route notes.
            </p>
          </div>
        </div>
      </section>

      <section
        ref={yardReveal.ref}
        className={`reveal border-b border-[#dbe5e2] bg-[#f1f6f3] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${yardReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-veyvio-deep shadow-[0_32px_80px_rgba(23,62,72,.2)]">
            <img
              src="/images/case-studies/vehicle-readiness-preview-v1.png"
              alt="A Yard operative checking the lift on an accessible passenger vehicle"
              className="aspect-[1.1/1] w-full object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-4">
              {[
                ["16", "seats"],
                ["Checked", "seatbelts"],
                ["On board", "contacts"],
                ["Ready", "release"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/15 bg-veyvio-deep/88 p-3 text-white backdrop-blur-md">
                  <p className="font-marketing text-sm font-extrabold">{value}</p>
                  <p className="mt-1 text-[0.48rem] font-black uppercase tracking-[.1em] text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Yard protects the morning release</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              “Available” is not the same as school-run ready.
            </h2>
            <p className="mt-6 text-lg leading-8 text-veyvio-muted">
              Yard’s physical vehicle state can support the assignment decision. Driver checks then confirm the vehicle and school-specific equipment before the duty begins.
            </p>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#d5e1dd] bg-white">
              <div className="border-b border-[#e0e7e4] p-5">
                <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-veyvio-teal">SCH-204 · morning release</p>
              </div>
              {[
                ["Passenger seatbelts", "Required belts available and checked"],
                ["Emergency information", "School and route contacts available"],
                ["Passenger area", "No loose objects or blocked exits"],
                ["Accessibility equipment", "Lift, ramp and restraints ready if required"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0">
                  <div>
                    <p className="text-[0.55rem] font-black uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
                    <p className="mt-1 text-sm font-extrabold text-veyvio-deep">{value}</p>
                  </div>
                  <CheckMark />
                </div>
              ))}
            </div>
            <Link to="/platform/yard" className="btn-primary mt-8">
              Explore Veyvio Yard
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Before the duty is published</p>
              <h2 className="mt-4 max-w-[13ch] font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Check the whole school run—not one person at a time.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Driver, passenger assistant, vehicle and handover requirements need to be supportable together before work reaches the frontline.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {schoolRunGates.map((gate, index) => (
              <article key={gate.title} className="group flex min-h-[19rem] flex-col overflow-hidden rounded-[1.6rem] border border-[#dfe6e7] bg-[#fbfcfc]">
                <div className="h-2 origin-left transition-transform duration-300 group-hover:scale-x-[.38]" style={{ backgroundColor: gate.colour }} />
                <div className="flex flex-1 flex-col p-7">
                  <span className="text-xs font-black" style={{ color: gate.colour }}>0{index + 1}</span>
                  <h3 className="mt-7 font-marketing text-xl font-extrabold text-veyvio-deep">{gate.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-veyvio-muted">{gate.copy}</p>
                  <span className="mt-auto inline-flex w-fit rounded-full bg-[#edf4f1] px-3 py-2 text-[0.58rem] font-black uppercase tracking-[.12em] text-veyvio-deep">
                    {gate.result}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={exceptionReveal.ref}
        className={`reveal border-y border-[#e7dfd0] bg-[#fff7e7] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${exceptionReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-[0_25px_75px_rgba(57,43,18,.08)] lg:grid-cols-[.86fr_1.14fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#9a6b17]">When today differs from the pattern</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Daily changes need an owner and a history.
            </h2>
            <p className="mt-5 text-base leading-7 text-veyvio-muted">
              The route can remain stable while attendance, guardians, closures, timing and vehicles change around a specific dated duty.
            </p>
          </div>
          <div className="grid gap-px bg-[#e6ded0] sm:grid-cols-2">
            {dailyExceptions.map(([title, copy, colour]) => (
              <article key={title} className="bg-[#fffdf9] p-6 sm:p-7">
                <span className="block h-2 w-10 rounded-full" style={{ backgroundColor: colour }} />
                <h3 className="mt-5 font-marketing text-xl font-extrabold text-veyvio-deep">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-veyvio-muted">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f4f7f5] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Before a school-transport pilot</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Questions teams usually ask.
            </h2>
          </div>
          <div className="divide-y divide-[#d1dcda] border-y border-[#d1dcda]">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    <span className="font-marketing text-lg font-extrabold text-veyvio-deep sm:text-xl">{faq.question}</span>
                    <span aria-hidden="true" className={`text-2xl font-light text-veyvio-teal transition ${open ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {open ? <p className="max-w-3xl pb-7 pr-10 text-sm leading-7 text-veyvio-muted sm:text-base">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f0bd59] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#72500f]">Start with one live route</p>
            <h2 className="mt-4 max-w-[17ch] font-marketing text-4xl font-extrabold tracking-[-.045em] text-veyvio-deep sm:text-6xl">
              Map the pattern, gates and handovers together.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-veyvio-deep/72">
              We will trace the school, term, roster, crew, vehicle, information and exception decisions before shaping a controlled Home-to-School pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-deep px-7 text-sm font-extrabold text-white transition hover:bg-[#0f3038]"
              onClick={() =>
                trackCta("final_cta_clicked", "Book a Home-to-School consultation", {
                  page: "/industries/home-to-school",
                  section: "final-cta",
                  ctaPosition: "primary",
                })
              }
            >
              Book a consultation
            </Link>
            <Link to="/industries" className="inline-flex min-h-12 items-center justify-center rounded-full border border-veyvio-deep/24 bg-white/36 px-7 text-sm font-extrabold text-veyvio-deep transition hover:bg-white/58">
              View all industries
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
