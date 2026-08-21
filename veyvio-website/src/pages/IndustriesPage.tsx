import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta, trackEvent } from "@/lib/analytics";

type OperatingModelKey = "community" | "demand" | "school" | "healthcare" | "contracted";

type OperatingModel = {
  key: OperatingModelKey;
  label: string;
  eyebrow: string;
  title: string;
  pressure: string;
  carries: string[];
  flow: Array<[string, string, string]>;
  accent: string;
  tint: string;
};

const sectors = [
  {
    number: "01",
    title: "Community Transport",
    copy: "Connect bookings, passengers, volunteer or employed drivers, vehicles and service evidence without adding another reconciliation task.",
    href: "/industries/community-transport",
    accent: "#7ab82e",
    className: "lg:col-span-2",
  },
  {
    number: "02",
    title: "Dial-a-Ride",
    copy: "Move member requests through eligibility, scheduling and delivery while retaining the passenger context behind the journey.",
    href: "/industries/dial-a-ride",
    accent: "#2498b1",
    className: "",
  },
  {
    number: "03",
    title: "Home-to-School",
    copy: "Coordinate routes, pupils, guardians, escorts, term dates and daily changes around one controlled service record.",
    href: "/industries/home-to-school",
    accent: "#6650bd",
    className: "",
  },
  {
    number: "04",
    title: "SEND Transport",
    copy: "Carry authorised passenger, escort, equipment and vehicle requirements into planning and the frontline duty.",
    href: "/industries/send-transport",
    accent: "#ef6b5c",
    className: "lg:row-span-2",
  },
  {
    number: "05",
    title: "Local Authorities",
    copy: "Give operational teams focused views while retaining a governed history of the service decisions and outcomes they need to evidence.",
    href: "/industries/local-authorities",
    accent: "#173e48",
    className: "",
  },
  {
    number: "06",
    title: "NHS & Healthcare",
    copy: "Coordinate time-sensitive passenger journeys with controlled information, live exceptions and a retrievable completion record.",
    href: "/industries/healthcare-transport",
    accent: "#d95478",
    className: "lg:col-span-2",
  },
  {
    number: "07",
    title: "Charities & Community Organisations",
    copy: "Support lean teams with an operational workflow that is clear enough for daily use and structured enough for governance.",
    href: "/industries/charities",
    accent: "#e7a331",
    className: "",
  },
  {
    number: "08",
    title: "PSV & Contracted Transport",
    copy: "Bring planned work, driver eligibility, vehicle readiness, live delivery and contract evidence into one operational picture.",
    href: "/industries/psv-contracted-transport",
    accent: "#4a8fa3",
    className: "lg:col-span-2",
  },
] as const;

