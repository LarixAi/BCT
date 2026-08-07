import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type ServiceMomentKey = "request" | "plan" | "deliver" | "evidence";

type ServiceMoment = {
  key: ServiceMomentKey;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  facts: Array<[string, string]>;
  queue: Array<[string, string, "ready" | "review" | "active"]>;
};

const serviceMoments: ServiceMoment[] = [
  {
    key: "request",
    number: "01",
    label: "Request",
    eyebrow: "Passenger context enters once",
    title: "Start with the journey the person needs.",
    copy:
      "Capture the service, passenger, pickup, destination, timing, accessibility and contact context in the appropriate booking flow.",
    accent: "#7ab82e",
    facts: [
      ["Request type", "Dial-a-Ride"],
      ["Window", "09:30–10:00"],
      ["Requirement", "Wheelchair space"],
      ["Decision", "Awaiting review"],
    ],
    queue: [
      ["DAR-184 · East zone", "Member request received", "review"],
      ["CT-104 · North loop", "Recurring journey", "ready"],
      ["GRP-28 · Wellbeing group", "8 passengers", "ready"],
    ],
  },
  {
    key: "plan",
    number: "02",
    label: "Plan",
    eyebrow: "People and vehicle meet the work",
    title: "Build a feasible duty before publishing it.",
    copy:
      "Accepted requests become compatible operational jobs. Command can bring timing, driver eligibility, vehicle readiness and service requirements into the assignment decision.",
    accent: "#2498b1",
    facts: [
      ["Jobs", "6"],
      ["Driver", "Eligible"],
      ["Vehicle", "Ready"],
      ["Duty", "Publishable"],
    ],
    queue: [
      ["RUN-24017 · Morning service", "6 jobs · 42 miles", "active"],
      ["Driver · A. Morgan", "MiDAS and role checks current", "ready"],
      ["WX21 FYV · Bay D01", "Equipment supported", "ready"],
    ],
  },
  {
    key: "deliver",
    number: "03",
    label: "Deliver",
    eyebrow: "The frontline sees what matters",
    title: "Give the driver a clear duty, not a bundle of notes.",
    copy:
      "Driver presents today’s work, stop sequence, relevant passenger requirements, messages and controlled journey statuses in one guided mobile flow.",
    accent: "#6650bd",
    facts: [
      ["Duty", "Acknowledged"],
      ["Stops", "6"],
      ["On board", "3"],
      ["Next", "11 minutes"],
    ],
    queue: [
      ["Stop 03 · Community centre", "Passenger on board", "active"],
      ["Stop 04 · Meadow Close", "Mobility note available", "ready"],
      ["Operations message", "Pickup window updated", "review"],
    ],
  },
  {
    key: "evidence",
    number: "04",
    label: "Evidence",
    eyebrow: "The record closes with the service",
    title: "Produce evidence through the work—not before the review.",
    copy:
      "Planned, changed and actual states can remain connected to checks, decisions, exceptions and service outcomes, with access shaped by role.",
    accent: "#ef6b5c",
    facts: [
      ["Completed", "6 of 6"],
      ["Exceptions", "1 resolved"],
      ["Checks", "Linked"],
      ["Outcome", "Retained"],
    ],
    queue: [
      ["RUN-24017", "Duty completed · 14:42", "ready"],
      ["DAR-184", "Pickup change · reason retained", "ready"],
      ["Vehicle handback", "Return check queued", "review"],
    ],
  },
];

const servicePatterns = [
  {
    number: "01",
    title: "Individual journeys",
    copy: "Plan an ordinary or urgent passenger journey with the time, access and assistance requirements attached.",
    detail: "General booking",
    accent: "#7ab82e",
  },
  {
    number: "02",
    title: "Member-based requests",
    copy: "Keep eligibility, membership, flexible windows, mobility needs and the acceptance decision together.",
    detail: "Dial-a-Ride",
    accent: "#2498b1",
  },
  {
    number: "03",
    title: "Recurring services",
    copy: "Create repeated transport work without losing the current passenger, vehicle or driver context.",
    detail: "Recurring pattern",
    accent: "#6650bd",
  },
  {
    number: "04",
    title: "Group transport",
    copy: "Coordinate passengers, pickup points, service requirements and the vehicle that can support the group.",
    detail: "Managed service",
    accent: "#e7a331",
  },
] as const;

