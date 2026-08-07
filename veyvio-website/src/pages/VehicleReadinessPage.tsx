import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type ReadinessKey = "ready" | "advisory" | "restricted" | "blocked" | "vor";
type CheckTone = "pass" | "warn" | "block";

type ReadinessExample = {
  key: ReadinessKey;
  registration: string;
  type: string;
  bay: string;
  departure: string;
  state: string;
  stateDetail: string;
  accent: string;
  surface: string;
  checks: Array<[string, string, CheckTone]>;
  nextAction: string;
  owner: string;
};

const examples: ReadinessExample[] = [
  {
    key: "ready",
    registration: "WX21 FYV",
    type: "Accessible minibus",
    bay: "Departure D01",
    departure: "07:30 · North Loop",
    state: "Ready",
    stateDetail: "All configured departure requirements supported",
    accent: "#79bd2b",
    surface: "#eaf6d8",
    checks: [
      ["Location & custody", "Departure D01 · Yard custody", "pass"],
      ["Required check", "Passed 06:42 · CHK-8831", "pass"],
      ["Fuel or charge", "Diesel · 78%", "pass"],
      ["Equipment", "8 of 8 required items complete", "pass"],
      ["Defect & VOR state", "No active release hold", "pass"],
    ],
    nextAction: "Release to RUN-24017",
    owner: "Yard release",
  },
  {
    key: "advisory",
    registration: "YG68 AKF",
    type: "Community shuttle",
    bay: "Wash bay 02",
    departure: "08:20 · East Zone",
    state: "Ready with advisory",
    stateDetail: "Release supported; one non-blocking action remains visible",
    accent: "#e7a331",
    surface: "#fff2d9",
    checks: [
      ["Location & custody", "Wash bay 02 · Yard custody", "pass"],
      ["Required check", "Passed 06:55 · CHK-8834", "pass"],
      ["Fuel or charge", "Diesel · 64%", "pass"],
      ["Condition note", "Interior clean due after service", "warn"],
      ["Defect & VOR state", "No active release hold", "pass"],
    ],
    nextAction: "Release with visible advisory",
    owner: "Yard release",
  },
  {
    key: "restricted",
    registration: "NK22 HRP",
    type: "Wheelchair-accessible vehicle",
    bay: "Parking A15",
    departure: "09:10 · DAR-22",
    state: "Restricted",
    stateDetail: "Vehicle may move, but not for the planned service requirement",
    accent: "#6650bd",
    surface: "#eee9fb",
    checks: [
      ["Location & custody", "Parking A15 · Yard custody", "pass"],
      ["Required check", "Passed 07:02 · CHK-8838", "pass"],
      ["Fuel or charge", "Battery · 82%", "pass"],
      ["WAV equipment", "One restraint set unavailable", "block"],
      ["Service match", "No wheelchair journeys", "block"],
    ],
    nextAction: "Replenish equipment or reassign work",
    owner: "Yard + Command",
  },
  {
    key: "blocked",
    registration: "EO71 NTJ",
    type: "Electric minibus",
    bay: "EV charging 03",
    departure: "07:55 · SEND-08",
    state: "Blocked",
    stateDetail: "A configured departure requirement has failed",
    accent: "#ef6b5c",
    surface: "#ffe7e3",
    checks: [
      ["Location & custody", "EV charging 03 · Yard custody", "pass"],
      ["Return inspection", "Overdue · not started", "block"],
      ["Fuel or charge", "Battery · 43%", "pass"],
      ["Equipment", "Required items complete", "pass"],
      ["Departure-line state", "Not on departure line", "block"],
    ],
    nextAction: "Complete inspection before release",
    owner: "Yard",
  },
  {
    key: "vor",
    registration: "LM19 BCT",
    type: "Accessible minibus",
    bay: "Workshop W02",
    departure: "08:05 · CT-118",
    state: "VOR",
    stateDetail: "Vehicle is off road and cannot be operationally released",
    accent: "#d93f51",
    surface: "#fde4e8",
    checks: [
      ["Location & custody", "Workshop W02 · Yard custody", "pass"],
      ["Safety-critical defect", "Brake warning · DEF-0198", "block"],
      ["VOR case", "VOR-0412 · active", "block"],
      ["Return-to-road", "Verification outstanding", "block"],
      ["Assigned work", "Replacement vehicle required", "warn"],
    ],
    nextAction: "Retain hold and protect the service plan",
    owner: "Yard + Command",
  },
];

