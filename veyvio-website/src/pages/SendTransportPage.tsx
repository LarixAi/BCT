import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type SupportStepKey =
  | "passenger"
  | "communication"
  | "sensory"
  | "mobility"
  | "crew"
  | "duty";

type SupportStep = {
  key: SupportStepKey;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  colour: string;
  fields: Array<[string, string, "standard" | "confirmed" | "restricted"]>;
};

const supportSteps: SupportStep[] = [
  {
    key: "passenger",
    number: "01",
    label: "Passenger",
    eyebrow: "One support profile",
    title: "Begin with the person—not an unstructured note.",
    copy:
      "Keep the passenger, guardian, service and authorised contact relationships together so planners know which record governs the journey.",
    colour: "#6650bd",
    fields: [
      ["Passenger", "Alex M. · SEND-042", "standard"],
      ["Service", "Oakfield Learning Centre", "standard"],
      ["Primary guardian", "Contact verified", "confirmed"],
      ["Profile access", "Restricted", "restricted"],
    ],
  },
  {
    key: "communication",
    number: "02",
    label: "Communication",
    eyebrow: "How this passenger communicates",
    title: "Turn communication needs into usable guidance.",
    copy:
      "Record the relevant way to explain the journey, offer choices and communicate a change without forcing the frontline team to interpret free text.",
    colour: "#2498b1",
    fields: [
      ["Preferred approach", "Short, literal instructions", "standard"],
      ["Understanding", "Allow processing time", "standard"],
      ["Change communication", "Explain before moving", "confirmed"],
      ["Duty visibility", "Assigned crew only", "restricted"],
    ],
  },
  {
    key: "sensory",
    number: "03",
    label: "Sensory",
    eyebrow: "Routine and predictability",
    title: "Make known triggers and calming routines visible.",
    copy:
      "The relevant brief can highlight noise, waiting, seating and routine considerations before the crew arrives—not after a passenger becomes distressed.",
    colour: "#ef6b5c",
    fields: [
      ["Known trigger", "Unexpected waiting", "standard"],
      ["Helpful routine", "Same seat where possible", "standard"],
      ["Environment", "Low-noise boarding", "confirmed"],
      ["Change today", "Crew change highlighted", "restricted"],
    ],
  },
  {
    key: "mobility",
    number: "04",
    label: "Mobility",
    eyebrow: "Passenger and equipment together",
    title: "Connect boarding support to the right vehicle.",
    copy:
      "Wheelchair space, lift or ramp use, restraint requirements and hands-on assistance can shape the vehicle and crew decision.",
    colour: "#7ab82e",
    fields: [
      ["Boarding", "Passenger lift required", "standard"],
      ["Wheelchair space", "1 configured", "confirmed"],
      ["Restraints", "Check before release", "confirmed"],
      ["Physical support", "Passenger assistant", "restricted"],
    ],
  },
  {
    key: "crew",
    number: "05",
    label: "Crew",
    eyebrow: "Configured capability gates",
    title: "Support the duty with eligible people.",
    copy:
      "The operator can configure school, safeguarding, SEND awareness, behaviour support and passenger-assistant requirements for this work.",
    colour: "#e7a331",
    fields: [
      ["Driver", "Eligible for SEND work", "confirmed"],
      ["Passenger assistant", "Assigned", "confirmed"],
      ["Role training", "Current", "confirmed"],
      ["Consistency preference", "Supported where possible", "standard"],
    ],
  },
  {
    key: "duty",
    number: "06",
    label: "Duty brief",
    eyebrow: "Purpose-limited at the frontline",
    title: "Publish the relevant brief—not the whole record.",
    copy:
      "The assigned driver and passenger assistant receive the instructions needed for this duty, while fuller sensitive context stays protected.",
    colour: "#173e48",
    fields: [
      ["Route", "SCH-204 · AM", "standard"],
      ["Passenger task", "Board · seat 2 · handover", "standard"],
      ["Relevant guidance", "Acknowledged by crew", "confirmed"],
      ["Full support profile", "Not exposed", "restricted"],
    ],
  },
];