const operatingModels: OperatingModel[] = [
  {
    key: "community",
    label: "Community",
    eyebrow: "Flexible teams · high governance",
    title: "Make a small team feel connected, not stretched.",
    pressure:
      "Requests arrive through different channels, drivers may be volunteers or employees, and every vehicle decision still needs a clear owner.",
    carries: ["Member and passenger context", "Driver availability", "Vehicle and equipment readiness", "Service outcome"],
    flow: [
      ["Command", "Shape the request", "Turn the passenger need into schedulable work."],
      ["Yard", "Support the release", "Confirm the selected vehicle can support the duty."],
      ["Driver", "Deliver with context", "Show the relevant stops, requirements and statuses."],
    ],
    accent: "#7ab82e",
    tint: "#f0f8e5",
  },
  {
    key: "demand",
    label: "Dial-a-Ride",
    eyebrow: "Member requests · demand responsive",
    title: "Keep the request and the resulting job connected.",
    pressure:
      "A flexible request must be assessed, accepted and scheduled without losing accessibility needs, time windows or the reason behind a decision.",
    carries: ["Membership and eligibility", "Journey window", "Wheelchair or lift requirement", "Acceptance decision"],
    flow: [
      ["Command", "Review the request", "Accept, decline or hold with an owned reason."],
      ["Command", "Build the work", "Create compatible jobs, runs and duties."],
      ["Driver", "Return progress", "Record controlled journey states and exceptions."],
    ],
    accent: "#2498b1",
    tint: "#e7f6f8",
  },
  {
    key: "school",
    label: "School & SEND",
    eyebrow: "Repeated routes · safeguarding-sensitive",
    title: "Plan the route once. Control every dated service.",
    pressure:
      "Pupils, guardians, escorts, term dates and passenger requirements change at different speeds, while the daily duty must stay precise.",
    carries: ["Pupil and guardian context", "Escort requirement", "Term and route pattern", "Purpose-limited passenger notes"],
    flow: [
      ["Command", "Generate dated jobs", "Turn the managed route into current operational work."],
      ["Yard", "Match capability", "Check vehicle, access and required equipment."],
      ["Driver", "See what is relevant", "Present stop sequence and authorised context only."],
    ],
    accent: "#6650bd",
    tint: "#f0edfb",
  },
  {
    key: "healthcare",
    label: "Healthcare",
    eyebrow: "Time-sensitive · information controlled",
    title: "Protect the hand-offs around a time-critical journey.",
    pressure:
      "Pickup readiness, mobility support and changing appointment conditions can create exceptions that need fast action without broadening access to sensitive information.",
    carries: ["Required journey window", "Mobility and assistance needs", "Authorised contact context", "Completion evidence"],
    flow: [
      ["Command", "Plan with constraints", "Keep the service requirement beside the work."],
      ["Driver", "Report the exception", "Return controlled status and operational context."],
      ["Command", "Close the loop", "Own follow-up and retain the outcome."],
    ],
    accent: "#d95478",
    tint: "#fbeaf0",
  },
  {
    key: "contracted",
    label: "PSV & contracted",
    eyebrow: "Scheduled work · evidence expected",
    title: "Run locally while retaining a dependable service history.",
    pressure:
      "Controllers need the current plan; depot teams need physical control; managers and commissioners need retrievable evidence after delivery.",
    carries: ["Contract and service rule", "Driver eligibility", "Vehicle release state", "Planned, revised and actual times"],
    flow: [
      ["Command", "Control the plan", "Build feasible work and own live exceptions."],
      ["Yard", "Publish readiness", "Make the physical vehicle state usable by planning."],
      ["Shared record", "Retain the outcome", "Connect checks, changes and completed service."],
    ],
    accent: "#4a8fa3",
    tint: "#e9f2f4",
  },
];

const workflow = [
  ["01", "Capture", "Passenger and service requirements enter through the appropriate booking flow.", "Command"],
  ["02", "Plan", "Requests become compatible jobs, runs, routes and duties.", "Command"],
  ["03", "Prepare", "Location, condition, fuel or charge, equipment and restrictions support the release.", "Yard"],
  ["04", "Deliver", "The frontline receives the sequence, relevant context and controlled statuses.", "Driver"],
  ["05", "Evidence", "Planned, changed and actual states remain connected to the operational record.", "Shared"],
] as const;

const roleViews = [
  {
    role: "Controller",
    title: "Enough context to make the next decision.",
    items: ["Service rule and time window", "Resource eligibility and readiness", "Live exceptions and owned follow-up"],
    accent: "#4a8fa3",
  },
  {
    role: "Yard team",
    title: "Enough context to support a safe release.",
    items: ["Vehicle location and custody", "Checks, condition and equipment", "Restrictions, defects and VOR"],
    accent: "#7ab82e",
  },
  {
    role: "Driver or escort",
    title: "Enough context to deliver the duty.",
    items: ["Stops and sequence", "Relevant passenger requirements", "Controlled statuses and exception reporting"],
    accent: "#6650bd",
  },
] as const;

const faqs = [
  {
    question: "Does Veyvio use the same workflow for every passenger transport service?",
    answer:
      "No. General bookings, Dial-a-Ride requests and managed school routes have different creation flows. They can still create compatible operational work so planning, vehicle readiness, frontline delivery and evidence remain connected.",
  },
  {
    question: "How does passenger information reach the frontline?",
    answer:
      "The target model carries authorised service and passenger requirements with the duty. Access should be purpose-limited, field-restricted and auditable so each role sees the information needed for the work—not the full record.",
  },
  {
    question: "Can rules differ by contract or service type?",
    answer:
      "The blueprint supports configuration by tenant, contract, customer, service type, route, vehicle type and, where lawful, passenger profile. Exact rules and pilot scope are agreed during discovery.",
  },
  {
    question: "Does Veyvio guarantee legal or regulatory compliance?",
    answer:
      "No. Veyvio can help operators configure workflows, checks, evidence and audit controls, but the operator remains responsible for legal, regulatory, safeguarding and contractual obligations.",
  },
];