const sources = [
  {
    number: "01",
    label: "Where is it?",
    title: "Location & custody",
    copy: "Depot, zone, bay, keys and the current custodian establish whether the asset is physically in control.",
    example: "Bay 04 · keys present · Yard custody",
    colour: "#2498b1",
  },
  {
    number: "02",
    label: "What condition is it in?",
    title: "Checks & body condition",
    copy: "Required checks, photos, known damage and newly reported defects describe the current physical state.",
    example: "Return check passed · 4 photos",
    colour: "#6650bd",
  },
  {
    number: "03",
    label: "Can it complete the work?",
    title: "Fuel, charge & equipment",
    copy: "Energy level and service-specific equipment are evaluated against the vehicle and planned duty.",
    example: "78% fuel · 8/8 items complete",
    colour: "#79bd2b",
  },
  {
    number: "04",
    label: "Is release permitted?",
    title: "Defects, restrictions & VOR",
    copy: "Open safety defects, service restrictions and off-road holds remain visible in the release outcome.",
    example: "No active VOR · no blockers",
    colour: "#ef6b5c",
  },
];

const workflow = [
  ["01", "Return", "Driver", "Return condition, mileage, fuel or charge, keys and defects."],
  ["02", "Locate", "Yard", "Confirm depot, zone, bay, custody and physical presence."],
  ["03", "Inspect", "Yard", "Complete required checks and compare current body condition."],
  ["04", "Resolve", "Yard", "Replenish, clean, charge, move, inspect or retain a VOR hold."],
  ["05", "Release", "Yard → Command", "Publish the supported state that the next assignment can use."],
];

const faqs = [
  {
    question: "What does Veyvio mean by vehicle readiness?",
    answer:
      "Vehicle readiness is the supported operational state of a specific vehicle at a specific time. It can consider location, custody, checks, body condition, fuel or charge, equipment, defects, restrictions, VOR and the work the vehicle is expected to perform.",
  },
  {
    question: "Is readiness the same as vehicle compliance?",
    answer:
      "No. Compliance records can contribute to a readiness decision, but readiness also includes immediate physical and operational facts such as location, checks, equipment, fuel or charge and active defects.",
  },
  {
    question: "Can a vehicle be ready for one service but not another?",
    answer:
      "Yes. A vehicle may be physically operable but restricted for work that requires particular equipment or capability. Veyvio's target model keeps that service context visible instead of flattening every outcome into ready or not ready.",
  },
  {
    question: "How does the state reach Command and Driver?",
    answer:
      "Driver returns frontline condition and defect context. Yard establishes the physical state and release outcome. Command consumes that current readiness when planning or assigning work, while Driver can see relevant vehicle restrictions before sign-on.",
  },
  {
    question: "Is every capability shown generally available?",
    answer:
      "Veyvio Yard, Command and Driver are currently presented as pilot products. The exact readiness inputs, rules, evidence and integrations included in a pilot are confirmed during consultation.",
  },
];

