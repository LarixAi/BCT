import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type RequestStepKey = "member" | "journey" | "schedule" | "requirements" | "checks" | "accept";

type RequestStep = {
  key: RequestStepKey;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  fields: Array<[string, string, "plain" | "pass" | "warn"]>;
};

const requestSteps: RequestStep[] = [
  {
    key: "member",
    number: "01",
    label: "Member",
    eyebrow: "Eligibility before acceptance",
    title: "Start with the member and their current entitlement.",
    copy:
      "Search by name or member number, review the service zone and current eligibility, then use approved profile defaults to begin the request.",
    accent: "#2498b1",
    fields: [
      ["Member", "Member 0184 · East zone", "plain"],
      ["Eligibility", "Current to 30 Sep", "pass"],
      ["Mobility profile", "Approved transport profile", "plain"],
      ["Request state", "Draft", "warn"],
    ],
  },
  {
    key: "journey",
    number: "02",
    label: "Journey",
    eyebrow: "The journey in operational terms",
    title: "Capture where the passenger needs to go.",
    copy:
      "Keep pickup, destination, return or multi-leg context and the purpose of the service beside the request.",
    accent: "#4a8fa3",
    fields: [
      ["Pickup", "Meadow Close", "plain"],
      ["Destination", "Community centre", "plain"],
      ["Journey", "Outbound + return", "plain"],
      ["Distance", "7.8 miles estimated", "plain"],
    ],
  },
  {
    key: "schedule",
    number: "03",
    label: "Schedule",
    eyebrow: "Flexible without becoming vague",
    title: "Define the useful service window.",
    copy:
      "Record the travel date, flexible pickup window, appointment or arrival constraint and recurrence where the service allows it.",
    accent: "#6650bd",
    fields: [
      ["Travel date", "Tuesday 28 July", "plain"],
      ["Pickup window", "09:30–10:00", "plain"],
      ["Return", "14:00–14:30", "plain"],
      ["Flexibility", "± 15 minutes", "pass"],
    ],
  },
  {
    key: "requirements",
    number: "04",
    label: "Requirements",
    eyebrow: "Profile defaults, journey-specific truth",
    title: "Carry the right assistance into this journey.",
    copy:
      "Companion, carer, wheelchair, mobility aid, passenger lift, boarding assistance, luggage and communication needs can be confirmed per request.",
    accent: "#ef6b5c",
    fields: [
      ["Wheelchair", "Required", "warn"],
      ["Passenger lift", "Required", "warn"],
      ["Companion", "Travelling", "plain"],
      ["Communication", "Call on arrival", "plain"],
    ],
  },
  {
    key: "checks",
    number: "05",
    label: "Checks",
    eyebrow: "Explainable service decision",
    title: "Check the service before promising it.",
    copy:
      "Evaluate eligibility, service zone, capacity and configured booking rules. Warnings and blockers remain visible instead of disappearing into a manual note.",
    accent: "#e7a331",
    fields: [
      ["Member eligibility", "Pass", "pass"],
      ["Service zone", "Pass", "pass"],
      ["Vehicle capacity", "Review wheelchair space", "warn"],
      ["Result", "Eligible with warning", "warn"],
    ],
  },
  {
    key: "accept",
    number: "06",
    label: "Accept",
    eyebrow: "The decision creates the work",
    title: "Accept the request and create compatible jobs.",
    copy:
      "Review the member, date, windows, journey and service-check result. If an authorised override is needed, retain the reason with the decision.",
    accent: "#7ab82e",
    fields: [
      ["Outbound job", "09:30 pickup", "pass"],
      ["Return job", "14:00 pickup", "pass"],
      ["Override", "Not required", "pass"],
      ["Request", "Ready to accept", "pass"],
    ],
  },
];

const decisionChecks = [
  {
    title: "Member eligible?",
    copy: "Current entitlement, service zone and policy conditions.",
    result: "Pass",
    tone: "pass",
  },
  {
    title: "Journey supportable?",
    copy: "Pickup, destination, time window and configured service rule.",
    result: "Pass",
    tone: "pass",
  },
  {
    title: "Capacity available?",
    copy: "Passenger, companion, wheelchair and vehicle-space requirement.",
    result: "Review",
    tone: "warn",
  },
  {
    title: "Decision authorised?",
    copy: "Acceptance or override with owner, reason and time retained.",
    result: "Owned",
    tone: "active",
  },
] as const;

