import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type PhaseKey = "request" | "plan" | "release" | "live" | "close";

type Phase = {
  key: PhaseKey;
  number: string;
  label: string;
  owner: string;
  eyebrow: string;
  title: string;
  copy: string;
  bullets: string[];
  accent: string;
};

const phases: Phase[] = [
  {
    key: "request",
    number: "01",
    label: "Request",
    owner: "Command",
    eyebrow: "Capture the transport need",
    title: "Keep the service context attached from the first request.",
    copy:
      "Record who is travelling, when, where and with which authorised service requirements before the work enters the plan.",
    bullets: [
      "General, Dial-a-Ride, school and recurring flows",
      "Passenger, payer and service context",
      "Validation before operational work is created",
    ],
    accent: "#5d48b7",
  },
  {
    key: "plan",
    number: "02",
    label: "Plan",
    owner: "Command",
    eyebrow: "Turn requests into feasible work",
    title: "Build the day around real drivers, vehicles and constraints.",
    copy:
      "Move jobs into runs and duties while keeping timing, depot, accessibility and resource conflicts visible to the scheduler.",
    bullets: [
      "Jobs, runs, routes and duties",
      "Driver and vehicle availability context",
      "Original plan retained through later changes",
    ],
    accent: "#2498b1",
  },
  {
    key: "release",
    number: "03",
    label: "Release",
    owner: "Yard",
    eyebrow: "Prove the physical vehicle is ready",
    title: "Decide readiness before the vehicle enters service.",
    copy:
      "Yard locates, checks and releases the vehicle. Command receives the supported readiness state instead of a verbal assurance.",
    bullets: [
      "Known bay, keys, fuel or charge",
      "Check, equipment and VOR state",
      "Evidence connected to the release decision",
    ],
    accent: "#7ab82e",
  },
  {
    key: "live",
    number: "04",
    label: "Operate",
    owner: "Command + Driver",
    eyebrow: "Manage the service in motion",
    title: "Give controllers the exception and the context to act.",
    copy:
      "Drivers progress the assigned duty while Command follows current service state and intervenes through permissioned, reason-coded actions.",
    bullets: [
      "Duty acknowledgement and journey progress",
      "Late starts, missed checks and connectivity context",
      "Planned, revised and actual state kept distinct",
    ],
    accent: "#173e48",
  },
  {
    key: "close",
    number: "05",
    label: "Close",
    owner: "Driver + shared record",
    eyebrow: "Return the outcome to the operation",
    title: "Close the duty with the vehicle and evidence accounted for.",
    copy:
      "Journey outcomes, incidents, defects and vehicle handback remain connected to the work so the next operating decision starts from current truth.",
    bullets: [
      "Passenger and journey outcomes",
      "Mileage, fuel or charge, keys and condition",
      "Attributable history for later review",
    ],
    accent: "#e7a331",
  },
];

const architecture = [
  {
    number: "01",
    title: "Bookings & jobs",
    copy: "Capture the request and create compatible operational work without flattening specialist transport flows.",
    owner: "Command",
    colour: "#5d48b7",
  },
  {
    number: "02",
    title: "Planning & dispatch",
    copy: "Build runs and duties, check feasibility and manage the live service from the current operational picture.",
    owner: "Command",
    colour: "#2498b1",
  },
  {
    number: "03",
    title: "Vehicle readiness",
    copy: "Turn physical checks, equipment, fuel or charge, location and VOR state into a supported release decision.",
    owner: "Yard",
    colour: "#7ab82e",
  },
  {
    number: "04",
    title: "Frontline delivery",
    copy: "Guide the driver through the assigned duty, service progress, exceptions and end-of-duty handback.",
    owner: "Driver",
    colour: "#173e48",
  },
];