function ReadinessMark({ tone }: { tone: CheckTone }) {
  const style =
    tone === "pass"
      ? "bg-[#e7f5d3] text-[#4e7f1a]"
      : tone === "warn"
        ? "bg-[#fff0d4] text-[#9b6418]"
        : "bg-[#ffe4e1] text-[#a33931]";
  return (
    <span aria-hidden="true" className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${style}`}>
      {tone === "pass" ? "✓" : tone === "warn" ? "·" : "!"}
    </span>
  );
}

function DepartureLineVisual() {
  const bays = [
    ["D01", "WX21", "Ready", "#79bd2b"],
    ["D02", "EO71", "Check", "#e7a331"],
    ["D03", "—", "Open", "#cdd9da"],
    ["D04", "NK22", "Restricted", "#6650bd"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[40rem]">
      <div className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(121,189,43,.23),rgba(36,152,177,.1)_46%,transparent_70%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.8rem] border border-[#d4e1e2] bg-white shadow-[0_34px_90px_rgba(23,62,72,.2)]">
        <div className="flex items-center justify-between border-b border-[#dce6e7] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#79bd2b]" />
            <span className="text-sm font-black text-[#173e48]">North depot</span>
          </div>
          <span className="rounded-full bg-[#eef4f3] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.16em] text-[#173e48]">
            Departure line
          </span>
        </div>
        <div className="relative overflow-hidden bg-[#edf4f3] p-4 sm:p-6">
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(90deg,transparent_49%,#d5e1df_50%,transparent_51%)] [background-size:25%_100%]" />
          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bays.map(([bay, vehicle, state, colour]) => (
              <div key={bay} className="min-h-[15rem] rounded-[1.2rem] border-2 border-dashed border-[#c7d6d7] bg-white/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#173e48]">{bay}</span>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: colour }} />
                </div>
                <div className="mt-8 flex justify-center">
                  {vehicle !== "—" ? (
                    <div className="relative h-16 w-24">
                      <div className="absolute bottom-2 left-1/2 h-10 w-20 -translate-x-1/2 rounded-[1.1rem_1.4rem_.6rem_.6rem] border-2 border-[#173e48] bg-white shadow-lg" />
                      <div className="absolute bottom-9 left-1/2 h-5 w-11 -translate-x-1/2 rounded-t-xl bg-[#b9d9df]" />
                      <span className="absolute bottom-0 left-3 size-4 rounded-full border-2 border-white bg-[#173e48]" />
                      <span className="absolute bottom-0 right-3 size-4 rounded-full border-2 border-white bg-[#173e48]" />
                    </div>
                  ) : (
                    <span className="mt-2 text-4xl font-light text-[#b7c6c8]">+</span>
                  )}
                </div>
                <div className="mt-5 text-center">
                  <p className="text-sm font-black text-[#173e48]">{vehicle}</p>
                  <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[.12em]" style={{ color: colour }}>{state}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative mt-4 flex items-center justify-between rounded-xl bg-[#173e48] px-4 py-3 text-white">
            <div>
              <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-white/45">Next departure</p>
              <p className="mt-1 text-sm font-black">RUN-24017 · 07:30</p>
            </div>
            <span className="rounded-full bg-[#79bd2b] px-3 py-1.5 text-xs font-black text-white">D01 supported</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessLab({ example }: { example: ReadinessExample }) {
  return (
    <div className="grid overflow-hidden rounded-[1.8rem] border border-[#d6e2e3] bg-white shadow-[0_28px_85px_rgba(23,62,72,.11)] lg:grid-cols-[.72fr_1.28fr]">
      <div className="flex min-h-[35rem] flex-col justify-between p-7 sm:p-10" style={{ backgroundColor: example.surface }}>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-black uppercase tracking-[.18em]" style={{ color: example.accent }}>{example.owner}</span>
            <span className="rounded-full bg-white/75 px-3 py-1 text-[0.6rem] font-black uppercase tracking-[.13em] text-[#173e48]">{example.state}</span>
          </div>
          <h3 className="mt-10 font-marketing text-5xl font-extrabold leading-[.9] tracking-[-.055em] text-[#173e48] sm:text-6xl">
            {example.registration}
          </h3>
          <p className="mt-3 text-base font-bold text-[#173e48]">{example.type}</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[0.52rem] font-black uppercase tracking-[.15em] text-[#6e7f83]">Current location</p>
              <p className="mt-1 text-xs font-black text-[#173e48]">{example.bay}</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[0.52rem] font-black uppercase tracking-[.15em] text-[#6e7f83]">Expected work</p>
              <p className="mt-1 text-xs font-black text-[#173e48]">{example.departure}</p>
            </div>
          </div>
        </div>
        <div className="mt-8 rounded-2xl bg-white/80 p-4">
          <p className="text-[0.54rem] font-black uppercase tracking-[.15em] text-[#6e7f83]">Why this state?</p>
          <p className="mt-2 text-sm font-bold leading-6 text-[#173e48]">{example.stateDetail}</p>
        </div>
      </div>

      <div className="relative bg-[#f5f8f7] p-5 sm:p-9">
        <div className="absolute -right-24 -top-24 size-72 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: example.accent }} />
        <div className="relative mx-auto max-w-[40rem] overflow-hidden rounded-[1.45rem] border border-[#d4e0e2] bg-white shadow-[0_22px_65px_rgba(23,62,72,.12)]">
          <div className="flex items-center justify-between border-b border-[#dfe7e8] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: example.accent }} />
              <span className="text-sm font-black text-[#173e48]">Vehicle release</span>
            </div>
            <span className="text-[0.58rem] font-black uppercase tracking-[.15em] text-[#6f7f83]">Evaluated 07:08</span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="overflow-hidden rounded-xl border border-[#dfe7e8]">
              {example.checks.map(([label, value, tone], index) => (
                <div key={label} className={`flex items-center justify-between gap-4 px-3 py-3.5 ${index ? "border-t border-[#dfe7e8]" : ""}`}>
                  <div>
                    <p className="text-xs font-bold text-[#173e48]">{label}</p>
                    <p className="mt-0.5 text-[0.65rem] text-[#708086]">{value}</p>
                  </div>
                  <ReadinessMark tone={tone} />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl px-4 py-4 text-white" style={{ backgroundColor: example.accent }}>
              <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-white/65">Next operational action</p>
              <div className="mt-1 flex items-center justify-between gap-4">
                <p className="text-sm font-black">{example.nextAction}</p>
                <span className="text-xl font-black" aria-hidden="true">→</span>
              </div>
            </div>
            <p className="mt-4 text-[0.62rem] leading-5 text-[#76858a]">
              Example configured result. Exact requirements and service restrictions are agreed for each operator and pilot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandoffVisual() {
  return (
    <div className="relative mx-auto max-w-[68rem]">
      <div className="absolute left-[12%] right-[12%] top-12 hidden h-px bg-white/18 lg:block" />
      <div className="relative grid gap-4 lg:grid-cols-3">
        {[
          ["Driver", "Return the frontline truth", "Condition, keys, mileage, fuel or charge and newly observed defects.", "#6650bd"],
          ["Yard", "Establish the physical truth", "Location, custody, inspection, equipment, VOR and supported release.", "#79bd2b"],
          ["Command", "Use the operational truth", "Assignment and departure decisions consume the current readiness state.", "#2498b1"],
        ].map(([role, title, copy, colour], index) => (
          <article key={role} className="group relative min-h-[19rem] rounded-[1.5rem] border border-white/12 bg-white/[.045] p-6 transition duration-300 hover:-translate-y-2 hover:bg-white/[.075]">
            <span className="flex size-12 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ backgroundColor: colour }}>
              {index + 1}
            </span>
            <p className="mt-10 text-xs font-black uppercase tracking-[.18em]" style={{ color: colour }}>Veyvio {role}</p>
            <h3 className="mt-3 text-2xl font-black tracking-[-.03em] text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">{copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function VehicleReadinessPage() {
  const [activeKey, setActiveKey] = useState<ReadinessKey>("ready");
  const activeExample = examples.find((example) => example.key === activeKey) ?? examples[0];
  const sourceReveal = useRevealOnScroll<HTMLDivElement>();
  const labReveal = useRevealOnScroll<HTMLDivElement>();
  const workflowReveal = useRevealOnScroll<HTMLDivElement>();

  usePageMeta({
    title: "Vehicle readiness workflows | Veyvio",
    description:
      "Connect vehicle location, custody, checks, condition, fuel or charge, equipment, defects and VOR into a supported release decision with Veyvio.",
    path: "/solutions/vehicle-readiness",
  });

  return (
    <>
      <section className="relative min-h-[calc(100svh-4.25rem)] overflow-hidden bg-[#f8faf7]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_42%,rgba(121,189,43,.21),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(36,152,177,.15),transparent_26%)]" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4.25rem)] max-w-[92rem] items-center gap-10 px-6 py-16 md:grid-cols-[.9fr_1.1fr] md:px-8 lg:gap-14 lg:px-10 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d5e1e2] bg-white/85 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[.2em] text-[#4d8f9f] shadow-sm">
              <span className="size-2 rounded-full bg-[#79bd2b]" />
              Solution · Vehicle readiness
            </p>
            <h1 className="page-hero-title mt-8 max-w-[10ch] text-[#173e48]">
              Ready is not a colour. It is a supported decision.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#66777d] sm:text-xl">
              Know where the vehicle is, what condition it is in, what it carries and whether it
              supports the work—before the service depends on it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#readiness-lab" className="rounded-full bg-[#79bd2b] px-7 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(121,189,43,.28)] transition hover:-translate-y-0.5 hover:bg-[#659e25]">
                Explore readiness states
              </a>
              <Link
                to="/demo"
                className="text-sm font-bold text-[#173e48] underline decoration-[#2498b1] decoration-2 underline-offset-4"
                onClick={() =>
                  trackCta("demo_cta_selected", "Map our release process", {
                    page: "/solutions/vehicle-readiness",
                    ctaPosition: "vehicle-readiness-hero",
                  })
                }
              >
                Map our release process
              </Link>
            </div>
          </div>
          <DepartureLineVisual />
        </div>
      </section>

      <section className="border-y border-[#d8e3e4] bg-white">
        <div className="mx-auto grid max-w-[92rem] divide-y divide-[#d8e3e4] px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:px-10">
          {[
            ["01", "Known", "Location, bay, keys and custody"],
            ["02", "Checked", "Condition, defects and required evidence"],
            ["03", "Equipped", "Fuel or charge and service requirements"],
            ["04", "Supported", "A state the next decision can use"],
          ].map(([number, title, copy]) => (
            <div key={number} className="px-5 py-8 first:pl-0 sm:first:pl-5">
              <p className="text-xs font-black text-[#2498b1]">{number}</p>
              <h2 className="mt-3 text-lg font-black tracking-[-.02em] text-[#173e48]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#66777d]">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div ref={sourceReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2498b1]">The readiness evidence</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#173e48] sm:text-7xl">
                The physical facts have to agree.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#66777d]">
                Readiness combines evidence from the vehicle, Yard and the work it is expected to perform.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[1.7rem] bg-[#d9e4e5] sm:grid-cols-2">
              {sources.map((source, index) => (
                <article
                  key={source.number}
                  className={`group min-h-[19rem] bg-[#f7f9f8] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white ${sourceReveal.visible ? "reveal is-visible" : "reveal"}`}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black" style={{ color: source.colour }}>{source.number}</span>
                    <span className="text-[0.58rem] font-black uppercase tracking-[.14em] text-[#7a898d]">{source.label}</span>
                  </div>
                  <h3 className="mt-10 text-2xl font-black tracking-[-.03em] text-[#173e48]">{source.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#66777d]">{source.copy}</p>
                  <div className="mt-6 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[#173e48] shadow-sm">{source.example}</div>
                  <div className="mt-5 h-1 w-12 rounded-full transition-all duration-300 group-hover:w-24" style={{ backgroundColor: source.colour }} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#173e48] py-24 text-white sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <p className="max-w-6xl font-marketing text-[clamp(3.1rem,7vw,7.4rem)] font-extrabold leading-[.89] tracking-[-.065em]">
            A vehicle can be physically present
            <span className="block text-[#9edc46]">and still not support the work.</span>
          </p>
          <div className="mt-14 grid max-w-5xl gap-6 border-t border-white/15 pt-8 sm:grid-cols-3">
            <p className="text-lg leading-8 text-white/60">Present is not the same as checked.</p>
            <p className="text-lg leading-8 text-white/60">Checked is not the same as correctly equipped.</p>
            <p className="text-lg leading-8 text-white/60">Operable is not the same as suitable for every service.</p>
          </div>
        </div>
      </section>

      <section id="readiness-lab" className="scroll-mt-24 bg-[#f2f6f5] py-24 sm:py-32">
        <div ref={labReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2498b1]">Readiness state lab</p>
              <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#173e48] sm:text-7xl">
                Inspect the reason, not just the badge.
              </h2>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#66777d]">
              Select a realistic vehicle state to see the evidence and next operational action.
            </p>
          </div>

          <div role="tablist" aria-label="Vehicle readiness states" className="mt-12 flex gap-2 overflow-x-auto pb-2">
            {examples.map((example, index) => {
              const active = example.key === activeExample.key;
              return (
                <button
                  key={example.key}
                  type="button"
                  role="tab"
                  id={`readiness-tab-${example.key}`}
                  aria-controls="readiness-state-panel"
                  aria-selected={active}
                  onClick={() => setActiveKey(example.key)}
                  className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black transition ${
                    active
                      ? "border-[#173e48] bg-[#173e48] text-white shadow-lg"
                      : "border-[#d4e0e1] bg-white text-[#173e48] hover:border-[#2498b1]"
                  }`}
                >
                  <span className="mr-2 text-[0.65rem] opacity-55">0{index + 1}</span>
                  {example.state}
                </button>
              );
            })}
          </div>

          <div
            id="readiness-state-panel"
            role="tabpanel"
            aria-labelledby={`readiness-tab-${activeExample.key}`}
            className={`mt-6 ${labReveal.visible ? "reveal is-visible" : "reveal"}`}
          >
            <ReadinessLab example={activeExample} />
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div ref={workflowReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2498b1]">One controlled vehicle journey</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#173e48] sm:text-7xl">
                Readiness begins at return, not at departure.
              </h2>
            </div>
            <div className="divide-y divide-[#d7e2e3] border-y border-[#d7e2e3]">
              {workflow.map(([number, title, owner, copy], index) => (
                <article
                  key={number}
                  className={`group grid gap-4 py-6 sm:grid-cols-[3rem_8rem_8rem_1fr] sm:items-center ${workflowReveal.visible ? "reveal is-visible" : "reveal"}`}
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <span className="text-sm font-black text-[#79bd2b]">{number}</span>
                  <h3 className="text-xl font-black tracking-[-.025em] text-[#173e48]">{title}</h3>
                  <span className="w-fit rounded-full bg-[#eef3f2] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.13em] text-[#173e48]">{owner}</span>
                  <p className="text-sm leading-6 text-[#66777d]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0d2b33] py-24 text-white sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#9edc46]">A role-owned handoff</p>
            <h2 className="mt-4 font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] sm:text-7xl">
              One vehicle state, established by the people closest to the work.
            </h2>
          </div>
          <div className="mt-14">
            <HandoffVisual />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/platform/yard" className="rounded-full bg-[#9edc46] px-6 py-3 text-sm font-black text-[#173e48] transition hover:-translate-y-0.5 hover:bg-white">
              Explore Veyvio Yard
            </Link>
            <Link to="/platform" className="rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:border-white hover:bg-white/5">
              View the connected platform
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2498b1]">Evidence at release</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#173e48] sm:text-7xl">
                Make the state easy to challenge and verify.
              </h2>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-[#d7e2e3] bg-[#f6f8f7] shadow-[0_24px_70px_rgba(23,62,72,.09)]">
              <div className="flex items-center justify-between border-b border-[#dbe5e6] bg-white px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.17em] text-[#2498b1]">Release trace</p>
                  <p className="mt-1 text-sm font-black text-[#173e48]">WX21 FYV · RUN-24017</p>
                </div>
                <span className="rounded-full bg-[#e7f5d3] px-3 py-1 text-[0.62rem] font-black text-[#4e7f1a]">Ready</span>
              </div>
              {[
                ["06:31", "Vehicle returned", "J. Patel · Driver", "Driver"],
                ["06:34", "Bay and keys confirmed", "Dana Lewis · Yard", "Yard"],
                ["06:42", "Required check passed", "Dana Lewis · Yard", "CHK-8831"],
                ["06:48", "Equipment set verified", "Dana Lewis · Yard", "EQ-2418"],
                ["06:50", "Release state published", "Veyvio Yard", "REL-0924"],
              ].map(([time, action, actor, record], index) => (
                <div key={record} className={`grid gap-2 px-5 py-4 sm:grid-cols-[4rem_1.2fr_1fr_auto] sm:items-center ${index ? "border-t border-[#dfe7e8]" : ""}`}>
                  <strong className="text-xs text-[#2498b1]">{time}</strong>
                  <span className="text-sm font-bold text-[#173e48]">{action}</span>
                  <span className="text-xs text-[#66777d]">{actor}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.6rem] font-black text-[#173e48]">{record}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8e3e4] bg-[#f4f7f6] py-24 sm:py-32">
        <div className="mx-auto max-w-[76rem] px-6">
          <p className="text-center text-sm font-black uppercase tracking-[.2em] text-[#2498b1]">Readiness questions</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-center font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#173e48] sm:text-7xl">
            Useful answers before a depot walkthrough.
          </h2>
          <div className="mt-12 divide-y divide-[#d7e2e3] border-y border-[#d7e2e3]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-black text-[#173e48] sm:text-xl">
                  {faq.question}
                  <span className="text-2xl font-light text-[#2498b1] transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-2 pt-4 text-base leading-7 text-[#66777d]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#9edc46] py-20 sm:py-24">
        <div className="mx-auto flex max-w-[92rem] flex-col justify-between gap-10 px-6 lg:flex-row lg:items-end lg:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#173e48]/60">Bring the real departure list</p>
            <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.93] tracking-[-.055em] text-[#173e48] sm:text-7xl">
              Walk through one vehicle from return to supported release.
            </h2>
          </div>
          <Link
            to="/demo"
            className="shrink-0 rounded-full bg-[#173e48] px-8 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#0d2b33]"
            onClick={() =>
              trackCta("demo_cta_selected", "Book a readiness walkthrough", {
                page: "/solutions/vehicle-readiness",
                ctaPosition: "vehicle-readiness-final",
              })
            }
          >
            Book a readiness walkthrough
          </Link>
        </div>
      </section>
    </>
  );
}