const handoffs = [
  {
    role: "Operations",
    title: "Own the decision",
    copy: "Review requests, shape work, publish duties and keep live exceptions visible.",
    items: ["Request and passenger context", "Eligibility and readiness result", "Current service and exception state"],
    accent: "#4a8fa3",
  },
  {
    role: "Driver",
    title: "Deliver with clarity",
    copy: "Receive relevant work and requirements without navigating the full operational record.",
    items: ["Duty and stop sequence", "Authorised passenger requirements", "Controlled progress and handback"],
    accent: "#6650bd",
  },
  {
    role: "Yard",
    title: "Support the release",
    copy: "Make the physical vehicle state usable by the team building the service plan.",
    items: ["Location, keys and custody", "Checks, equipment and energy", "Restrictions, defects and VOR"],
    accent: "#7ab82e",
  },
] as const;

const evidenceItems = [
  ["Booking", "What service was requested and which requirements were authorised."],
  ["Assignment", "Which eligibility and readiness evidence supported the decision."],
  ["Delivery", "What happened, when it changed and who owned the exception."],
  ["Vehicle", "Which checks, equipment and release state supported the duty."],
  ["Outcome", "What was completed and what follow-up remains."],
] as const;

const faqs = [
  {
    question: "Is Veyvio designed only for large community transport operators?",
    answer:
      "No. The platform direction is one configurable core that can support a small charity, a multi-depot operator or a council-run service. The useful pilot scope depends on the team, service mix and hand-offs that create the most risk or duplicated work today.",
  },
  {
    question: "Can volunteer and employed drivers use the same workflow?",
    answer:
      "They can use the same role-specific Driver application while eligibility, training and work rules remain configurable. The exact sign-on checks and permissions should reflect the operator’s roles and policies.",
  },
  {
    question: "How are Dial-a-Ride requests handled?",
    answer:
      "Dial-a-Ride retains a specialised member and request flow for eligibility, flexible windows, mobility needs and acceptance. Accepted requests can create compatible jobs that enter the shared planning and delivery model.",
  },
  {
    question: "Does Veyvio replace the operator’s safeguarding or compliance responsibilities?",
    answer:
      "No. Veyvio can help configure checks, restrict information, record decisions and retain evidence. The operator remains responsible for its legal, safeguarding, regulatory, contractual and governance obligations.",
  },
  {
    question: "Is every capability shown available today?",
    answer:
      "Command, Driver and Yard are presented as pilot products. The exact workflows, rules, data migration and integrations included in a community transport pilot are agreed during discovery.",
  },
];