const frontlineViews = [
  {
    role: "Controller",
    title: "See the whole service decision.",
    items: ["Request and eligibility result", "Flexible pickup and return windows", "Capacity, assignment and exceptions"],
    accent: "#2498b1",
  },
  {
    role: "Driver",
    title: "See what is needed for this duty.",
    items: ["Stop sequence and timing", "Authorised assistance requirements", "Controlled journey statuses"],
    accent: "#6650bd",
  },
  {
    role: "Yard",
    title: "See what the vehicle must support.",
    items: ["Required capacity and equipment", "Current checks and restrictions", "Supported release outcome"],
    accent: "#7ab82e",
  },
] as const;

const liveExceptions = [
  ["Passenger not ready", "Keep the wait, contact and outcome in the journey record.", "#e7a331"],
  ["Pickup window changed", "Return the change to the controller with an owned decision.", "#2498b1"],
  ["Vehicle unavailable", "Protect the work until an eligible replacement is supported.", "#ef6b5c"],
  ["Connectivity lost", "Make queued frontline actions and sync state explicit.", "#6650bd"],
] as const;

const faqs = [
  {
    question: "What is the difference between a Dial-a-Ride request and a job?",
    answer:
      "The request captures member, journey, timing and requirement context and passes through service checks. Jobs are the operational work created after the request is accepted. This preserves the decision boundary while allowing accepted work to enter shared planning and delivery.",
  },
  {
    question: "Can passenger requirements change for a single journey?",
    answer:
      "Yes. Approved member-profile defaults can start the request, while journey-specific companion, carer, wheelchair, lift, assistance, luggage or communication requirements can be confirmed for that trip.",
  },
  {
    question: "What happens when a service check returns a warning or blocker?",
    answer:
      "The outcome and explanation remain visible. Depending on the configured rule and the user’s authority, the request may require review, be prevented from acceptance or use a controlled override with a retained reason.",
  },
  {
    question: "How does Yard affect a Dial-a-Ride assignment?",
    answer:
      "Yard supplies the current physical vehicle state: location, checks, equipment, wheelchair capacity, restrictions, defects and VOR. Command can use that supported state when deciding whether a vehicle matches the accepted work.",
  },
  {
    question: "Does Veyvio determine whether our service is legally compliant?",
    answer:
      "No. Veyvio can help configure service checks, information access, evidence and audit controls, but the operator remains responsible for legal, regulatory, safeguarding, contractual and eligibility policies.",
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

function RequestPreview({ step }: { step: RequestStep }) {
  return (
    <div className="relative min-h-[37rem] overflow-hidden rounded-[2rem] bg-[#edf5f7] p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 size-64 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: step.accent }}
      />
      <div className="relative mx-auto max-w-[34rem] overflow-hidden rounded-[1.5rem] border border-[#d5e1e4] bg-white shadow-[0_30px_75px_rgba(23,62,72,.17)]">
        <div className="flex items-center justify-between border-b border-[#dfe8ea] px-5 py-4">
          <div>
            <p className="text-[0.54rem] font-black uppercase tracking-[.16em]" style={{ color: step.accent }}>
              New Dial-a-Ride request
            </p>
            <p className="mt-1 text-sm font-extrabold text-veyvio-deep">Member request · DAR-184</p>
          </div>
          <span className="rounded-full bg-[#f1f5f5] px-3 py-1 text-[0.52rem] font-black uppercase tracking-[.14em] text-veyvio-muted">
            Draft
          </span>
        </div>
        <div className="overflow-x-auto border-b border-[#dfe8ea] px-4 py-3">
          <div className="flex min-w-[31rem] items-center gap-1.5">
            {requestSteps.map((item) => {
              const active = item.key === step.key;
              const complete = Number(item.number) < Number(step.number);
              return (
                <div key={item.key} className="flex flex-1 items-center gap-1.5">
                  <span
                    className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.52rem] font-black ${
                      active ? "text-white" : complete ? "bg-[#e8f5d6] text-[#466f1d]" : "bg-[#edf2f3] text-veyvio-muted"
                    }`}
                    style={active ? { backgroundColor: step.accent } : undefined}
                  >
                    {complete ? "✓" : item.number}
                  </span>
                  <span className={`text-[0.48rem] font-bold ${active ? "text-veyvio-deep" : "text-veyvio-muted"}`}>{item.label}</span>
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
              {step.key === "accept" ? "Accept and create jobs" : "Continue"}
            </button>
          </div>
        </div>
      </div>
      <div className="relative -mt-4 ml-auto mr-3 max-w-[16rem] rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-white/55">Decision history</p>
        <p className="mt-1 text-sm font-extrabold">Step {step.number} retained</p>
        <p className="mt-1 text-xs text-white/65">Actor, time and outcome stay attributable</p>
      </div>
    </div>
  );
}

export function DialARidePage() {
  const [activeStep, setActiveStep] = useState<RequestStepKey>("member");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const requestReveal = useRevealOnScroll<HTMLElement>();
  const decisionReveal = useRevealOnScroll<HTMLElement>();
  const yardReveal = useRevealOnScroll<HTMLElement>();
  const rolesReveal = useRevealOnScroll<HTMLElement>();
  const selectedStep = requestSteps.find((step) => step.key === activeStep) ?? requestSteps[0];

  usePageMeta({
    title: "Dial-a-Ride",
    description:
      "Coordinate member eligibility, flexible journey requests, passenger requirements, service checks, vehicle readiness and live Dial-a-Ride delivery with Veyvio.",
    path: "/industries/dial-a-ride",
  });

  return (
    <div className="overflow-hidden bg-[#fffdfa]">
      <section className="relative min-h-[calc(100svh-5rem)] bg-[#e8f6f8] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div aria-hidden="true" className="absolute -left-20 top-20 size-80 rounded-full bg-white/70 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-8rem] right-[32%] size-80 rounded-full bg-[#cfe9c0]/55 blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center gap-12 lg:grid-cols-[.92fr_1.08fr]">
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-[#2498b1]" />
              <p className="text-xs font-black uppercase tracking-[.24em] text-[#247e94]">Dial-a-Ride</p>
            </div>
            <h1 className="page-hero-title max-w-[11ch] text-veyvio-deep">
              Flexible for passengers. Controlled for operations.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-veyvio-muted sm:text-xl">
              Turn a member’s flexible journey request into accepted, supportable work without losing eligibility, mobility, timing or decision context.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-deep px-7 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(23,62,72,.18)] transition hover:bg-[#0f3038]"
                onClick={() =>
                  trackCta("demo_cta_selected", "Discuss Dial-a-Ride", {
                    page: "/industries/dial-a-ride",
                    section: "hero",
                    ctaPosition: "primary",
                  })
                }
              >
                Discuss Dial-a-Ride
              </Link>
              <a href="#request-flow" className="btn-secondary">
                Follow a request
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {["Member eligibility", "Flexible windows", "Mobility needs", "Service checks"].map((item) => (
                <span key={item} className="rounded-full border border-[#bfd8dd] bg-white/60 px-3 py-2 text-xs font-bold text-veyvio-deep">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.2rem] bg-[#083b4b] shadow-[0_35px_100px_rgba(23,62,72,.25)]">
              <img
                src="/images/sections/veyvio-mobile-consultation-v1.png"
                alt="A mobile view of an accessible Dial-a-Ride journey"
                className="aspect-[1.08/1] w-full object-cover object-[50%_35%]"
              />
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-3">
                {[
                  ["09:30–10:00", "pickup window"],
                  ["WAV", "vehicle need"],
                  ["Eligible", "service result"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-[#0c3c4a]/88 p-4 text-white backdrop-blur-md">
                    <span className="font-marketing text-base font-extrabold sm:text-xl">{value}</span>
                    <span className="mt-1 block text-[0.54rem] font-black uppercase tracking-[.12em] text-white/55">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-5 top-8 hidden rounded-2xl bg-white p-4 shadow-[0_20px_55px_rgba(23,62,72,.18)] sm:block">
              <p className="text-[0.54rem] font-black uppercase tracking-[.16em] text-veyvio-teal">Request DAR-184</p>
              <p className="mt-1 text-sm font-extrabold text-veyvio-deep">Member → check → accepted jobs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dce6e5] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">A deliberate decision boundary</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              A request is not a job yet.
            </h2>
          </div>
          <div className="rounded-[1.7rem] bg-veyvio-deep p-7 text-white sm:p-9">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[.16em] text-[#8ad0df]">Before acceptance</p>
                <p className="mt-2 font-marketing text-2xl font-extrabold">Member request</p>
                <p className="mt-2 text-sm leading-6 text-white/62">Eligibility, journey, windows and requirements remain reviewable.</p>
              </div>
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-white text-xl font-black text-veyvio-deep">→</span>
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[.16em] text-[#aee26c]">After acceptance</p>
                <p className="mt-2 font-marketing text-2xl font-extrabold">Operational jobs</p>
                <p className="mt-2 text-sm leading-6 text-white/62">Compatible work enters planning, assignment and frontline delivery.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="request-flow"
        ref={requestReveal.ref}
        className={`reveal px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${requestReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Six steps, one explainable request</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Keep flexibility structured.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Select a step to explore the information and decision logic that carries a member request into deliverable work.
            </p>
          </div>

          <div role="tablist" aria-label="Dial-a-Ride request steps" className="mt-10 flex gap-2 overflow-x-auto pb-2">
            {requestSteps.map((step) => {
              const active = activeStep === step.key;
              return (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  id={`request-tab-${step.key}`}
                  aria-controls={`request-panel-${step.key}`}
                  aria-selected={active}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-extrabold transition ${
                    active
                      ? "border-veyvio-deep bg-veyvio-deep text-white"
                      : "border-[#d4dfdf] bg-white text-veyvio-deep hover:border-veyvio-teal"
                  }`}
                  onClick={() => setActiveStep(step.key)}
                >
                  <span className={`text-[0.58rem] ${active ? "text-white/55" : "text-veyvio-teal"}`}>{step.number}</span>
                  {step.label}
                </button>
              );
            })}
          </div>

          <div
            key={selectedStep.key}
            id={`request-panel-${selectedStep.key}`}
            role="tabpanel"
            aria-labelledby={`request-tab-${selectedStep.key}`}
            className="mt-6 grid overflow-hidden rounded-[2.2rem] border border-[#dce5e5] bg-white shadow-[0_24px_70px_rgba(23,62,72,.08)] lg:grid-cols-[.78fr_1.22fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.64rem] font-black uppercase tracking-[.18em]" style={{ color: selectedStep.accent }}>
                {selectedStep.eyebrow}
              </p>
              <h3 className="mt-4 max-w-[12ch] font-marketing text-3xl font-extrabold leading-tight tracking-[-.04em] text-veyvio-deep sm:text-4xl">
                {selectedStep.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">{selectedStep.copy}</p>
              <div className="mt-9 space-y-3 border-t border-[#e0e6e6] pt-7">
                {[
                  "Save and resume without losing request context",
                  "Keep the current step and decision visible",
                  "Retain the outcome when the request moves forward",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm font-semibold text-veyvio-muted">
                    <CheckMark colour={selectedStep.accent} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <RequestPreview step={selectedStep} />
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-veyvio-muted">
            Representative workflow preview. Exact eligibility, capacity, service-zone and override rules are configured with the operator during pilot discovery.
          </p>
        </div>
      </section>

      <section
        ref={decisionReveal.ref}
        className={`reveal bg-veyvio-deep px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8 ${decisionReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#8ad0df]">Service checks before the promise</p>
              <h2 className="mt-4 max-w-[14ch] font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                Let the controller see why a request can move.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-white/65 lg:justify-self-end">
              A useful gate is more than red or green. It shows the evidence, the rule and the next operational owner.
            </p>
          </div>

          <div className="mt-12 grid gap-3 lg:grid-cols-4">
            {decisionChecks.map((check, index) => (
              <article key={check.title} className="flex min-h-[18rem] flex-col rounded-[1.5rem] border border-white/12 bg-white/6 p-6">
                <span className="font-marketing text-sm font-black text-[#8ad0df]">0{index + 1}</span>
                <h3 className="mt-8 font-marketing text-xl font-extrabold">{check.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{check.copy}</p>
                <span
                  className={`mt-auto inline-flex w-fit rounded-full px-3 py-2 text-[0.6rem] font-black uppercase tracking-[.12em] ${
                    check.tone === "pass"
                      ? "bg-[#dff2c6] text-[#426817]"
                      : check.tone === "warn"
                        ? "bg-[#ffe7bd] text-[#815315]"
                        : "bg-[#d9eff4] text-[#286779]"
                  }`}
                >
                  {check.result}
                </span>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#ef6b5c]/35 bg-[#ef6b5c]/10 p-5">
            <p className="text-sm font-bold text-white">
              A controlled override should never hide the failed rule: authority, reason and time remain part of the decision record.
            </p>
          </div>
        </div>
      </section>

      <section
        ref={yardReveal.ref}
        className={`reveal border-b border-[#dbe5e2] bg-[#f1f6f3] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${yardReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-veyvio-deep shadow-[0_32px_80px_rgba(23,62,72,.2)]">
            <img
              src="/images/case-studies/vehicle-readiness-preview-v1.png"
              alt="A yard operative checking the passenger lift on an accessible minibus"
              className="aspect-[1.1/1] w-full object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-3">
              {[
                ["1", "wheelchair space"],
                ["Complete", "restraint set"],
                ["Supported", "release result"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/15 bg-veyvio-deep/88 p-4 text-white backdrop-blur-md">
                  <p className="font-marketing text-base font-extrabold">{value}</p>
                  <p className="mt-1 text-[0.52rem] font-black uppercase tracking-[.11em] text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Yard closes the capacity question</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              The right vehicle is specific to the request.
            </h2>
            <p className="mt-6 text-lg leading-8 text-veyvio-muted">
              When wheelchair or lift support is required, an available vehicle is not enough. Yard can establish whether the physical vehicle, equipment and current release state support this accepted work.
            </p>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#d5e1dd] bg-white">
              <div className="border-b border-[#e0e7e4] p-5">
                <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-veyvio-teal">DAR-184 · assignment match</p>
              </div>
              {[
                ["Passenger requirement", "Wheelchair + passenger lift", "pass"],
                ["Vehicle capacity", "1 wheelchair position", "pass"],
                ["Equipment", "Restraint set complete", "pass"],
                ["Vehicle state", "No active restriction or VOR", "pass"],
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

      <section
        ref={rolesReveal.ref}
        className={`reveal bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${rolesReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Purpose-limited by role</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                The request stays whole. Each role sees its part.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Mobility and passenger information should follow the authorised duty without exposing the full member record to every user.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {frontlineViews.map((view) => (
              <article key={view.role} className="group overflow-hidden rounded-[1.6rem] border border-[#dfe6e7] bg-[#fbfcfc]">
                <div className="h-2 origin-left transition-transform duration-300 group-hover:scale-x-[.35]" style={{ backgroundColor: view.accent }} />
                <div className="p-7 sm:p-8">
                  <p className="text-[0.64rem] font-black uppercase tracking-[.18em]" style={{ color: view.accent }}>{view.role}</p>
                  <h3 className="mt-4 font-marketing text-2xl font-extrabold text-veyvio-deep">{view.title}</h3>
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

          <div className="mt-14 grid overflow-hidden rounded-[2rem] bg-[#e8f6f8] lg:grid-cols-[.9fr_1.1fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#247e94]">When the day changes</p>
              <h3 className="mt-4 font-marketing text-3xl font-extrabold tracking-[-.035em] text-veyvio-deep sm:text-4xl">
                Flexible service needs owned exceptions.
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">
                The controller should see the passenger and service context behind the exception—not just a generic alert.
              </p>
            </div>
            <div className="grid gap-px bg-[#cddfe2] sm:grid-cols-2">
              {liveExceptions.map(([title, copy, colour]) => (
                <div key={title} className="bg-white p-6">
                  <span className="block h-2 w-10 rounded-full" style={{ backgroundColor: colour }} />
                  <p className="mt-5 font-marketing text-lg font-extrabold text-veyvio-deep">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-veyvio-muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#dfe7e4] bg-[#f4f7f5] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Before a Dial-a-Ride pilot</p>
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

      <section className="bg-[#dff0c9] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#4e7d19]">Start with one request type</p>
            <h2 className="mt-4 max-w-[17ch] font-marketing text-4xl font-extrabold tracking-[-.045em] text-veyvio-deep sm:text-6xl">
              Map your member-to-journey decision.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              We will identify eligibility, booking, capacity, vehicle and exception rules before defining a controlled Dial-a-Ride pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-deep px-7 text-sm font-extrabold text-white transition hover:bg-[#0f3038]"
              onClick={() =>
                trackCta("final_cta_clicked", "Book a Dial-a-Ride consultation", {
                  page: "/industries/dial-a-ride",
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
