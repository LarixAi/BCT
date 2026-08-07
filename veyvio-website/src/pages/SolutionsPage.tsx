import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type SolutionKey = "operations" | "readiness" | "compliance" | "depots" | "accessible";

type Solution = {
  key: SolutionKey;
  number: string;
  short: string;
  eyebrow: string;
  title: string;
  problem: string;
  response: string;
  href: string;
  accent: string;
  steps: [string, string, string][];
};

const solutions: Solution[] = [
  {
    key: "operations",
    number: "01",
    short: "Transport operations",
    eyebrow: "From request to completed duty",
    title: "Run the service from one current operational picture.",
    problem:
      "Controllers lose time when bookings, driver availability, vehicle state and live progress must be reconciled across separate tools.",
    response:
      "Veyvio connects the request, plan, assigned resources, frontline progress and outcome around one governed record.",
    href: "/solutions/transport-operations",
    accent: "#4a8fa3",
    steps: [
      ["Command", "Plan", "Booking → duty"],
      ["Yard", "Prepare", "Vehicle → ready"],
      ["Driver", "Deliver", "Stops → complete"],
    ],
  },
  {
    key: "readiness",
    number: "02",
    short: "Vehicle readiness",
    eyebrow: "A supported release decision",
    title: "Know why a vehicle is ready before it enters the plan.",
    problem:
      "Readiness is often asserted manually or discovered too late, after a controller or driver already depends on the vehicle.",
    response:
      "Yard checks location, condition, fuel or charge, equipment, checks and VOR state, then shares the supported outcome with Command.",
    href: "/solutions/vehicle-readiness",
    accent: "#7ab82e",
    steps: [
      ["Driver", "Return", "Handback context"],
      ["Yard", "Resolve", "Check → release"],
      ["Command", "Assign", "Current readiness"],
    ],
  },
  {
    key: "compliance",
    number: "03",
    short: "Safety & compliance",
    eyebrow: "Safety inside the workflow",
    title: "Put eligibility, checks and evidence before the unsafe action.",
    problem:
      "Documents and checks create little protection when they sit in folders, separate from the assignment or release decision.",
    response:
      "Configured rules can surface blockers, warnings and controlled overrides at the point where operational work moves forward.",
    href: "/solutions/fleet-safety-compliance",
    accent: "#5d48b7",
    steps: [
      ["Rules", "Evaluate", "Current evidence"],
      ["Command", "Gate", "Explain decision"],
      ["Audit", "Retain", "Actor + reason"],
    ],
  },
  {
    key: "depots",
    number: "04",
    short: "Multi-depot",
    eyebrow: "Local control, governed boundaries",
    title: "Keep each depot focused without fragmenting the operation.",
    problem:
      "Local spreadsheets and workarounds make it difficult to know which vehicles, people and decisions belong to each site.",
    response:
      "Company, depot and role boundaries scope operational access while authorised leaders retain a consistent cross-depot view.",
    href: "/solutions/multi-depot",
    accent: "#2498b1",
    steps: [
      ["Depot", "Scope", "People + vehicles"],
      ["Teams", "Operate", "Focused views"],
      ["Leaders", "Understand", "Across depots"],
    ],
  },
  {
    key: "accessible",
    number: "05",
    short: "Accessible transport",
    eyebrow: "Passenger context that travels",
    title: "Carry the right requirement into the duty—not into a phone call.",
    problem:
      "Passenger needs can be captured at booking but disappear before the driver or escort receives the work.",
    response:
      "Controlled passenger requirements remain connected to the booking, duty and authorised frontline view throughout delivery.",
    href: "/solutions/accessible-transport",
    accent: "#ef6b5c",
    steps: [
      ["Booking", "Capture", "Transport need"],
      ["Command", "Plan", "Right resources"],
      ["Driver", "Deliver", "Relevant context"],
    ],
  },
];