const supportPath = [
  {
    number: "01",
    title: "Known needs",
    copy: "A controlled passenger profile holds the operator’s current support context.",
    colour: "#6650bd",
  },
  {
    number: "02",
    title: "Supported plan",
    copy: "Crew, vehicle, equipment and timing requirements shape the dated work.",
    colour: "#2498b1",
  },
  {
    number: "03",
    title: "Relevant brief",
    copy: "Assigned frontline roles receive only what they need to deliver this duty.",
    colour: "#ef6b5c",
  },
] as const;

const eligibilityGates = [
  {
    title: "Driver capability",
    copy: "Configured safeguarding, school and SEND role requirements are current for the assigned driver.",
    state: "Supported",
    colour: "#6650bd",
  },
  {
    title: "Assistant capability",
    copy: "A passenger assistant is assigned when the route or passenger support plan requires one.",
    state: "Assigned",
    colour: "#2498b1",
  },
  {
    title: "Vehicle & equipment",
    copy: "Space, access equipment, restraints, checks and current Yard release state support the journey.",
    state: "Ready",
    colour: "#7ab82e",
  },
  {
    title: "Information scope",
    copy: "The duty brief contains the relevant instructions without exposing the complete support record.",
    state: "Restricted",
    colour: "#ef6b5c",
  },
] as const;

const dailyChanges = [
  {
    title: "Usual crew changes",
    copy: "Highlight the change and give the replacement crew the current, authorised duty brief.",
    colour: "#6650bd",
  },
  {
    title: "Passenger is not ready",
    copy: "Record the outcome, follow the operator’s escalation process and retain an attributable history.",
    colour: "#e7a331",
  },
  {
    title: "Equipment is unavailable",
    copy: "Keep the assignment from presenting as ready until a suitable alternative is supported.",
    colour: "#ef6b5c",
  },
  {
    title: "Handover cannot complete",
    copy: "Hold the handover and follow the configured authorised-contact process.",
    colour: "#2498b1",
  },
] as const;