function Check({ colour = "#7ab82e" }: { colour?: string }) {
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

function Status({ state }: { state: "ready" | "review" | "active" }) {
  const styles =
    state === "ready"
      ? "bg-[#e8f5d6] text-[#466f1d]"
      : state === "active"
        ? "bg-[#e2f2f6] text-[#28677a]"
        : "bg-[#fff0dc] text-[#8d5b18]";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.54rem] font-black uppercase tracking-[.1em] ${styles}`}>
      {state}
    </span>
  );
}

function ServiceDayPreview({ moment }: { moment: ServiceMoment }) {
  return (
    <div className="relative min-h-[35rem] overflow-hidden rounded-[2rem] bg-[#edf4f3] p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: moment.accent }}
      />
      <div className="relative mx-auto max-w-[34rem] overflow-hidden rounded-[1.5rem] border border-[#d6e1e2] bg-white shadow-[0_30px_70px_rgba(23,62,72,.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#e0e8e9] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: moment.accent }} />
            <span className="text-xs font-black text-veyvio-deep">veyvio</span>
          </div>
          <span className="rounded-full bg-[#f3f6f6] px-3 py-1 text-[0.55rem] font-black uppercase tracking-[.16em] text-veyvio-muted">
            Community service
          </span>
        </div>
        <div className="grid min-h-[26rem] grid-cols-[4rem_1fr]">
          <div className="bg-veyvio-deep p-3">
            <span className="mx-auto mt-1 block size-8 rounded-xl bg-white/10" />
            {[1, 2, 3, 4, 5].map((item) => (
              <span key={item} className="mx-auto mt-6 block h-1.5 w-7 rounded-full bg-white/20" />
            ))}
          </div>
          <div className="min-w-0 p-5 sm:p-7">
            <p className="text-[0.58rem] font-black uppercase tracking-[.16em]" style={{ color: moment.accent }}>
              {moment.label} view
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="font-marketing text-xl font-extrabold text-veyvio-deep">Today’s service picture</h3>
              <span className="rounded-full bg-[#e8f5d6] px-3 py-1 text-[0.55rem] font-bold text-[#466f1d]">Current</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {moment.facts.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#dce5e6] p-3">
                  <p className="text-[0.45rem] font-black uppercase tracking-[.1em] text-veyvio-muted">{label}</p>
                  <p className="mt-1 text-[0.7rem] font-extrabold text-veyvio-deep">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {moment.queue.map(([title, detail, state]) => (
                <div key={title} className="rounded-xl border border-[#dfe7e8] bg-[#fbfcfc] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.7rem] font-extrabold text-veyvio-deep">{title}</p>
                      <p className="mt-1 text-[0.6rem] text-veyvio-muted">{detail}</p>
                    </div>
                    <Status state={state} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-[#c9d8da] p-3">
              <span className="size-2 rounded-full" style={{ backgroundColor: moment.accent }} />
              <p className="text-[0.6rem] font-semibold text-veyvio-muted">Last operational update retained with actor and time</p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative -mt-5 ml-auto mr-4 max-w-[17rem] rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.54rem] font-black uppercase tracking-[.16em] text-white/55">Shared hand-off</p>
        <p className="mt-1 text-sm font-extrabold">{moment.label} context is still attached</p>
        <p className="mt-1 text-xs text-white/65">Command · Driver · Yard</p>
      </div>
    </div>
  );
}

export function CommunityTransportPage() {
  const [activeMoment, setActiveMoment] = useState<ServiceMomentKey>("request");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const serviceReveal = useRevealOnScroll<HTMLElement>();
  const handoffReveal = useRevealOnScroll<HTMLElement>();
  const yardReveal = useRevealOnScroll<HTMLElement>();
  const evidenceReveal = useRevealOnScroll<HTMLElement>();
  const selectedMoment = serviceMoments.find((moment) => moment.key === activeMoment) ?? serviceMoments[0];

  usePageMeta({
    title: "Community Transport",
    description:
      "Connect community transport requests, passengers, volunteer or employed drivers, vehicle readiness, daily delivery and service evidence with Veyvio.",
    path: "/industries/community-transport",
  });

  return (
    <div className="overflow-hidden bg-[#fffdfa]">
      <section className="relative min-h-[calc(100svh-5rem)] bg-veyvio-deep px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
        <div aria-hidden="true" className="absolute left-[-8rem] top-20 size-80 rounded-full bg-[#7ab82e]/20 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-10rem] right-[20%] size-96 rounded-full bg-[#2498b1]/20 blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-[#8ad0df]" />
              <p className="text-xs font-black uppercase tracking-[.24em] text-[#8ad0df]">Community transport</p>
            </div>
            <h1 className="page-hero-title max-w-[10ch]">
              Keep every community journey connected.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/72 sm:text-xl">
              Bring requests, passengers, volunteer or employed drivers, vehicle readiness and community-service evidence into one operational flow.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-lime px-7 text-sm font-extrabold text-veyvio-deep shadow-[0_8px_30px_rgba(122,184,46,.25)] transition hover:bg-veyvio-green"
                onClick={() =>
                  trackCta("demo_cta_selected", "Discuss your community service", {
                    page: "/industries/community-transport",
                    section: "hero",
                    ctaPosition: "primary",
                  })
                }
              >
                Discuss your community service
              </Link>
              <a
                href="#service-day"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/8 px-7 text-sm font-extrabold text-white transition hover:bg-white/14"
              >
                Follow a service day
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.2rem] border border-white/12 bg-white/5 shadow-[0_35px_100px_rgba(0,0,0,.28)]">
              <img
                src="/images/case-studies/community-pilot-preview-v1.png"
                alt="A community transport team reviewing an operation beside an accessible minibus"
                className="aspect-[1.15/1] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-veyvio-deep via-veyvio-deep/60 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-3">
                {[
                  ["18", "services today"],
                  ["16", "resources ready"],
                  ["02", "owned reviews"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-[#153740]/88 p-4 backdrop-blur-md">
                    <span className="font-marketing text-2xl font-extrabold text-white">{value}</span>
                    <span className="mt-1 block text-[0.58rem] font-bold uppercase tracking-[.12em] text-white/55">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-5 top-7 hidden rounded-2xl bg-white p-4 text-veyvio-deep shadow-[0_20px_55px_rgba(0,0,0,.2)] sm:block">
              <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-veyvio-teal">Service principle</p>
              <p className="mt-1 text-sm font-extrabold">People first. Evidence built in.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e1e8e4] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Limited resources · high expectations</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.045em] text-veyvio-deep sm:text-5xl">
              Do more with every operational hand-off.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-[#dce4df] bg-[#dce4df] sm:grid-cols-3">
            {[
              ["One", "current service picture"],
              ["Clear", "ownership of exceptions"],
              ["Built-in", "operational evidence"],
            ].map(([value, label]) => (
              <div key={label} className="bg-white px-6 py-6">
                <p className="font-marketing text-2xl font-extrabold text-veyvio-deep">{value}</p>
                <p className="mt-1 text-sm font-semibold text-veyvio-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={serviceReveal.ref}
        className={`reveal px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${serviceReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">A service mix, not one booking type</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Keep the right entry point for every journey.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Community services can be fixed, flexible, individual or shared. Veyvio’s target model keeps specialised creation flows while producing compatible operational work.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {servicePatterns.map((pattern) => (
              <article
                key={pattern.title}
                className="group min-h-[20rem] overflow-hidden rounded-[1.6rem] border border-[#dfe6e2] bg-white shadow-[0_8px_28px_rgba(23,62,72,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(23,62,72,.12)]"
              >
                <div className="h-2 origin-left transition-transform duration-300 group-hover:scale-x-[.35]" style={{ backgroundColor: pattern.accent }} />
                <div className="flex h-[calc(100%-0.5rem)] flex-col p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-marketing text-sm font-black tracking-[.16em]" style={{ color: pattern.accent }}>
                      {pattern.number}
                    </span>
                    <span className="rounded-full bg-[#f2f5f4] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.12em] text-veyvio-muted">
                      {pattern.detail}
                    </span>
                  </div>
                  <h3 className="mt-10 font-marketing text-2xl font-extrabold tracking-[-.035em] text-veyvio-deep">{pattern.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-veyvio-muted">{pattern.copy}</p>
                  <span className="mt-auto pt-7 text-xs font-extrabold uppercase tracking-[.13em]" style={{ color: pattern.accent }}>
                    Connected after acceptance
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="service-day" className="bg-[#eef5f2] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Follow one community service day</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              The passenger story stays attached.
            </h2>
            <p className="mt-5 text-lg leading-8 text-veyvio-muted">
              Select a moment to see how the same operational context moves from request to planning, frontline delivery and retained evidence.
            </p>
          </div>

          <div role="tablist" aria-label="Community transport service moments" className="mt-10 flex gap-2 overflow-x-auto pb-2">
            {serviceMoments.map((moment) => {
              const active = moment.key === activeMoment;
              return (
                <button
                  key={moment.key}
                  type="button"
                  role="tab"
                  id={`moment-tab-${moment.key}`}
                  aria-controls={`moment-panel-${moment.key}`}
                  aria-selected={active}
                  className={`flex shrink-0 items-center gap-3 rounded-full border px-5 py-3 text-sm font-extrabold transition ${
                    active
                      ? "border-veyvio-deep bg-veyvio-deep text-white"
                      : "border-[#ccd9d6] bg-white text-veyvio-deep hover:border-veyvio-teal"
                  }`}
                  onClick={() => setActiveMoment(moment.key)}
                >
                  <span className={`text-[0.62rem] ${active ? "text-white/55" : "text-veyvio-teal"}`}>{moment.number}</span>
                  {moment.label}
                </button>
              );
            })}
          </div>

          <div
            key={selectedMoment.key}
            id={`moment-panel-${selectedMoment.key}`}
            role="tabpanel"
            aria-labelledby={`moment-tab-${selectedMoment.key}`}
            className="mt-6 grid overflow-hidden rounded-[2.2rem] bg-white shadow-[0_24px_70px_rgba(23,62,72,.1)] lg:grid-cols-[.78fr_1.22fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.65rem] font-black uppercase tracking-[.18em]" style={{ color: selectedMoment.accent }}>
                {selectedMoment.eyebrow}
              </p>
              <h3 className="mt-4 max-w-[12ch] font-marketing text-3xl font-extrabold leading-tight tracking-[-.04em] text-veyvio-deep sm:text-4xl">
                {selectedMoment.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">{selectedMoment.copy}</p>
              <div className="mt-9 space-y-3 border-t border-[#e1e7e5] pt-7">
                {[
                  ["The requirement", "remains connected to the work."],
                  ["The decision", "has a clear operational owner."],
                  ["The outcome", "can be reviewed after delivery."],
                ].map(([title, copy]) => (
                  <div key={title} className="flex items-start gap-3">
                    <Check colour={selectedMoment.accent} />
                    <p className="text-sm leading-6 text-veyvio-muted">
                      <strong className="text-veyvio-deep">{title}</strong> {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <ServiceDayPreview moment={selectedMoment} />
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-veyvio-muted">
            Representative workflow preview. Exact processes, rules and available integrations are agreed during pilot discovery.
          </p>
        </div>
      </section>

      <section
        ref={handoffReveal.ref}
        className={`reveal bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${handoffReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Three role-specific applications</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                One hand-off should not create three versions of the truth.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Command, Driver and Yard present different work to different teams while using the same current operating record.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {handoffs.map((handoff) => (
              <article key={handoff.role} className="rounded-[1.7rem] border border-[#dfe6e7] bg-[#fbfcfc] p-7 sm:p-8">
                <span className="inline-flex rounded-full px-4 py-2 text-[0.65rem] font-black uppercase tracking-[.16em] text-white" style={{ backgroundColor: handoff.accent }}>
                  {handoff.role}
                </span>
                <h3 className="mt-7 font-marketing text-2xl font-extrabold text-veyvio-deep">{handoff.title}</h3>
                <p className="mt-3 text-sm leading-6 text-veyvio-muted">{handoff.copy}</p>
                <div className="mt-7 space-y-3 border-t border-[#e0e7e8] pt-6">
                  {handoff.items.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-semibold text-veyvio-muted">
                      <Check colour={handoff.accent} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={yardReveal.ref}
        className={`reveal border-y border-[#dce5e1] bg-[#f2f6f4] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${yardReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-veyvio-deep shadow-[0_32px_80px_rgba(23,62,72,.2)]">
            <img
              src="/images/case-studies/vehicle-readiness-preview-v1.png"
              alt="A yard operative checking the accessible ramp of a community minibus"
              className="aspect-[1.12/1] w-full object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/94 p-5 shadow-xl backdrop-blur-md sm:inset-x-7 sm:bottom-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-veyvio-teal">Service match</p>
                  <p className="mt-1 font-marketing text-lg font-extrabold text-veyvio-deep sm:text-xl">Wheelchair equipment supported</p>
                </div>
                <span className="rounded-full bg-[#e7f5d3] px-3 py-2 text-xs font-black text-[#426c16]">Ready</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">The passenger promise reaches the vehicle</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              “Available” is not the same as ready for this journey.
            </h2>
            <p className="mt-6 text-lg leading-8 text-veyvio-muted">
              Yard can connect physical location, custody, checks, body condition, fuel or charge, equipment, defects and restrictions to a supported release outcome.
            </p>
            <div className="mt-8 rounded-[1.4rem] border border-[#d7e1dd] bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[.16em] text-veyvio-deep">Assignment gate example</p>
              <div className="mt-5 space-y-4">
                {[
                  ["Passenger need", "Wheelchair space required", "#2498b1"],
                  ["Vehicle capability", "Capacity and restraint set confirmed", "#7ab82e"],
                  ["Release result", "Supported for this duty", "#6650bd"],
                ].map(([label, value, colour]) => (
                  <div key={label} className="grid grid-cols-[.8rem_1fr] gap-3">
                    <span className="mt-1.5 size-2 rounded-full" style={{ backgroundColor: colour }} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
                      <p className="mt-1 text-sm font-extrabold text-veyvio-deep">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/platform/yard" className="btn-primary mt-8">
              Explore Veyvio Yard
            </Link>
          </div>
        </div>
      </section>

      <section
        ref={evidenceReveal.ref}
        className={`reveal bg-veyvio-deep px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8 ${evidenceReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#8ad0df]">Governance without the scramble</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
              Evidence should be a by-product of good operations.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/68">
              Keep the record of what was requested, checked, changed and delivered close to the operational work—ready for authorised review by leaders, funders or commissioning teams.
            </p>
            <div className="mt-8 space-y-3">
              {evidenceItems.map(([title, copy], index) => (
                <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 rounded-xl border border-white/12 bg-white/5 p-4">
                  <span className="font-marketing text-xs font-black text-[#8ad0df]">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-extrabold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/60">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10">
            <img
              src="/images/case-studies/live-coordination-preview-v1.png"
              alt="Community transport controllers coordinating a live service"
              className="aspect-[1.08/1] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-veyvio-deep via-transparent to-transparent" />
            <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-veyvio-deep/88 p-5 backdrop-blur-md">
              <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#8ad0df]">Pilot evidence view</p>
              <p className="mt-2 font-marketing text-xl font-extrabold">Service outcome, exception and vehicle record remain connected.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Before a community transport pilot</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Questions operators usually ask.
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
                    <span aria-hidden="true" className={`text-2xl font-light text-veyvio-teal transition ${open ? "rotate-45" : ""}`}>
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
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#4e7d19]">Start with the real service</p>
            <h2 className="mt-4 max-w-[17ch] font-marketing text-4xl font-extrabold tracking-[-.045em] text-veyvio-deep sm:text-6xl">
              Map one journey from request to evidence.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              We will identify the hand-offs, duplicated work, readiness inputs and governance evidence that matter before agreeing a controlled pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-deep px-7 text-sm font-extrabold text-white transition hover:bg-[#0f3038]"
              onClick={() =>
                trackCta("final_cta_clicked", "Book a community transport consultation", {
                  page: "/industries/community-transport",
                  section: "final-cta",
                  ctaPosition: "primary",
                })
              }
            >
              Book a consultation
            </Link>
            <Link to="/industries" className="btn-secondary">
              View all industries
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