const outcomeCards = [
  {
    number: "01",
    title: "Plan once",
    copy: "Move the request into jobs, runs and duties without rebuilding its context at each stage.",
    colour: "#7ab82e",
  },
  {
    number: "02",
    title: "Gate before release",
    copy: "Bring eligibility and vehicle readiness into assignment and release decisions.",
    colour: "#5d48b7",
  },
  {
    number: "03",
    title: "Respond with context",
    copy: "Give controllers the service, passenger and constraint behind the exception.",
    colour: "#2498b1",
  },
  {
    number: "04",
    title: "Prove what happened",
    copy: "Retain planned, revised and actual states with the actor and reason behind change.",
    colour: "#ef6b5c",
  },
];

const workflow = [
  ["01", "Request", "Capture service and passenger context", "Command"],
  ["02", "Plan", "Build feasible work and assign resources", "Command"],
  ["03", "Prepare", "Locate, inspect and release the vehicle", "Yard"],
  ["04", "Deliver", "Guide the duty and record progress", "Driver"],
  ["05", "Close", "Return state, evidence and outcome", "Shared record"],
];

const solutionLinks = [
  ["Transport operations", "Keep planning, dispatch and live delivery connected.", "/solutions/transport-operations", "#4a8fa3"],
  ["Vehicle readiness", "Know whether the physical vehicle supports the planned work.", "/solutions/vehicle-readiness", "#7ab82e"],
  ["Fleet safety & compliance", "Put checks and evidence inside daily operational decisions.", "/solutions/fleet-safety-compliance", "#5d48b7"],
  ["Workforce readiness", "Confirm role and driver eligibility before assignment.", "/solutions/workforce-readiness", "#ef6b5c"],
  ["Multi-depot operations", "Scope teams and assets locally while retaining governed visibility.", "/solutions/multi-depot", "#2498b1"],
  ["Accessible transport", "Carry authorised passenger requirements into the frontline duty.", "/solutions/accessible-transport", "#e7a331"],
  ["Audit & evidence", "Retrieve the history of checks, overrides and operational outcomes.", "/solutions/audit-evidence", "#173e48"],
] as const;

const faqs = [
  {
    question: "What makes Veyvio a connected solution?",
    answer:
      "Command, Driver and Yard are separate role-specific applications, but they use the same governed backend services and operational record. The applications do not maintain competing versions of eligibility, readiness or duty state.",
  },
  {
    question: "Do we need to adopt every Veyvio application at once?",
    answer:
      "The right pilot scope depends on the operational problem being addressed. A consultation maps the current workflow, identifies the critical hand-offs and defines which applications and controls are needed for a controlled pilot.",
  },
  {
    question: "Does Veyvio guarantee regulatory compliance?",
    answer:
      "No. Veyvio can help organisations configure checks, retain evidence and make operational controls visible, but each operator remains responsible for its legal, regulatory and safeguarding obligations.",
  },
  {
    question: "Are all solutions generally available?",
    answer:
      "Command, Driver and Yard are presented as pilot products. Maintenance and customer access are coming soon. Exact capability and pilot scope are confirmed during consultation.",
  },
];

function Check() {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f4d7] text-[0.65rem] font-black text-veyvio-deep">
      ✓
    </span>
  );
}