const roleStories = [
  {
    label: "For schedulers",
    title: "See whether the plan can work before publishing it.",
    copy:
      "Build duties with resource, depot and service context in view, then preserve the plan when operational changes are needed.",
    href: "/platform/command",
    link: "Explore Veyvio Command",
    colour: "#2498b1",
  },
  {
    label: "For depot teams",
    title: "Turn vehicle readiness into an operational decision.",
    copy:
      "Locate the asset, complete the required physical checks and return an explainable release state to the wider operation.",
    href: "/platform/yard",
    link: "Explore Veyvio Yard",
    colour: "#7ab82e",
  },
  {
    label: "For drivers",
    title: "Make the next required action unmistakable.",
    copy:
      "Receive the duty, complete checks, progress journeys and close the shift with visible save and sync state.",
    href: "/platform/driver",
    link: "Explore Veyvio Driver",
    colour: "#5d48b7",
  },
];

const faqs = [
  {
    question: "What does Veyvio mean by transport operations?",
    answer:
      "Transport operations covers the connected path from a customer or passenger request through jobs, runs, duties, assignment, vehicle release, frontline delivery and operational closeout.",
  },
  {
    question: "Does Veyvio replace every specialist booking process?",
    answer:
      "No. General bookings, Dial-a-Ride, school routes and recurring transport keep the creation flow their users need. They produce compatible operational jobs that can enter the same governed planning and delivery model.",
  },
  {
    question: "Which application owns the live operation?",
    answer:
      "Command is the web-first control application for planning, dispatch and live operations. Yard owns physical fleet-readiness work, while Driver guides the assigned frontline duty. They use shared backend services rather than passing competing copies of state between frontends.",
  },
  {
    question: "Is the full transport-operations solution generally available?",
    answer:
      "Veyvio is currently presented as a pilot product. The page describes the target operating model and implemented product direction; the exact modules, controls and acceptance criteria for a pilot are confirmed during consultation.",
  },
];

function CheckMark({ colour = "#7ab82e" }: { colour?: string }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-black text-white"
      style={{ backgroundColor: colour }}
    >
      ✓
    </span>
  );
}