function CheckMark({ colour = "#7ab82e" }: { colour?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-black text-white"
      style={{ backgroundColor: colour }}
    >
      ✓
    </span>
  );
}

function OperationsPreview({ model }: { model: OperatingModel }) {
  return (
    <div
      className="relative min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_32px_90px_rgba(23,62,72,.15)] sm:p-8"
      style={{ backgroundColor: model.tint }}
    >
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 size-64 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: model.accent }}
      />
      <div className="relative mx-auto max-w-[34rem] overflow-hidden rounded-[1.6rem] border border-[#d6e1e3] bg-white shadow-[0_22px_55px_rgba(23,62,72,.14)]">
        <div className="flex h-12 items-center justify-between border-b border-[#e1e8ea] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: model.accent }} />
            <span className="text-xs font-black tracking-tight text-veyvio-deep">veyvio</span>
          </div>
          <span className="rounded-full bg-[#f2f6f6] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.18em] text-veyvio-muted">
            Live operation
          </span>
        </div>
        <div className="grid min-h-[26rem] grid-cols-[4rem_1fr]">
          <div className="bg-veyvio-deep px-3 py-5">
            <span className="mx-auto block size-8 rounded-xl bg-white/12" />
            {[1, 2, 3, 4, 5].map((item) => (
              <span key={item} className="mx-auto mt-6 block h-1.5 w-7 rounded-full bg-white/20" />
            ))}
          </div>
          <div className="min-w-0 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[.16em]" style={{ color: model.accent }}>
                  {model.label} service
                </p>
                <h3 className="mt-2 font-marketing text-xl font-extrabold text-veyvio-deep">Morning operating picture</h3>
              </div>
              <span className="rounded-full bg-[#eaf5dc] px-3 py-1 text-[0.62rem] font-bold text-veyvio-deep">
                Current
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                ["Services", "18"],
                ["Ready", "16"],
                ["Review", "2"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#dce5e6] p-3">
                  <p className="text-[0.5rem] font-bold uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
                  <p className="mt-1 font-marketing text-lg font-extrabold text-veyvio-deep">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {[
                ["07:30 · North loop", "Vehicle ready", "On time"],
                ["08:05 · East zone", "Escort confirmed", "Ready"],
                ["08:20 · Service 14", "Passenger note updated", "Review"],
              ].map(([service, context, state], index) => (
                <div key={service} className="rounded-xl border border-[#e0e7e8] bg-[#fbfcfc] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.7rem] font-extrabold text-veyvio-deep">{service}</p>
                    <span
                      className="rounded-full px-2 py-1 text-[0.5rem] font-bold"
                      style={{
                        color: index === 2 ? "#9c4d23" : "#315d19",
                        backgroundColor: index === 2 ? "#fff0df" : "#eaf5dc",
                      }}
                    >
                      {state}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.62rem] text-veyvio-muted">{context}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[#c7d7da] p-3">
              <span className="size-2 rounded-full" style={{ backgroundColor: model.accent }} />
              <p className="text-[0.6rem] font-semibold text-veyvio-muted">
                Command, Yard and Driver use the same current service record.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative -mt-5 ml-auto mr-4 max-w-[16rem] rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-white/60">Exception owned</p>
        <p className="mt-1 text-sm font-bold">Pickup requirement changed</p>
        <p className="mt-1 text-xs text-white/70">Controller review · 07:12</p>
      </div>
    </div>
  );
}

export function IndustriesPage() {
  const [activeModel, setActiveModel] = useState<OperatingModelKey>("community");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const atlasReveal = useRevealOnScroll<HTMLElement>();
  const workflowReveal = useRevealOnScroll<HTMLElement>();
  const readinessReveal = useRevealOnScroll<HTMLElement>();
  const selected = operatingModels.find((model) => model.key === activeModel) ?? operatingModels[0];

  usePageMeta({
    title: "Passenger Transport Industries",
    description:
      "Explore how Veyvio connects passenger requirements, planning, vehicle readiness, frontline delivery and evidence across community, school, healthcare and contracted transport.",
    path: "/industries",
  });

  return (
    <div className="overflow-hidden bg-[#fffdfa]">
      <section className="relative border-b border-[#e7e1d8] px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-16 lg:px-8">
        <div aria-hidden="true" className="absolute left-[8%] top-[18%] size-56 rounded-full bg-[#dff0c9] opacity-60 blur-3xl" />
        <div aria-hidden="true" className="absolute right-[4%] top-[8%] size-72 rounded-full bg-[#dbeff3] opacity-70 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-end gap-12 lg:grid-cols-[.86fr_1.14fr]">
            <div className="pb-2 lg:pb-10">
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Passenger transport industries</p>
              <h1 className="mt-6 max-w-[11ch] font-marketing text-[clamp(3.4rem,6.6vw,6.9rem)] font-extrabold leading-[0.9] tracking-[-0.065em] text-veyvio-deep">
                Passenger transport is not one operation.
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-veyvio-muted sm:text-xl">
                One connected platform, configured for community, demand-responsive, school, SEND, healthcare, commissioned and contracted passenger services.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/demo"
                  className="btn-primary"
                  onClick={() =>
                    trackCta("demo_cta_selected", "Discuss your service", {
                      page: "/industries",
                      section: "hero",
                      ctaPosition: "primary",
                    })
                  }
                >
                  Discuss your service
                </Link>
                <a href="#service-atlas" className="btn-secondary">
                  Find your sector
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2.2rem] bg-veyvio-deep shadow-[0_36px_100px_rgba(23,62,72,.22)]">
                <img
                  src="/images/case-studies/community-pilot-preview-v1.png"
                  alt="Passenger transport staff reviewing an operation beside an accessible minibus"
                  className="aspect-[1.18/1] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-veyvio-deep/80 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-4">
                  {["Passenger need", "Driver eligible", "Vehicle ready", "Outcome retained"].map((item, index) => (
                    <div key={item} className="rounded-xl border border-white/20 bg-veyvio-deep/80 p-3 text-white backdrop-blur-md">
                      <span className="block text-[0.55rem] font-black uppercase tracking-[.16em] text-white/55">0{index + 1}</span>
                      <span className="mt-1 block text-xs font-bold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -left-5 top-8 hidden rounded-2xl bg-white p-4 shadow-[0_18px_50px_rgba(23,62,72,.16)] sm:block">
                <p className="text-[0.58rem] font-black uppercase tracking-[.15em] text-veyvio-teal">Connected hand-off</p>
                <p className="mt-1 text-sm font-extrabold text-veyvio-deep">Request → duty → evidence</p>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[#dce4df] bg-[#dce4df] sm:grid-cols-3">
            {[
              ["08", "operating environments"],
              ["03", "role-specific applications"],
              ["01", "shared operational record"],
            ].map(([value, label]) => (
              <div key={label} className="bg-white/90 px-6 py-5">
                <span className="font-marketing text-3xl font-extrabold text-veyvio-deep">{value}</span>
                <span className="ml-3 text-sm font-semibold text-veyvio-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="service-atlas"
        ref={atlasReveal.ref}
        className={`reveal px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${atlasReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Service atlas</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Designed for the realities of passenger transport.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              These services share vehicles, people and governance—but not the same booking model, passenger context or evidence obligation. Each route into Veyvio starts with the genuine operating problem.
            </p>
          </div>

          <div className="mt-12 grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-4">
            {sectors.map((sector) => (
              <Link
                key={sector.title}
                to={sector.href}
                className={`group relative min-h-[19rem] overflow-hidden rounded-[1.6rem] border border-[#e0e5e1] bg-white p-6 shadow-[0_8px_30px_rgba(23,62,72,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(23,62,72,.12)] ${sector.className}`}
                onClick={() => {
                  trackEvent("industry_selected", { page: "/industries", section: "service-atlas" });
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-2 w-24 origin-right transition-all duration-300 group-hover:w-full"
                  style={{ backgroundColor: sector.accent }}
                />
                <div className="flex h-full flex-col">
                  <span className="font-marketing text-sm font-black tracking-[.16em]" style={{ color: sector.accent }}>
                    {sector.number}
                  </span>
                  <h3 className="mt-10 max-w-[12ch] font-marketing text-2xl font-extrabold leading-tight tracking-[-.035em] text-veyvio-deep sm:text-3xl">
                    {sector.title}
                  </h3>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-veyvio-muted">{sector.copy}</p>
                  <span className="mt-auto pt-7 text-sm font-extrabold text-veyvio-deep">
                    Explore the service <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-veyvio-deep px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#8ad0df]">Choose your operating environment</p>
              <h2 className="mt-4 max-w-[13ch] font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                The booking flow changes. The operational truth should not.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-white/68 lg:justify-self-end">
              Explore how different passenger services shape the request—and how one shared record protects the hand-offs that follow.
            </p>
          </div>

          <div role="tablist" aria-label="Passenger transport operating models" className="mt-12 flex gap-2 overflow-x-auto pb-2">
            {operatingModels.map((model) => {
              const active = model.key === activeModel;
              return (
                <button
                  key={model.key}
                  type="button"
                  role="tab"
                  id={`model-tab-${model.key}`}
                  aria-controls={`model-panel-${model.key}`}
                  aria-selected={active}
                  className={`shrink-0 rounded-full border px-5 py-3 text-sm font-extrabold transition ${
                    active ? "border-white bg-white text-veyvio-deep" : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setActiveModel(model.key)}
                >
                  {model.label}
                </button>
              );
            })}
          </div>

          <div
            key={selected.key}
            id={`model-panel-${selected.key}`}
            role="tabpanel"
            aria-labelledby={`model-tab-${selected.key}`}
            className="mt-6 grid overflow-hidden rounded-[2.2rem] bg-[#fffdfa] text-veyvio-ink lg:grid-cols-[.86fr_1.14fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.68rem] font-black uppercase tracking-[.18em]" style={{ color: selected.accent }}>
                {selected.eyebrow}
              </p>
              <h3 className="mt-4 max-w-[12ch] font-marketing text-3xl font-extrabold leading-tight tracking-[-.04em] text-veyvio-deep sm:text-4xl">
                {selected.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">{selected.pressure}</p>

              <div className="mt-8 border-t border-[#e0e5e1] pt-7">
                <p className="text-xs font-black uppercase tracking-[.17em] text-veyvio-deep">What travels with the work</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {selected.carries.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm font-semibold text-veyvio-muted">
                      <CheckMark colour={selected.accent} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {selected.flow.map(([app, title, copy]) => (
                  <div key={`${app}-${title}`} className="grid grid-cols-[5rem_1fr] gap-3 rounded-xl border border-[#e0e5e1] bg-white p-4">
                    <span className="text-[0.62rem] font-black uppercase tracking-[.15em]" style={{ color: selected.accent }}>
                      {app}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-veyvio-deep">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-veyvio-muted">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <OperationsPreview model={selected} />
            </div>
          </div>
        </div>
      </section>

      <section
        ref={workflowReveal.ref}
        className={`reveal bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${workflowReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">One operational thread</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              From passenger request to retained evidence.
            </h2>
            <p className="mt-5 text-lg leading-8 text-veyvio-muted">
              Each application is designed for a different role. The record between them is designed to stay connected.
            </p>
          </div>

          <div className="relative mt-14">
            <div aria-hidden="true" className="absolute bottom-0 left-[1.6rem] top-0 w-px bg-[#cfdcdf] lg:bottom-auto lg:left-0 lg:right-0 lg:top-[2.1rem] lg:h-px lg:w-auto" />
            <div className="relative grid gap-8 lg:grid-cols-5 lg:gap-4">
              {workflow.map(([number, title, copy, app]) => (
                <div key={number} className="grid grid-cols-[3.3rem_1fr] gap-4 lg:block">
                  <span className="relative z-10 inline-flex size-[3.3rem] items-center justify-center rounded-full border-4 border-white bg-veyvio-deep font-marketing text-sm font-black text-white shadow-lg">
                    {number}
                  </span>
                  <div className="pt-1 lg:pt-8">
                    <span className="text-[0.62rem] font-black uppercase tracking-[.17em] text-veyvio-teal">{app}</span>
                    <h3 className="mt-2 font-marketing text-xl font-extrabold text-veyvio-deep">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-veyvio-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        ref={readinessReveal.ref}
        className={`reveal border-y border-[#dfe7e3] bg-[#eef5f2] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${readinessReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-veyvio-deep shadow-[0_32px_80px_rgba(23,62,72,.2)]">
            <img
              src="/images/case-studies/vehicle-readiness-preview-v1.png"
              alt="A yard operative inspecting the accessibility equipment on a minibus"
              className="aspect-[1.12/1] w-full object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/92 p-5 shadow-xl backdrop-blur-md sm:inset-x-7 sm:bottom-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.58rem] font-black uppercase tracking-[.17em] text-veyvio-teal">Yard release</p>
                  <p className="mt-1 font-marketing text-xl font-extrabold text-veyvio-deep">Vehicle supports the planned duty</p>
                </div>
                <span className="rounded-full bg-[#e7f5d3] px-3 py-2 text-xs font-black text-[#436b17]">Ready</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">The vehicle is part of the service</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Yard matters in every passenger journey.
            </h2>
            <p className="mt-6 text-lg leading-8 text-veyvio-muted">
              A planned duty is not deliverable until the physical vehicle supports it. Yard turns location, custody, condition, energy, equipment, defects and restrictions into a current release state Command can use.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Location, bay and custody",
                "Checks and body condition",
                "Fuel, charge and equipment",
                "Defects, restrictions and VOR",
                "Service-specific suitability",
                "Supported release outcome",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl bg-white p-4 text-sm font-bold text-veyvio-deep shadow-[0_6px_20px_rgba(23,62,72,.05)]">
                  <CheckMark />
                  <span>{item}</span>
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
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Purpose-limited by role</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Information should follow the duty—not the person.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Passenger transport can involve sensitive information. The target design keeps fields controlled, presents relevant context to authorised roles and retains access history.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {roleViews.map((view) => (
              <article key={view.role} className="group overflow-hidden rounded-[1.6rem] border border-[#dfe6e7] bg-[#fbfcfc]">
                <div className="h-2 origin-left transition-transform duration-300 group-hover:scale-x-[.35]" style={{ backgroundColor: view.accent }} />
                <div className="p-7 sm:p-8">
                  <span className="text-[0.65rem] font-black uppercase tracking-[.18em]" style={{ color: view.accent }}>
                    {view.role}
                  </span>
                  <h3 className="mt-4 font-marketing text-2xl font-extrabold leading-tight text-veyvio-deep">{view.title}</h3>
                  <div className="mt-7 space-y-3 border-t border-[#e1e7e8] pt-6">
                    {view.items.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm font-semibold text-veyvio-muted">
                        <CheckMark colour={view.accent} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[1.6rem] bg-veyvio-deep p-7 text-white sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-[#8ad0df]">Operator responsibility remains</p>
                <h3 className="mt-3 font-marketing text-2xl font-extrabold sm:text-3xl">
                  Configure the workflow around your service, contract and lawful information model.
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
                  Veyvio can help manage configured rules, evidence and audit controls. It does not replace the operator’s legal, regulatory, safeguarding or contractual responsibilities.
                </p>
              </div>
              <Link to="/trust" className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-veyvio-deep">
                Review trust approach
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e1e8e5] bg-[#f4f7f5] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Questions before a pilot</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              What operators usually ask.
            </h2>
          </div>
          <div className="divide-y divide-[#cfdbd8] border-y border-[#cfdbd8]">
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
                    <span className={`text-2xl font-light text-veyvio-teal transition ${open ? "rotate-45" : ""}`} aria-hidden="true">
                      +
                    </span>
                  </button>
                  {open ? <p className="max-w-3xl pb-7 pr-10 text-sm leading-7 text-veyvio-muted sm:text-base">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#dff0c9] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#4e7d19]">A tailored operating model</p>
            <h2 className="mt-4 max-w-[16ch] font-marketing text-4xl font-extrabold tracking-[-.045em] text-veyvio-deep sm:text-6xl">
              Show us how your passenger service actually runs.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              We will map the booking flow, operational hand-offs, vehicle readiness inputs and evidence expectations before proposing a controlled pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-deep px-7 text-sm font-extrabold text-white transition hover:bg-[#0f3038]"
              onClick={() =>
                trackCta("final_cta_clicked", "Book a consultation", {
                  page: "/industries",
                  section: "final-cta",
                  ctaPosition: "primary",
                })
              }
            >
              Book a consultation
            </Link>
            <Link to="/platform" className="btn-secondary">
              Explore the platform
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