const faqs = [
  {
    question: "How is SEND transport different from a general school route?",
    answer:
      "The school, term, roster, stops, crew and handover pattern still matter. SEND transport also needs the operator’s current passenger-specific communication, sensory, mobility, assistance and routine guidance to shape the plan and the frontline duty brief.",
  },
  {
    question: "Does every user see the full passenger support profile?",
    answer:
      "No. Veyvio’s target design is deny-by-default, field-restricted and purpose-limited. Controllers may need fuller planning context, while an assigned driver or passenger assistant should receive only the information relevant to the duty. Access to sensitive information should be attributable.",
  },
  {
    question: "Can Veyvio guarantee the same driver or assistant every day?",
    answer:
      "No. The platform can help an operator plan for consistency, make preferences visible and clearly identify a crew change. Actual continuity depends on the operator’s people, availability, contracts and operating model.",
  },
  {
    question: "How does Yard support SEND transport?",
    answer:
      "Yard can publish the current physical vehicle state and support checks for wheelchair spaces, passenger lifts or ramps, restraints, passenger-area hazards and other configured equipment. A vehicle remains subject to the operator’s release and assignment rules.",
  },
  {
    question: "Does Veyvio decide whether a journey is legally or clinically suitable?",
    answer:
      "No. Veyvio helps operators configure rules, guide authorised workflows and retain operational evidence. The operator remains responsible for safeguarding, care decisions, legal duties, contracts, training, data protection and any specialist assessment.",
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

function FieldState({ state }: { state: "standard" | "confirmed" | "restricted" }) {
  if (state === "standard") return null;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[0.48rem] font-black uppercase tracking-[.1em] ${
        state === "confirmed"
          ? "bg-[#e8f5d6] text-[#466f1d]"
          : "bg-[#eee9fb] text-[#5740a8]"
      }`}
    >
      {state}
    </span>
  );
}

function DutyBriefPreview({ step }: { step: SupportStep }) {
  return (
    <div className="relative min-h-[37rem] overflow-hidden rounded-[2rem] bg-[#f2effb] p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: step.colour }}
      />
      <div className="relative mx-auto max-w-[35rem] overflow-hidden rounded-[1.6rem] border border-[#ded8ec] bg-white shadow-[0_30px_80px_rgba(61,46,107,.16)]">
        <div className="flex items-center justify-between border-b border-[#e8e2f0] px-5 py-4">
          <div>
            <p className="text-[0.52rem] font-black uppercase tracking-[.17em]" style={{ color: step.colour }}>
              SEND support profile
            </p>
            <p className="mt-1 text-sm font-extrabold text-veyvio-deep">SEND-042 · Oakfield AM</p>
          </div>
          <span className="rounded-full bg-[#f4f1f8] px-3 py-1 text-[0.5rem] font-black uppercase tracking-[.12em] text-[#6650bd]">
            Controlled
          </span>
        </div>
        <div className="border-b border-[#ebe6f2] px-5 py-4">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {supportSteps.map((item) => {
              const active = item.key === step.key;
              const complete = Number(item.number) < Number(step.number);
              return (
                <span
                  key={item.key}
                  className={`h-1.5 flex-1 rounded-full ${
                    active ? "" : complete ? "bg-[#b9aee0]" : "bg-[#ebe7f1]"
                  }`}
                  style={active ? { backgroundColor: step.colour } : undefined}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[0.5rem] font-black uppercase tracking-[.14em] text-veyvio-muted">Step {step.number} of 06</p>
            <p className="text-[0.5rem] font-black uppercase tracking-[.14em]" style={{ color: step.colour }}>{step.label}</p>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-[.15em]" style={{ color: step.colour }}>
                Current profile
              </p>
              <h3 className="mt-2 font-marketing text-xl font-extrabold text-veyvio-deep">{step.label}</h3>
            </div>
            <span className="rounded-full bg-[#e7f4f6] px-3 py-1 text-[0.52rem] font-bold text-[#276b7c]">Saved</span>
          </div>
          <div className="mt-5 space-y-2.5">
            {step.fields.map(([label, value, state]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-[#e4dfeb] bg-[#fdfcff] p-4">
                <div>
                  <p className="text-[0.49rem] font-black uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
                  <p className="mt-1 text-[0.72rem] font-extrabold text-veyvio-deep">{value}</p>
                </div>
                <FieldState state={state} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-[0.58rem] font-bold text-veyvio-muted">Changes remain attributable</span>
            <button
              type="button"
              tabIndex={-1}
              className="rounded-lg px-4 py-2 text-[0.62rem] font-extrabold text-white"
              style={{ backgroundColor: step.colour }}
            >
              {step.key === "duty" ? "Publish duty brief" : "Continue"}
            </button>
          </div>
        </div>
      </div>
      <div className="relative -mt-3 ml-auto mr-2 max-w-[18rem] rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-white/52">Frontline boundary</p>
        <p className="mt-1 text-sm font-extrabold">
          {step.key === "duty" ? "Relevant brief acknowledged" : "Full profile stays protected"}
        </p>
      </div>
    </div>
  );
}

export function SendTransportPage() {
  const [activeStep, setActiveStep] = useState<SupportStepKey>("passenger");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const profileReveal = useRevealOnScroll<HTMLElement>();
  const informationReveal = useRevealOnScroll<HTMLElement>();
  const readinessReveal = useRevealOnScroll<HTMLElement>();
  const changesReveal = useRevealOnScroll<HTMLElement>();
  const selectedStep = supportSteps.find((step) => step.key === activeStep) ?? supportSteps[0];

  usePageMeta({
    title: "SEND Transport",
    description:
      "Connect passenger support profiles, communication and sensory needs, trained crews, accessible vehicles, equipment readiness and authorised handovers for SEND transport with Veyvio.",
    path: "/industries/send-transport",
  });

  return (
    <div className="overflow-hidden bg-[#fcfbff]">
      <section className="relative min-h-[calc(100svh-5rem)] bg-[#f2effb] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div aria-hidden="true" className="absolute -left-28 top-12 size-[26rem] rounded-full bg-[#9d8bd8]/22 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-44 right-0 size-[30rem] rounded-full bg-[#79c8d7]/22 blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center gap-12 lg:grid-cols-[.92fr_1.08fr]">
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-[#6650bd]" />
              <p className="text-xs font-black uppercase tracking-[.24em] text-[#6650bd]">SEND Transport</p>
            </div>
            <h1 className="page-hero-title max-w-[10.5ch] text-veyvio-deep">
              Consistency is part of the journey.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-veyvio-muted sm:text-xl">
              Connect each passenger’s relevant communication, sensory, mobility and routine guidance to the people, vehicle and equipment supporting today’s duty.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#6650bd] px-7 text-sm font-extrabold text-white shadow-[0_12px_34px_rgba(83,62,157,.28)] transition hover:bg-[#5740aa]"
                onClick={() =>
                  trackCta("demo_cta_selected", "Discuss SEND transport", {
                    page: "/industries/send-transport",
                    section: "hero",
                    ctaPosition: "primary",
                  })
                }
              >
                Discuss SEND transport
              </Link>
              <a
                href="#support-profile"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6650bd]/26 bg-white/45 px-7 text-sm font-extrabold text-veyvio-deep transition hover:bg-white/80"
              >
                Explore the support path
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {["Communication", "Sensory needs", "Crew capability", "Accessible equipment"].map((item) => (
                <span key={item} className="rounded-full border border-[#6650bd]/14 bg-white/42 px-3 py-2 text-xs font-bold text-[#524b68]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.2rem] bg-veyvio-deep shadow-[0_35px_95px_rgba(59,44,103,.26)]">
              <img
                src="/images/case-studies/community-pilot-preview-v1.png"
                alt="An accessible passenger transport team beside a minibus with its passenger lift ready"
                className="aspect-[1.08/1] w-full object-cover"
              />
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-4">
                {[
                  ["Known", "support"],
                  ["Assigned", "assistant"],
                  ["Checked", "equipment"],
                  ["Relevant", "brief"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-[#28203f]/88 p-3 text-white backdrop-blur-md">
                    <span className="font-marketing text-sm font-extrabold">{value}</span>
                    <span className="mt-1 block text-[0.48rem] font-black uppercase tracking-[.1em] text-white/54">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-5 top-8 hidden rounded-2xl bg-[#ef6b5c] p-4 text-white shadow-[0_20px_55px_rgba(72,36,62,.25)] sm:block">
              <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-white/68">SEND-042 · Morning duty</p>
              <p className="mt-1 text-sm font-extrabold">Support profile → relevant brief</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e4dfee] bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#6650bd]">The support path</p>
            <h2 className="mt-4 max-w-[12ch] font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Known, supported, relevant.
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {supportPath.map((item) => (
              <article key={item.number} className="rounded-[1.4rem] bg-[#f8f6fc] p-6">
                <span className="block h-1.5 w-9 rounded-full" style={{ backgroundColor: item.colour }} />
                <p className="mt-7 text-xs font-black" style={{ color: item.colour }}>{item.number}</p>
                <h3 className="mt-3 font-marketing text-xl font-extrabold text-veyvio-deep">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-veyvio-muted">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="support-profile"
        ref={profileReveal.ref}
        className={`reveal px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${profileReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#6650bd]">From profile to duty brief</p>
              <h2 className="mt-4 max-w-[13ch] font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Make support needs operational.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Explore how passenger context can shape the plan, eligibility checks and the purpose-limited instructions received by the assigned team.
            </p>
          </div>

          <div role="tablist" aria-label="SEND support profile steps" className="mt-10 flex gap-2 overflow-x-auto pb-2">
            {supportSteps.map((step) => {
              const active = step.key === activeStep;
              return (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  id={`send-support-tab-${step.key}`}
                  aria-controls={`send-support-panel-${step.key}`}
                  aria-selected={active}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-extrabold transition ${
                    active
                      ? "border-[#6650bd] bg-[#6650bd] text-white"
                      : "border-[#ddd7e7] bg-white text-veyvio-deep hover:border-[#6650bd]"
                  }`}
                  onClick={() => setActiveStep(step.key)}
                >
                  <span className={`text-[0.58rem] ${active ? "text-white/58" : "text-[#6650bd]"}`}>{step.number}</span>
                  {step.label}
                </button>
              );
            })}
          </div>

          <div
            key={selectedStep.key}
            id={`send-support-panel-${selectedStep.key}`}
            role="tabpanel"
            aria-labelledby={`send-support-tab-${selectedStep.key}`}
            className="mt-6 grid overflow-hidden rounded-[2.2rem] border border-[#ded9e8] bg-white shadow-[0_24px_75px_rgba(56,43,94,.09)] lg:grid-cols-[.78fr_1.22fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.64rem] font-black uppercase tracking-[.18em]" style={{ color: selectedStep.colour }}>
                {selectedStep.eyebrow}
              </p>
              <h3 className="mt-4 max-w-[13ch] font-marketing text-3xl font-extrabold leading-tight tracking-[-.04em] text-veyvio-deep sm:text-4xl">
                {selectedStep.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">{selectedStep.copy}</p>
              <div className="mt-9 space-y-3 border-t border-[#e5e0eb] pt-7">
                {[
                  "Keep changes attributable to the current record",
                  "Let needs shape the people and vehicle plan",
                  "Limit sensitive context to authorised work",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm font-semibold text-veyvio-muted">
                    <CheckMark colour={selectedStep.colour} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <DutyBriefPreview step={selectedStep} />
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-veyvio-muted">
            Representative product workflow. Exact passenger fields, support plans, access rules, training gates and operating procedures are agreed and configured during pilot discovery.
          </p>
        </div>
      </section>

      <section
        ref={informationReveal.ref}
        className={`reveal bg-[#211b35] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8 ${informationReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#b9a7f0]">Purpose-limited by design</p>
              <h2 className="mt-4 max-w-[14ch] font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                The support profile stays protected.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-white/64 lg:justify-self-end">
              Planning may require fuller context. Delivery requires the relevant instruction. Those are different information boundaries.
            </p>
          </div>
          <div className="mt-12 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
            {[
              ["Controller", "Plans with authorised context", "Understands the route, passenger requirements, crew and vehicle decision.", "#b9a7f0"],
              ["Eligibility rules", "Test the whole assignment", "Configured people, vehicle, equipment and support requirements meet together.", "#79c8d7"],
              ["Driver & assistant", "Receive the relevant brief", "See the guidance and handover actions needed for the assigned duty.", "#f08a7d"],
            ].map(([role, title, copy, colour], index) => (
              <div key={role} className="contents">
                {index > 0 ? (
                  <div aria-hidden="true" className="hidden items-center justify-center text-3xl text-white/24 lg:flex">→</div>
                ) : null}
                <article className="min-h-[19rem] rounded-[1.6rem] border border-white/12 bg-white/6 p-7 transition hover:-translate-y-2 hover:bg-white/9">
                  <span className="text-xs font-black" style={{ color: colour }}>0{index + 1}</span>
                  <p className="mt-9 text-[0.62rem] font-black uppercase tracking-[.16em]" style={{ color: colour }}>{role}</p>
                  <h3 className="mt-3 font-marketing text-2xl font-extrabold">{title}</h3>
                  <p className="mt-4 text-sm leading-6 text-white/58">{copy}</p>
                </article>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#b9a7f0]/24 bg-[#b9a7f0]/8 p-5">
            <p className="text-sm font-bold text-white">
              Sensitive passenger information should be field-restricted, purpose-limited and logged when viewed—not copied into unrestricted route notes.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#6650bd]">Before work reaches the frontline</p>
              <h2 className="mt-4 max-w-[13ch] font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Check the complete support decision.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              A driver can be available while the overall duty is not supportable. The configured people, vehicle, equipment and information gates need to meet together.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {eligibilityGates.map((gate, index) => (
              <article key={gate.title} className="group flex min-h-[20rem] flex-col overflow-hidden rounded-[1.6rem] border border-[#e3dfea] bg-[#fcfbfe]">
                <div className="h-2 origin-left transition-transform duration-300 group-hover:scale-x-[.35]" style={{ backgroundColor: gate.colour }} />
                <div className="flex flex-1 flex-col p-7">
                  <span className="text-xs font-black" style={{ color: gate.colour }}>0{index + 1}</span>
                  <h3 className="mt-7 font-marketing text-xl font-extrabold text-veyvio-deep">{gate.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-veyvio-muted">{gate.copy}</p>
                  <span className="mt-auto inline-flex w-fit rounded-full bg-[#f0edf6] px-3 py-2 text-[0.58rem] font-black uppercase tracking-[.12em] text-veyvio-deep">
                    {gate.state}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={readinessReveal.ref}
        className={`reveal border-y border-[#dce7e2] bg-[#eef6f2] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${readinessReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-veyvio-deep shadow-[0_32px_80px_rgba(23,62,72,.2)]">
            <img
              src="/images/case-studies/vehicle-readiness-preview-v1.png"
              alt="A Yard operative checking the passenger lift on an accessible vehicle"
              className="aspect-[1.1/1] w-full object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-4">
              {[
                ["1", "wheelchair space"],
                ["Checked", "lift / ramp"],
                ["Secure", "restraints"],
                ["Ready", "passenger area"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/15 bg-veyvio-deep/88 p-3 text-white backdrop-blur-md">
                  <p className="font-marketing text-sm font-extrabold">{value}</p>
                  <p className="mt-1 text-[0.46rem] font-black uppercase tracking-[.1em] text-white/54">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Yard equipment readiness</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              The right vehicle must also be ready.
            </h2>
            <p className="mt-6 text-lg leading-8 text-veyvio-muted">
              Yard’s current physical state can support the assignment decision. The driver’s walkaround then confirms the vehicle and the configured passenger equipment before departure.
            </p>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#d5e1dd] bg-white">
              <div className="border-b border-[#e0e7e4] p-5">
                <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-veyvio-teal">SEND-042 · equipment check</p>
              </div>
              {[
                ["Passenger lift / ramp", "Available, inspected and ready if required"],
                ["Wheelchair restraints", "Correct equipment present and checked"],
                ["Passenger area", "No loose objects or blocked access"],
                ["Support equipment", "Configured items confirmed on board"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0">
                  <div>
                    <p className="text-[0.54rem] font-black uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
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
        ref={changesReveal.ref}
        className={`reveal bg-[#fff8ec] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${changesReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-[0_25px_75px_rgba(74,54,34,.08)] lg:grid-cols-[.86fr_1.14fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#9a6b17]">When today is different</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Predictability includes explaining change.
            </h2>
            <p className="mt-5 text-base leading-7 text-veyvio-muted">
              The planned routine can stay stable while the crew, passenger readiness, equipment or handover differs on a specific duty.
            </p>
          </div>
          <div className="grid gap-px bg-[#e7ded0] sm:grid-cols-2">
            {dailyChanges.map((item) => (
              <article key={item.title} className="bg-[#fffdf9] p-6 sm:p-7">
                <span className="block h-2 w-10 rounded-full" style={{ backgroundColor: item.colour }} />
                <h3 className="mt-5 font-marketing text-xl font-extrabold text-veyvio-deep">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-veyvio-muted">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f3f9] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#6650bd]">Before a SEND transport pilot</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Questions teams usually ask.
            </h2>
          </div>
          <div className="divide-y divide-[#d8d2e2] border-y border-[#d8d2e2]">
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
                    <span aria-hidden="true" className={`text-2xl font-light text-[#6650bd] transition ${open ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {open ? <p className="max-w-3xl pb-7 pr-10 text-sm leading-7 text-veyvio-muted sm:text-base">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#6650bd] px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#d5cbf3]">Start with one supported route</p>
            <h2 className="mt-4 max-w-[17ch] font-marketing text-4xl font-extrabold tracking-[-.045em] sm:text-6xl">
              Map the support, people and equipment together.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
              We will trace the passenger profile, access boundary, route, crew, vehicle, equipment, handover and exception decisions before shaping a controlled SEND transport pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold text-[#4f3a99] transition hover:bg-[#f4f0ff]"
              onClick={() =>
                trackCta("final_cta_clicked", "Book a SEND transport consultation", {
                  page: "/industries/send-transport",
                  section: "final-cta",
                  ctaPosition: "primary",
                })
              }
            >
              Book a consultation
            </Link>
            <Link
              to="/industries"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/24 bg-white/6 px-7 text-sm font-extrabold text-white transition hover:bg-white/12"
            >
              View all industries
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