function MiniCommand() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#cddcdf] bg-white shadow-[0_24px_60px_rgba(23,62,72,.18)]">
      <div className="flex h-10 items-center justify-between border-b border-[#dbe5e7] px-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-veyvio-lime" />
          <span className="text-[0.5rem] font-black text-veyvio-deep">veyvio</span>
        </div>
        <span className="rounded-full bg-[#eaf1f2] px-2 py-1 text-[0.38rem] font-black uppercase tracking-[.12em] text-veyvio-muted">
          Command
        </span>
      </div>
      <div className="flex min-h-56">
        <div className="w-16 bg-veyvio-deep p-2">
          <span className="mx-auto mt-1 block size-7 rounded-lg bg-white/10" />
          {[1, 2, 3, 4].map((item) => (
            <span key={item} className="mx-auto mt-4 block h-1.5 w-7 rounded-full bg-white/20" />
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4">
          <p className="text-[0.42rem] font-black uppercase tracking-[.14em] text-veyvio-teal">Live operations</p>
          <p className="mt-1.5 text-sm font-extrabold text-veyvio-deep">Morning service</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Live", "18"], ["Ready", "24/27"], ["Alerts", "3"]].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#dbe5e7] p-2">
                <p className="text-[0.36rem] uppercase tracking-[.1em] text-veyvio-muted">{label}</p>
                <p className="mt-1 text-xs font-extrabold text-veyvio-deep">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              ["CT-104 · North Loop", "On time"],
              ["RUN-24017 · School", "Ready"],
              ["DAR-22 · East zone", "Review"],
            ].map(([name, status], index) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-[#f4f7f7] px-2.5 py-2">
                <span className="text-[0.43rem] font-bold text-veyvio-deep">{name}</span>
                <span className={`rounded-full px-2 py-1 text-[0.35rem] font-bold ${index === 2 ? "bg-[#fff0dc] text-[#9b5c12]" : "bg-[#e8f4d7] text-veyvio-deep"}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectedHeroVisual() {
  return (
    <div className="relative mx-auto min-h-[34rem] w-full max-w-[42rem]">
      <div className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e7f2f3]" />
      <div className="absolute left-[3%] top-[7%] h-28 w-24 rounded-3xl bg-[#dff1c8] blur-2xl" />
      <div className="absolute right-[2%] top-[4%] h-40 w-32 rounded-3xl bg-[#ddd5f4] blur-2xl" />
      <div className="absolute left-[13%] top-[15%] w-[74%] rotate-1">
        <MiniCommand />
      </div>
      <div className="absolute left-0 top-[18%] z-20 rounded-2xl bg-[#5d48b7] p-4 text-white shadow-xl">
        <p className="text-[0.5rem] uppercase tracking-[.13em] text-white/55">Request</p>
        <p className="mt-1 text-lg font-extrabold">CT-104</p>
        <p className="mt-0.5 text-[0.56rem] text-white/65">8 passenger jobs</p>
      </div>
      <div className="absolute bottom-[14%] left-[8%] z-20 w-44 rounded-2xl border border-[#dbe5e7] bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[0.48rem] font-black uppercase tracking-[.12em] text-veyvio-teal">Yard release</span>
          <span className="size-2 rounded-full bg-veyvio-lime" />
        </div>
        <p className="mt-2 text-sm font-extrabold text-veyvio-deep">BX62 BCT</p>
        <p className="mt-1 text-[0.52rem] text-veyvio-muted">Bay 04 · Ready</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7edef]">
          <div className="h-full w-full rounded-full bg-veyvio-lime" />
        </div>
      </div>
      <div className="absolute bottom-[8%] right-[2%] z-20 w-48 rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.48rem] font-black uppercase tracking-[.12em] text-[#9fd9e5]">Driver progress</p>
        <p className="mt-2 text-sm font-extrabold">Greenbank Centre</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-veyvio-lime text-[0.56rem] font-black text-veyvio-deep">3</span>
          <div>
            <p className="text-[0.48rem] font-bold">Next stop</p>
            <p className="text-[0.43rem] text-white/50">09:22 · on time</p>
          </div>
        </div>
      </div>
      <div className="absolute right-[3%] top-[23%] z-20 rounded-2xl bg-veyvio-lime px-4 py-3 text-veyvio-deep shadow-xl">
        <p className="text-[0.45rem] uppercase tracking-[.13em] opacity-60">Shared state</p>
        <p className="mt-1 text-sm font-extrabold">Ready to publish</p>
      </div>
    </div>
  );
}

function SolutionDiagram({ solution }: { solution: Solution }) {
  return (
    <div className="relative min-h-[25rem] overflow-hidden rounded-[1.75rem] border border-white/70 p-6 shadow-[0_24px_70px_rgba(23,62,72,.1)] sm:p-8" style={{ backgroundColor: `${solution.accent}12` }}>
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#b7cdd2_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[.13em] text-veyvio-deep shadow-sm">Connected workflow</span>
          <span className="font-marketing text-6xl font-extrabold tracking-[-.08em]" style={{ color: `${solution.accent}33` }}>{solution.number}</span>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {solution.steps.map(([app, action, detail], index) => (
            <div key={app} className="relative rounded-2xl bg-white p-4 shadow-[0_16px_36px_rgba(23,62,72,.09)]">
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-xl text-[0.6rem] font-black text-white" style={{ backgroundColor: solution.accent }}>{index + 1}</span>
                <span className="text-[0.48rem] font-black uppercase tracking-[.12em] text-veyvio-muted">{app}</span>
              </div>
              <p className="mt-12 font-marketing text-xl font-extrabold text-veyvio-deep">{action}</p>
              <p className="mt-1 text-xs text-veyvio-muted">{detail}</p>
              {index < solution.steps.length - 1 ? (
                <span className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full bg-veyvio-deep text-xs text-white sm:flex">→</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-veyvio-deep px-5 py-4 text-white">
          <div>
            <p className="text-[0.5rem] font-black uppercase tracking-[.13em] text-[#9fd9e5]">One governed outcome</p>
            <p className="mt-1 text-sm font-extrabold">Current, attributable and role-scoped</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-veyvio-lime font-black text-veyvio-deep">✓</span>
        </div>
      </div>
    </div>
  );
}

function ReadinessVisual() {
  const gates = [
    ["Known location", true, "Bay 04"],
    ["Yard check", true, "Passed 06:42"],
    ["Fuel", true, "78%"],
    ["Equipment", false, "First-aid seal"],
    ["VOR hold", true, "None"],
  ];
  return (
    <div className="relative min-h-[34rem] overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_25px_70px_rgba(23,62,72,.16)] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[.15em] text-veyvio-teal">Vehicle release</p>
          <h3 className="mt-2 font-marketing text-3xl font-extrabold text-veyvio-deep">BX62 BCT</h3>
          <p className="mt-1 text-sm text-veyvio-muted">Morning service · RUN-24017</p>
        </div>
        <span className="rounded-full bg-[#fff0dc] px-3 py-1.5 text-xs font-bold text-[#9b5c12]">1 action</span>
      </div>
      <div className="mt-7 grid gap-2">
        {gates.map(([label, passed, detail]) => (
          <div key={String(label)} className="flex items-center gap-3 rounded-xl bg-[#f4f7f7] p-3.5">
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${passed ? "bg-[#e8f4d7] text-[#5d9221]" : "bg-[#fff0dc] text-[#9b5c12]"}`}>{passed ? "✓" : "!"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-veyvio-deep">{label}</p>
              <p className="mt-0.5 text-xs text-veyvio-muted">{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <button disabled className="mt-5 w-full cursor-not-allowed rounded-xl bg-[#dce4e5] px-4 py-3 text-sm font-bold text-veyvio-muted">Resolve equipment before release</button>
      <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-[#dff1c8] blur-2xl" />
    </div>
  );
}

function Questions() {
  return (
    <section className="border-t border-veyvio-border bg-white py-20 sm:py-28">
      <div className="section-container grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Solution questions</p>
          <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">Start with the operating problem.</h2>
        </div>
        <div className="divide-y divide-veyvio-border border-y border-veyvio-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-marketing text-lg font-bold text-veyvio-deep">{faq.question}<span className="text-2xl font-light transition group-open:rotate-45">+</span></summary>
              <p className="max-w-2xl pb-2 pt-4 leading-7 text-veyvio-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionsPage() {
  usePageMeta({
    title: "Solutions for connected transport operations",
    description: "Connect planning, vehicle readiness, frontline delivery and operational evidence with Veyvio.",
    path: "/solutions",
  });

  const [activeKey, setActiveKey] = useState<SolutionKey>("operations");
  const active = solutions.find((solution) => solution.key === activeKey) ?? solutions[0];
  const outcomeReveal = useRevealOnScroll<HTMLDivElement>();
  const pressureReveal = useRevealOnScroll<HTMLDivElement>();
  const workflowReveal = useRevealOnScroll<HTMLDivElement>();

  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute -left-24 top-24 size-72 rounded-full bg-[#dff1c8] blur-3xl" />
        <div className="absolute -right-20 top-16 size-80 rounded-full bg-[#ddd5f4] blur-3xl" />
        <div className="section-container relative grid min-h-[calc(100svh-5rem)] gap-12 py-14 min-[900px]:grid-cols-[.88fr_1.12fr] min-[900px]:items-center">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-veyvio-border bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-veyvio-teal shadow-sm">
              <span className="size-2 rounded-full bg-veyvio-lime" />
              Solutions · Connected operations
            </div>
            <h1 className="page-hero-title text-veyvio-deep">
              Solve the
              <br />
              <span className="text-veyvio-lime">hand-offs</span> that
              <br />
              disconnect the day.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-veyvio-muted">
              Connect planning, vehicle readiness, frontline delivery and evidence around one current operational record—without asking every role to use the same interface.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/demo" className="btn-primary" onClick={() => trackCta("demo_cta_selected", "Map our operation", { ctaPosition: "solutions-hero" })}>Map our operation</Link>
              <a href="#priorities" className="font-semibold text-veyvio-deep underline decoration-veyvio-teal underline-offset-4">Explore solution priorities</a>
            </div>
          </div>
          <ConnectedHeroVisual />
        </div>
        <div className="section-container relative grid gap-px overflow-hidden rounded-t-[1.5rem] bg-veyvio-border sm:grid-cols-2 lg:grid-cols-4">
          {outcomeCards.map((card) => (
            <article key={card.number} className="group min-h-48 bg-white p-6 transition hover:bg-veyvio-surface">
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: card.colour }}>{card.number}</span>
                <span className="h-1 w-10 rounded-full" style={{ backgroundColor: card.colour }} />
              </div>
              <h2 className="mt-8 font-marketing text-xl font-extrabold text-veyvio-deep">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-veyvio-muted">{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section ref={outcomeReveal.ref} className="overflow-hidden bg-veyvio-deep py-24 text-white sm:py-32">
        <div className="section-container">
          <div className={`mx-auto max-w-5xl text-center ${outcomeReveal.visible ? "reveal is-visible" : "reveal"}`}>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-[#9fd9e5]">The connected operating model</p>
            <h2 className="mt-5 font-marketing text-[clamp(3rem,7vw,7rem)] font-extrabold leading-[.94] tracking-[-.055em]">
              One fact.
              <br />
              <span className="text-veyvio-lime">One governed answer.</span>
              <br />
              Every authorised view.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/65">
              Command, Driver and Yard remain focused applications. Shared rules and services keep readiness, eligibility and duty state from drifting apart.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-3 md:grid-cols-3">
            {[
              ["Command", "Plans and governs the live operation", "Web-first"],
              ["Yard", "Controls physical vehicle readiness", "Mobile-first"],
              ["Driver", "Guides frontline delivery and handback", "Mobile-first"],
            ].map(([name, copy, mode], index) => (
              <article key={name} className={`rounded-[1.5rem] border border-white/15 bg-white/[.06] p-7 transition hover:-translate-y-1 hover:bg-white/[.1] ${outcomeReveal.visible ? "reveal is-visible" : "reveal"}`} style={{ transitionDelay: `${index * 90}ms` }}>
                <div className="flex items-center justify-between"><span className="font-marketing text-4xl font-extrabold text-white/15">0{index + 1}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#9fd9e5]">{mode}</span></div>
                <h3 className="mt-16 font-marketing text-3xl font-extrabold">{name}</h3>
                <p className="mt-3 leading-7 text-white/60">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="priorities" ref={pressureReveal.ref} className="scroll-mt-24 bg-veyvio-surface py-20 sm:py-28">
        <div className="section-container">
          <div className={`grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end ${pressureReveal.visible ? "reveal is-visible" : "reveal"}`}>
            <div><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Choose the operational pressure</p><h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">Where does the hand-off break today?</h2></div>
            <p className="max-w-xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">Select a priority to see the problem, the connected response and the roles involved.</p>
          </div>
          <div className="mt-10 flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="Solution priorities">
            {solutions.map((solution) => (
              <button key={solution.key} type="button" role="tab" aria-selected={solution.key === activeKey} onClick={() => setActiveKey(solution.key)} className={`min-w-max rounded-full border px-4 py-2.5 text-sm font-bold transition ${solution.key === activeKey ? "border-veyvio-deep bg-veyvio-deep text-white shadow-lg" : "border-veyvio-border bg-white text-veyvio-deep hover:border-veyvio-teal"}`}><span className="mr-2 text-[.62rem] opacity-55">{solution.number}</span>{solution.short}</button>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-[2rem] border border-veyvio-border bg-white shadow-[0_25px_70px_rgba(23,62,72,.1)]">
            <div className="grid min-[940px]:grid-cols-[.84fr_1.16fr]">
              <div className="flex min-h-[35rem] flex-col justify-center p-7 sm:p-12">
                <p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: active.accent }}>{active.eyebrow}</p>
                <h3 className="mt-4 font-marketing text-[clamp(2rem,3.2vw,3.2rem)] font-extrabold tracking-[-.04em] text-veyvio-deep">{active.title}</h3>
                <div className="mt-7 border-l-2 pl-5" style={{ borderColor: active.accent }}>
                  <p className="text-xs font-black uppercase tracking-[.15em] text-veyvio-muted">The operational gap</p>
                  <p className="mt-2 leading-7 text-veyvio-muted">{active.problem}</p>
                </div>
                <div className="mt-6 flex items-start gap-3"><Check /><p className="font-semibold leading-7 text-veyvio-deep">{active.response}</p></div>
                <Link to={active.href} className="btn-secondary mt-8 w-fit">Explore this solution</Link>
              </div>
              <div key={active.key} className="flex min-h-[39rem] items-center p-5 sm:p-8 animate-[fadeIn_.35s_ease-out]"><SolutionDiagram solution={active} /></div>
            </div>
            <div className="h-2" style={{ backgroundColor: active.accent }} />
          </div>
        </div>
      </section>

      <section ref={workflowReveal.ref} className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-4xl text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">One connected workflow</p><h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">The record moves with the operation.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">Each role receives the current state and returns the context the next decision needs.</p></div>
          <div className="mt-14 grid gap-3 md:grid-cols-5">
            {workflow.map(([number, title, copy, owner], index) => (
              <article key={number} className={`group relative min-h-[23rem] overflow-hidden rounded-[1.4rem] border border-veyvio-border bg-white p-5 transition duration-300 hover:-translate-y-2 hover:border-veyvio-teal hover:shadow-[0_24px_55px_rgba(23,62,72,.13)] ${workflowReveal.visible ? "reveal is-visible" : "reveal"}`} style={{ transitionDelay: `${index * 70}ms` }}>
                <div className="flex items-start justify-between"><span className="font-marketing text-5xl font-extrabold tracking-[-.07em] text-[#dbe7e9] transition group-hover:text-[#a5d2db]">{number}</span><span className="rounded-full bg-veyvio-surface px-2.5 py-1 text-[.58rem] font-bold text-veyvio-muted">{owner}</span></div>
                <div className="mt-28"><h3 className="font-marketing text-2xl font-bold text-veyvio-deep">{title}</h3><p className="mt-3 text-sm leading-6 text-veyvio-muted">{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#5d48b7] py-20 text-white sm:py-28">
        <div className="section-container grid gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-[#dcd4f5]">A concrete solution</p>
            <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-6xl">Vehicle readiness should be decided before assignment.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">Yard is where the physical vehicle becomes an operational fact: known location, passed check, adequate fuel or charge, complete equipment and no active VOR hold.</p>
            <ul className="mt-8 space-y-4">
              {["Driver returns condition and handback context", "Yard resolves physical readiness and evidence", "Command receives the supported state before release"].map((item) => <li key={item} className="flex items-center gap-3 font-semibold"><span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-xs">✓</span>{item}</li>)}
            </ul>
            <Link to="/solutions/vehicle-readiness" className="mt-9 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-veyvio-deep transition hover:-translate-y-.5">Explore vehicle readiness</Link>
          </div>
          <ReadinessVisual />
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="section-container">
          <div className="max-w-4xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Explore every solution</p><h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">Start where the operation feels disconnected.</h2></div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {solutionLinks.map(([title, copy, href, colour], index) => (
              <Link key={title} to={href} className={`group relative min-h-72 overflow-hidden rounded-[1.5rem] border border-veyvio-border bg-white p-6 transition hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(23,62,72,.13)] ${index === 0 ? "lg:col-span-2" : ""}`}>
                <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: colour }} />
                <div className="flex items-center justify-between"><span className="font-marketing text-5xl font-extrabold tracking-[-.08em] text-[#e2eaec]">0{index + 1}</span><span className="flex size-10 items-center justify-center rounded-full border border-veyvio-border text-lg text-veyvio-deep transition group-hover:border-veyvio-deep group-hover:bg-veyvio-deep group-hover:text-white">↗</span></div>
                <div className="mt-20"><h3 className="font-marketing text-2xl font-extrabold text-veyvio-deep">{title}</h3><p className="mt-3 max-w-xl leading-7 text-veyvio-muted">{copy}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-veyvio-surface py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Separate views, shared operational truth</p><h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">The right interface for each role.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">The platform connects the record without forcing controllers, depot teams and drivers into one generic application.</p></div>
          <div className="mx-auto mt-10 max-w-5xl"><img src="/images/sections/veyvio-connected-apps-v1.png" alt="Veyvio Command, Yard and Driver interfaces shown across laptop, tablet and phone" className="h-auto w-full" loading="lazy" /></div>
          <div className="mt-5 flex justify-center"><Link to="/platform" className="btn-secondary">Explore the platform</Link></div>
        </div>
      </section>

      <Questions />

      <section className="bg-veyvio-lime py-20 sm:py-24">
        <div className="section-container grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-deep/65">Map the real workflow</p><h2 className="mt-3 max-w-4xl font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">Bring us the hand-off that causes the most friction.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-veyvio-deep/70">We can walk from the current process to a controlled pilot scope—using your service, fleet, depot and evidence requirements.</p></div>
          <div className="flex flex-wrap gap-3 lg:justify-end"><Link to="/demo" className="inline-flex min-h-11 min-w-[11rem] items-center justify-center rounded-full bg-veyvio-deep px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-.5 hover:bg-[#0e3038]" onClick={() => trackCta("demo_cta_selected", "Book a solutions workshop", { ctaPosition: "solutions-footer" })}>Book a solutions workshop</Link><Link to="/contact" className="inline-flex min-h-11 min-w-[9rem] items-center justify-center rounded-full border border-veyvio-deep/30 px-6 py-2.5 text-sm font-semibold text-veyvio-deep transition hover:border-veyvio-deep hover:bg-white">Talk to the team</Link></div>
        </div>
      </section>
    </>
  );
}