function ServiceThread() {
  const steps = [
    ["Request", "CT-104", "Confirmed", "#5d48b7"],
    ["Plan", "RUN-24017", "Ready", "#2498b1"],
    ["Release", "BX62 BCT", "Supported", "#7ab82e"],
    ["Operate", "North Loop", "On time", "#173e48"],
    ["Close", "Duty outcome", "Pending", "#e7a331"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[35rem]">
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(122,184,46,.22),rgba(36,152,177,.1)_40%,transparent_70%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.8rem] border border-white/90 bg-white/90 p-4 shadow-[0_34px_90px_rgba(23,62,72,.18)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-veyvio-border px-2 pb-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-veyvio-lime" />
            <span className="text-sm font-black text-veyvio-deep">veyvio</span>
          </div>
          <span className="rounded-full bg-[#eef4f3] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.16em] text-veyvio-deep">
            Service thread
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {steps.map(([label, value, state, colour], index) => (
            <div
              key={label}
              className="group grid grid-cols-[2.2rem_1fr_auto] items-center gap-3 rounded-2xl border border-veyvio-border bg-white px-3 py-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className="flex size-8 items-center justify-center rounded-xl text-xs font-black text-white"
                style={{ backgroundColor: colour }}
              >
                {index + 1}
              </span>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[.15em] text-veyvio-muted">{label}</p>
                <p className="mt-0.5 text-sm font-extrabold text-veyvio-deep">{value}</p>
              </div>
              <span className="rounded-full bg-[#f2f6f5] px-2.5 py-1 text-[0.62rem] font-bold text-veyvio-deep">
                {state}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-veyvio-deep px-4 py-3 text-white">
          <div>
            <p className="text-[0.58rem] font-bold uppercase tracking-[.16em] text-white/55">One current record</p>
            <p className="mt-1 text-sm font-bold">Actor, reason and outcome stay attached</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-veyvio-lime text-sm font-black text-veyvio-deep">✓</span>
        </div>
      </div>
    </div>
  );
}

function PhaseVisual({ phase }: { phase: Phase }) {
  return (
    <div
      className="relative min-h-[30rem] overflow-hidden rounded-[1.6rem] border border-white/70 p-4 sm:p-7"
      style={{ backgroundColor: `${phase.accent}13` }}
    >
      <div
        className="absolute -right-20 -top-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: phase.accent }}
      />
      <div className="relative mx-auto max-w-[42rem] overflow-hidden rounded-[1.45rem] border border-veyvio-border bg-white shadow-[0_28px_75px_rgba(23,62,72,.16)]">
        <div className="flex items-center justify-between border-b border-veyvio-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: phase.accent }} />
            <span className="text-sm font-black text-veyvio-deep">veyvio</span>
          </div>
          <span className="rounded-full bg-[#f2f6f5] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.16em] text-veyvio-deep">
            {phase.owner}
          </span>
        </div>

        {phase.key === "request" && (
          <div className="grid gap-4 p-5 sm:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[.18em] text-[#5d48b7]">New request</p>
              <h3 className="mt-2 text-2xl font-black tracking-[-.03em] text-veyvio-deep">Community access journey</h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Customer", "Northfield CT"],
                  ["Passenger", "A. Morgan"],
                  ["Pickup", "Greenbank Centre"],
                  ["Window", "09:10–09:25"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-veyvio-border p-3">
                    <p className="text-[0.56rem] font-bold uppercase tracking-[.14em] text-veyvio-muted">{label}</p>
                    <p className="mt-1 text-xs font-bold text-veyvio-deep">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#f4f0fb] p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[.16em] text-[#5d48b7]">Service requirements</p>
              {["Door-to-door assistance", "Wheelchair space", "Return journey", "Authorised contact"].map((item) => (
                <div key={item} className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-veyvio-deep">
                  <CheckMark colour="#5d48b7" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase.key === "plan" && (
          <div className="p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[.18em] text-[#2498b1]">Day schedule</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-.03em] text-veyvio-deep">Tuesday · North depot</h3>
              </div>
              <span className="rounded-full bg-[#e7f5f8] px-3 py-1.5 text-xs font-bold text-veyvio-deep">3 unassigned</span>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-veyvio-border">
              {[
                ["RUN-24017", "07:30", "BX62 BCT", "J. Patel", "Ready"],
                ["DAR-22", "08:10", "BX18 EKO", "M. Lewis", "Review"],
                ["SEND-08", "08:30", "BX71 CTY", "A. Khan", "Ready"],
                ["CT-104", "09:05", "Unassigned", "Cover required", "Action"],
              ].map(([run, time, vehicle, driver, state], index) => (
                <div key={run} className={`grid grid-cols-[.8fr_.55fr_1fr_1fr_auto] gap-3 px-3 py-3 text-[0.68rem] ${index ? "border-t border-veyvio-border" : ""}`}>
                  <strong className="text-veyvio-deep">{run}</strong>
                  <span className="text-veyvio-muted">{time}</span>
                  <span className="text-veyvio-deep">{vehicle}</span>
                  <span className="text-veyvio-deep">{driver}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${state === "Ready" ? "bg-[#e8f4d7] text-veyvio-deep" : state === "Review" ? "bg-[#fff0d9] text-[#8a5915]" : "bg-[#fbe7ea] text-[#a02d45]"}`}>
                    {state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase.key === "release" && (
          <div className="grid gap-4 p-5 sm:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-2xl bg-veyvio-deep p-4 text-white">
              <p className="text-[0.6rem] font-bold uppercase tracking-[.18em] text-white/55">Vehicle</p>
              <h3 className="mt-2 text-3xl font-black">BX62 BCT</h3>
              <p className="mt-1 text-xs text-white/65">Bay 04 · North depot</p>
              <div className="mt-6 rounded-xl bg-white/10 p-3">
                <p className="text-[0.58rem] uppercase tracking-[.14em] text-white/55">Requested for</p>
                <p className="mt-1 text-sm font-bold">RUN-24017 · 07:30</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[0.62rem] font-bold uppercase tracking-[.18em] text-veyvio-lime">Release checklist</p>
                <span className="rounded-full bg-[#e8f4d7] px-3 py-1 text-xs font-bold text-veyvio-deep">Supported</span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["Location & keys", "Bay 04 · keys present", true],
                  ["Pre-use check", "Passed 06:42", true],
                  ["Fuel", "78%", true],
                  ["Equipment", "First-aid seal verified", true],
                  ["VOR hold", "None", true],
                ].map(([label, value, pass]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-xl border border-veyvio-border px-3 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-veyvio-deep">{label}</p>
                      <p className="mt-0.5 text-[0.65rem] text-veyvio-muted">{value}</p>
                    </div>
                    <CheckMark colour={pass ? "#7ab82e" : "#e7a331"} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase.key === "live" && (
          <div className="grid min-h-[23rem] sm:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden bg-[#edf3f2]">
              <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(31deg,transparent_46%,#d1dedb_47%,#d1dedb_50%,transparent_51%),linear-gradient(102deg,transparent_47%,#dce6e4_48%,#dce6e4_51%,transparent_52%)] [background-size:74px_62px,112px_92px]" />
              <div className="absolute left-[12%] top-[62%] h-1.5 w-[72%] -rotate-12 rounded-full bg-[#2498b1]" />
              <div className="absolute left-[36%] top-[20%] h-[62%] w-1.5 rotate-[28deg] rounded-full bg-[#9bcbd4]" />
              {[
                ["left-[13%] top-[58%]", "1"],
                ["left-[42%] top-[43%]", "2"],
                ["right-[18%] top-[26%]", "3"],
              ].map(([position, label], index) => (
                <span key={label} className={`absolute ${position} flex size-8 items-center justify-center rounded-full border-4 border-white bg-veyvio-deep text-[0.65rem] font-black text-white shadow-lg`}>
                  {index + 1}
                </span>
              ))}
              <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 p-3 shadow-lg">
                <p className="text-[0.58rem] font-bold uppercase tracking-[.15em] text-veyvio-teal">CT-104 · North Loop</p>
                <p className="mt-1 text-sm font-black text-veyvio-deep">On time · GPS 12s ago</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[.18em] text-veyvio-deep">Exception queue</p>
              {[
                ["DAR-22", "Vehicle readiness review", "Review"],
                ["SEND-08", "Escort acknowledgement", "Waiting"],
                ["CT-118", "Driver connection stale", "3 min"],
              ].map(([service, issue, state], index) => (
                <div key={service} className={`py-4 ${index ? "border-t border-veyvio-border" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-xs text-veyvio-deep">{service}</strong>
                    <span className="rounded-full bg-[#eef4f3] px-2 py-1 text-[0.58rem] font-bold text-veyvio-deep">{state}</span>
                  </div>
                  <p className="mt-2 text-[0.68rem] leading-5 text-veyvio-muted">{issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase.key === "close" && (
          <div className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[.18em] text-[#b67921]">Duty closeout</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-.03em] text-veyvio-deep">RUN-24017 · completed</h3>
              </div>
              <span className="rounded-full bg-[#e8f4d7] px-3 py-1.5 text-xs font-bold text-veyvio-deep">Server accepted</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Journeys", "3 / 3"],
                ["Passengers", "8 complete"],
                ["Mileage", "84 miles"],
                ["Exceptions", "1 resolved"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-veyvio-border p-3">
                  <p className="text-[0.56rem] font-bold uppercase tracking-[.14em] text-veyvio-muted">{label}</p>
                  <p className="mt-1 text-sm font-black text-veyvio-deep">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Vehicle handback", "Bay 06 · keys returned · condition recorded"],
                ["Decision history", "Plan, revision and actual outcome retained"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#f8f4eb] p-4">
                  <div className="flex items-start gap-3">
                    <CheckMark colour="#e7a331" />
                    <div>
                      <p className="text-xs font-bold text-veyvio-deep">{label}</p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-veyvio-muted">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TransportOperationsPage() {
  const [activeKey, setActiveKey] = useState<PhaseKey>("request");
  const activePhase = phases.find((phase) => phase.key === activeKey) ?? phases[0];
  const architectureReveal = useRevealOnScroll<HTMLDivElement>();
  const phaseReveal = useRevealOnScroll<HTMLDivElement>();
  const rolesReveal = useRevealOnScroll<HTMLDivElement>();

  usePageMeta({
    title: "Connected transport operations | Veyvio",
    description:
      "Connect passenger transport requests, planning, vehicle readiness, live delivery and operational closeout with Veyvio.",
    path: "/solutions/transport-operations",
  });

  return (
    <>
      <section className="relative min-h-[calc(100svh-4.25rem)] overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_34%,rgba(122,184,46,.17),transparent_24%),radial-gradient(circle_at_82%_34%,rgba(93,72,183,.14),transparent_26%)]" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4.25rem)] max-w-[92rem] items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-veyvio-border bg-white/85 px-4 py-2 text-[0.7rem] font-black uppercase tracking-[.2em] text-veyvio-teal shadow-sm">
              <span className="size-2 rounded-full bg-veyvio-lime" />
              Solution · Transport operations
            </p>
            <h1 className="page-hero-title mt-8 max-w-[11ch] text-veyvio-deep">
              Run the whole transport day from one operation.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-veyvio-muted sm:text-xl">
              Connect the request, plan, vehicle release, frontline duty and operational outcome
              around one current record—without forcing every team into the same interface.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/demo"
                className="rounded-full bg-veyvio-lime px-7 py-3.5 text-sm font-black text-veyvio-deep shadow-[0_10px_28px_rgba(122,184,46,.25)] transition hover:-translate-y-0.5 hover:bg-veyvio-lime-dark"
                onClick={() =>
                  trackCta("demo_cta_selected", "Map our operating day", {
                    page: "/solutions/transport-operations",
                    ctaPosition: "transport-operations-hero",
                  })
                }
              >
                Map our operating day
              </Link>
              <a href="#operating-model" className="text-sm font-bold text-veyvio-deep underline decoration-veyvio-teal decoration-2 underline-offset-4">
                See the operating model
              </a>
            </div>
          </div>
          <ServiceThread />
        </div>
      </section>

      <section className="border-y border-veyvio-border bg-[#f8faf9]">
        <div className="mx-auto grid max-w-[92rem] divide-y divide-veyvio-border px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:px-10">
          {[
            ["01", "Request retained", "Customer, passenger and service context"],
            ["02", "Plan explainable", "Jobs, resources and constraints"],
            ["03", "Release supported", "Vehicle state and evidence"],
            ["04", "Outcome attributable", "Actor, reason and actual result"],
          ].map(([number, title, copy]) => (
            <div key={number} className="px-5 py-8 first:pl-0 sm:first:pl-5">
              <p className="text-xs font-black text-veyvio-teal">{number}</p>
              <h2 className="mt-3 text-lg font-black tracking-[-.02em] text-veyvio-deep">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-veyvio-muted">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="operating-model" className="scroll-mt-24 bg-white py-24 sm:py-32">
        <div ref={architectureReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-veyvio-teal">One operating model</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.96] tracking-[-.055em] text-veyvio-deep sm:text-7xl">
                Passenger transport, connected from request to close.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[1.7rem] bg-veyvio-border sm:grid-cols-2">
              {architecture.map((item, index) => (
                <article
                  key={item.number}
                  className={`group min-h-[17rem] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:bg-[#f8faf9] ${architectureReveal.visible ? "reveal is-visible" : "reveal"}`}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black" style={{ color: item.colour }}>{item.number}</span>
                    <span className="rounded-full bg-[#f1f5f4] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[.15em] text-veyvio-deep">{item.owner}</span>
                  </div>
                  <h3 className="mt-12 text-2xl font-black tracking-[-.035em] text-veyvio-deep">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-veyvio-muted">{item.copy}</p>
                  <div className="mt-6 h-1 w-12 rounded-full transition-all duration-300 group-hover:w-24" style={{ backgroundColor: item.colour }} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-veyvio-deep py-24 text-white sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <p className="max-w-6xl font-marketing text-[clamp(3rem,7vw,7.6rem)] font-extrabold leading-[.9] tracking-[-.065em]">
            The plan can change.
            <span className="block text-veyvio-lime">The operational truth should not split.</span>
          </p>
          <div className="mt-14 grid max-w-5xl gap-5 border-t border-white/15 pt-8 text-white/70 sm:grid-cols-3">
            <p className="text-lg leading-8">Store planned, revised and actual states separately.</p>
            <p className="text-lg leading-8">Keep every material action attributable.</p>
            <p className="text-lg leading-8">Explain why a gate passed, failed or was overridden.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f8f7] py-24 sm:py-32">
        <div ref={phaseReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-veyvio-teal">Run the operating day</p>
              <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-veyvio-deep sm:text-7xl">
                Follow the record as the work moves.
              </h2>
            </div>
            <p className="max-w-md text-lg leading-8 text-veyvio-muted">
              Choose a phase to see the owner, operational decision and interface context.
            </p>
          </div>

          <div role="tablist" aria-label="Operating day phases" className="mt-12 flex gap-2 overflow-x-auto pb-2">
            {phases.map((phase) => {
              const active = phase.key === activePhase.key;
              return (
                <button
                  key={phase.key}
                  type="button"
                  role="tab"
                  id={`phase-tab-${phase.key}`}
                  aria-controls="operating-phase-panel"
                  aria-selected={active}
                  onClick={() => setActiveKey(phase.key)}
                  className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black transition ${active ? "border-veyvio-deep bg-veyvio-deep text-white shadow-lg" : "border-veyvio-border bg-white text-veyvio-deep hover:border-veyvio-teal"}`}
                >
                  <span className="mr-2 text-[0.65rem] opacity-60">{phase.number}</span>
                  {phase.label}
                </button>
              );
            })}
          </div>

          <div
            id="operating-phase-panel"
            role="tabpanel"
            aria-labelledby={`phase-tab-${activePhase.key}`}
            className={`mt-6 grid overflow-hidden rounded-[1.9rem] border border-veyvio-border bg-white shadow-[0_28px_85px_rgba(23,62,72,.1)] lg:grid-cols-[.78fr_1.22fr] ${phaseReveal.visible ? "reveal is-visible" : "reveal"}`}
          >
            <div className="flex flex-col justify-between p-7 sm:p-10 lg:min-h-[41rem]">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: activePhase.accent }}>{activePhase.eyebrow}</p>
                  <span className="rounded-full bg-[#f2f6f5] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[.13em] text-veyvio-deep">{activePhase.owner}</span>
                </div>
                <h3 className="mt-8 font-marketing text-4xl font-extrabold leading-[1] tracking-[-.045em] text-veyvio-deep sm:text-5xl">{activePhase.title}</h3>
                <p className="mt-6 text-base leading-7 text-veyvio-muted">{activePhase.copy}</p>
                <ul className="mt-8 space-y-4">
                  {activePhase.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm font-semibold leading-6 text-veyvio-deep">
                      <CheckMark colour={activePhase.accent} />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <Link to={activePhase.key === "release" ? "/platform/yard" : activePhase.key === "live" || activePhase.key === "plan" || activePhase.key === "request" ? "/platform/command" : "/platform/driver"} className="mt-10 inline-flex w-fit items-center gap-2 text-sm font-black text-veyvio-deep underline decoration-2 underline-offset-4" style={{ textDecorationColor: activePhase.accent }}>
                Explore the owning application <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="p-3 sm:p-5">
              <PhaseVisual phase={activePhase} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div ref={rolesReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_.7fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-veyvio-teal">Role-specific applications</p>
              <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-veyvio-deep sm:text-7xl">
                The same operation. A focused view for each role.
              </h2>
            </div>
            <p className="text-lg leading-8 text-veyvio-muted">
              The applications do not talk directly to one another. Each one uses the same governed
              platform services and receives the context its role is permitted to use.
            </p>
          </div>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {roleStories.map((story, index) => (
              <article
                key={story.label}
                className={`group flex min-h-[31rem] flex-col justify-between overflow-hidden rounded-[1.7rem] border border-veyvio-border bg-white p-7 transition duration-300 hover:-translate-y-2 hover:shadow-[0_28px_65px_rgba(23,62,72,.13)] ${rolesReveal.visible ? "reveal is-visible" : "reveal"}`}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <div>
                  <div className="h-2 w-20 rounded-full transition-all duration-300 group-hover:w-32" style={{ backgroundColor: story.colour }} />
                  <p className="mt-10 text-xs font-black uppercase tracking-[.18em]" style={{ color: story.colour }}>{story.label}</p>
                  <h3 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-.04em] text-veyvio-deep">{story.title}</h3>
                  <p className="mt-5 text-base leading-7 text-veyvio-muted">{story.copy}</p>
                </div>
                <Link to={story.href} className="mt-10 inline-flex items-center gap-2 text-sm font-black text-veyvio-deep">
                  {story.link} <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f2f6f5] py-24 sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[.2em] text-veyvio-teal">A clearer operating model</p>
            <h2 className="mt-4 font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-veyvio-deep sm:text-7xl">
              Connect the hand-offs without hiding the ownership.
            </h2>
          </div>
          <div className="mt-14 grid overflow-hidden rounded-[1.7rem] border border-veyvio-border bg-white lg:grid-cols-2">
            <div className="p-7 sm:p-10">
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#a65b69]">When operational state is fragmented</p>
              <h3 className="mt-5 text-3xl font-black tracking-[-.04em] text-veyvio-deep">Teams reconcile the day by phone, paper and memory.</h3>
              <ul className="mt-8 space-y-4">
                {["Passenger context is re-keyed", "Readiness is asserted verbally", "Live changes overwrite the plan", "Evidence is gathered after the event"].map((item) => (
                  <li key={item} className="flex items-center gap-3 border-b border-veyvio-border pb-4 text-sm font-semibold text-veyvio-muted">
                    <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-[#f8e8eb] text-xs font-black text-[#a65b69]">×</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-veyvio-deep p-7 text-white sm:p-10">
              <p className="text-xs font-black uppercase tracking-[.18em] text-veyvio-lime">With one governed operational record</p>
              <h3 className="mt-5 text-3xl font-black tracking-[-.04em]">Every role contributes the state the next decision needs.</h3>
              <ul className="mt-8 space-y-4">
                {["Request context follows the work", "Readiness has a supported reason", "Plan, revision and actual remain distinct", "Evidence stays tied to the action"].map((item) => (
                  <li key={item} className="flex items-center gap-3 border-b border-white/15 pb-4 text-sm font-semibold text-white/75">
                    <CheckMark />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto grid max-w-[92rem] gap-12 px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-veyvio-teal">Solution questions</p>
            <h2 className="mt-4 font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-veyvio-deep sm:text-6xl">
              Understand the operating boundary.
            </h2>
          </div>
          <div className="divide-y divide-veyvio-border border-y border-veyvio-border">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-black text-veyvio-deep">
                  {faq.question}
                  <span aria-hidden="true" className="text-2xl font-light transition group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pt-4 text-base leading-7 text-veyvio-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-veyvio-lime py-20 sm:py-28">
        <div className="mx-auto grid max-w-[92rem] items-end gap-10 px-6 lg:grid-cols-[1fr_auto] lg:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-veyvio-deep/65">Bring the real operating day</p>
            <h2 className="mt-4 max-w-5xl font-marketing text-5xl font-extrabold leading-[.93] tracking-[-.055em] text-veyvio-deep sm:text-7xl">
              Show us where the service loses context.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-veyvio-deep/75">
              We can map the current request-to-close workflow and shape a controlled pilot around
              the hand-offs, gates and evidence your operation needs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="rounded-full bg-veyvio-deep px-7 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
              onClick={() =>
                trackCta("demo_cta_selected", "Book a transport workshop", {
                  page: "/solutions/transport-operations",
                  ctaPosition: "transport-operations-footer",
                })
              }
            >
              Book a transport workshop
            </Link>
            <Link to="/solutions" className="rounded-full border border-veyvio-deep/25 bg-white/70 px-7 py-3.5 text-sm font-black text-veyvio-deep transition hover:bg-white">
              All solutions
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
