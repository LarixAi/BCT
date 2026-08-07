import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type FeatureKey = "live" | "dispatch" | "schedule" | "bookings" | "evidence";

type Feature = {
  key: FeatureKey;
  index: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  bullets: string[];
  accent: string;
};

const features: Feature[] = [
  {
    key: "live",
    index: "01",
    label: "Live operations",
    eyebrow: "An exception-led control room",
    title: "See the service that needs attention now.",
    copy:
      "Follow active duties, location freshness and emerging exceptions without asking controllers to reconcile separate views.",
    bullets: [
      "Active duties, vehicles and service state",
      "Late starts, missed checks and lost connectivity",
      "A focused rail for the selected duty",
    ],
    accent: "#4a8fa3",
  },
  {
    key: "dispatch",
    index: "02",
    label: "Dispatch",
    eyebrow: "Controlled intervention",
    title: "Change the plan without losing the reason.",
    copy:
      "Assign, publish and re-plan duties with eligibility, vehicle readiness and operational conflicts visible before the decision is made.",
    bullets: [
      "Unassigned-to-complete dispatch board",
      "Driver and vehicle readiness gates",
      "Reason-coded transfers and overrides",
    ],
    accent: "#7ab82e",
  },
  {
    key: "schedule",
    index: "03",
    label: "Schedule",
    eyebrow: "A feasible operating plan",
    title: "Build duties around real people and vehicles.",
    copy:
      "Move between day, week and month planning while keeping attendance, leave, depot context and scheduling conflicts in view.",
    bullets: [
      "Day, week and month planning views",
      "Driver attendance and cover decisions",
      "Conflict and availability context",
    ],
    accent: "#2498b1",
  },
  {
    key: "bookings",
    index: "04",
    label: "Bookings",
    eyebrow: "From request to executable work",
    title: "Keep passenger context connected to delivery.",
    copy:
      "Capture ordinary, Dial-a-Ride, school and recurring transport requests, then move them into jobs, runs and duties without re-keying the story.",
    bullets: [
      "Progressive booking and save-and-return",
      "Single, return, recurring and multi-stop journeys",
      "Visible scheduling state and warnings",
    ],
    accent: "#173e48",
  },
  {
    key: "evidence",
    index: "05",
    label: "Evidence",
    eyebrow: "A decision history you can inspect",
    title: "Keep planned, revised and actual states apart.",
    copy:
      "Every material intervention can retain the actor, reason and outcome so teams can understand what happened without reverse-engineering yesterday.",
    bullets: [
      "Attributable operational history",
      "Original plan preserved through changes",
      "Company and role boundaries enforced",
    ],
    accent: "#5d48b7",
  },
];

const benefits = [
  {
    number: "01",
    title: "One operational picture",
    copy: "Bookings, duties, drivers, vehicles and exceptions share the same governed record.",
  },
  {
    number: "02",
    title: "Safety in the workflow",
    copy: "Eligibility and readiness checks sit inside assignment and release—not in a separate reminder.",
  },
  {
    number: "03",
    title: "Actions with context",
    copy: "Controllers can see the service, passenger need and constraint behind the alert before acting.",
  },
  {
    number: "04",
    title: "Truth after the event",
    copy: "Planned, revised and actual states remain distinct so the decision history stays meaningful.",
  },
];

const workflow = [
  ["01", "Capture", "Request, passenger and customer context"],
  ["02", "Plan", "Jobs, runs, routes and operating constraints"],
  ["03", "Check", "Driver eligibility and vehicle readiness"],
  ["04", "Operate", "Live progress, exceptions and intervention"],
  ["05", "Close", "Outcome, handback and attributable evidence"],
];

const roles = [
  {
    title: "Controllers",
    copy: "Own the live service, triage exceptions and make controlled interventions.",
    stat: "Live view",
  },
  {
    title: "Schedulers",
    copy: "Build feasible work with driver, vehicle, depot and passenger context visible.",
    stat: "Plan ahead",
  },
  {
    title: "Managers",
    copy: "Understand readiness, service pressure and the decisions shaping the operation.",
    stat: "Shared truth",
  },
  {
    title: "Compliance teams",
    copy: "Inspect gates, evidence and overrides without reconstructing the operational day.",
    stat: "Traceable",
  },
];

const faqs = [
  {
    question: "What is Veyvio Command?",
    answer:
      "Veyvio Command is the web-first operational control application in the Veyvio platform. It is designed for controllers, schedulers, managers and compliance teams planning and governing passenger transport.",
  },
  {
    question: "Is Command only a dispatch screen?",
    answer:
      "No. Dispatch is one part of the product. The intended operating model connects bookings, jobs, runs, duties, scheduling, live operations, exceptions, people, fleet and evidence around one operational record.",
  },
  {
    question: "How does Command support safer decisions?",
    answer:
      "Assignment and release flows can surface driver eligibility, vehicle readiness and scheduling conflicts before work moves forward. Where an authorised override is allowed, the reason and actor remain part of the history.",
  },
  {
    question: "Is every capability shown generally available?",
    answer:
      "Command is currently presented as a pilot product. The page describes the operating model and current product direction; availability and pilot scope are confirmed during consultation.",
  },
];

function CheckMark() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f4d7] text-xs font-black text-veyvio-deep"
    >
      ✓
    </span>
  );
}

function MiniMap() {
  return (
    <div className="relative h-full min-h-48 overflow-hidden rounded-[1.15rem] bg-[#eef4f3]">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(28deg,transparent_46%,#d3dfdc_47%,#d3dfdc_50%,transparent_51%),linear-gradient(102deg,transparent_47%,#dce6e4_48%,#dce6e4_51%,transparent_52%)] [background-size:78px_64px,104px_88px]" />
      <div className="absolute left-[13%] top-[58%] h-1.5 w-[74%] -rotate-12 rounded-full bg-[#4a8fa3]" />
      <div className="absolute left-[34%] top-[24%] h-[58%] w-1.5 rotate-[31deg] rounded-full bg-[#9ccbd4]" />
      {[
        ["left-[16%] top-[52%]", "bg-veyvio-deep"],
        ["left-[42%] top-[45%]", "bg-veyvio-lime"],
        ["right-[17%] top-[30%]", "bg-[#2498b1]"],
        ["right-[25%] bottom-[18%]", "bg-veyvio-deep"],
      ].map(([position, colour], index) => (
        <span
          key={index}
          className={`absolute ${position} ${colour} flex size-7 items-center justify-center rounded-full border-4 border-white shadow-md`}
        >
          <span className="size-1.5 rounded-full bg-white" />
        </span>
      ))}
      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[0.62rem] font-bold text-veyvio-deep shadow-sm">
        Live · 18 duties
      </div>
      <div className="absolute bottom-4 right-4 rounded-xl bg-white/95 p-3 shadow-lg">
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-veyvio-teal">
          Selected
        </p>
        <p className="mt-1 text-xs font-bold text-veyvio-deep">CT-104 · North Loop</p>
        <p className="mt-0.5 text-[0.65rem] text-veyvio-muted">On time · GPS 12s ago</p>
      </div>
    </div>
  );
}

function CommandInterface({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-[1.5rem] border border-[#cad8dc] bg-white shadow-[0_30px_80px_rgba(23,62,72,0.18)] ${
        compact ? "p-2" : "p-2.5 sm:p-3"
      }`}
    >
      <div className="overflow-hidden rounded-[1.05rem] border border-veyvio-border bg-[#f6f9fa]">
        <div className="flex h-10 items-center justify-between border-b border-veyvio-border bg-white px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-veyvio-lime" />
            <span className="font-marketing text-xs font-extrabold text-veyvio-deep">veyvio</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-[#eaf4dc] px-2.5 py-1 text-[0.55rem] font-bold text-veyvio-deep sm:inline">
              Live connection
            </span>
            <span className="flex size-6 items-center justify-center rounded-full bg-veyvio-deep text-[0.55rem] font-bold text-white">
              AL
            </span>
          </div>
        </div>

        <div className={`grid ${compact ? "grid-cols-[48px_1fr]" : "grid-cols-[52px_1fr] sm:grid-cols-[64px_1fr]"}`}>
          <aside className="flex flex-col items-center gap-3 bg-veyvio-deep py-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                className={`rounded-md ${
                  index === 1
                    ? "size-7 bg-veyvio-teal shadow-[inset_3px_0_0_#7ab82e]"
                    : "h-2 w-6 bg-white/20"
                }`}
              />
            ))}
          </aside>

          <div className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[0.55rem] font-bold uppercase tracking-[0.16em] text-veyvio-teal">
                  Control centre
                </p>
                <p className="mt-1 text-sm font-bold text-veyvio-deep sm:text-base">
                  Sunday service position
                </p>
              </div>
              <span className="rounded-lg border border-veyvio-border bg-white px-2.5 py-1.5 text-[0.58rem] font-semibold text-veyvio-muted">
                26 July 2026
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Duties live", "18"],
                ["Vehicles ready", "24 / 27"],
                ["Needs attention", "3"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-veyvio-border bg-white p-2 sm:p-3">
                  <p className="text-[0.47rem] font-semibold uppercase tracking-wide text-veyvio-muted sm:text-[0.55rem]">
                    {label}
                  </p>
                  <p className="mt-1 font-marketing text-sm font-extrabold text-veyvio-deep sm:text-lg">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.25fr]">
              <div className="rounded-xl border border-veyvio-border bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[0.65rem] font-bold text-veyvio-deep">Action queue</p>
                  <span className="rounded-full bg-[#fff1df] px-2 py-0.5 text-[0.52rem] font-bold text-[#9a5b16]">
                    3 open
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {[
                    ["Late start", "DAR-22 · East zone", "11 min"],
                    ["Driver swap", "SEND-08 · School run", "Review"],
                    ["GPS stale", "CT-118 · West link", "3 min"],
                  ].map(([title, detail, meta], index) => (
                    <div
                      key={title}
                      className="rounded-lg border border-veyvio-border bg-[#fbfcfc] p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[0.58rem] font-bold text-veyvio-deep">{title}</p>
                        <span
                          className={`text-[0.5rem] font-bold ${
                            index === 0 ? "text-[#b45d25]" : "text-veyvio-teal"
                          }`}
                        >
                          {meta}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.5rem] text-veyvio-muted">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <MiniMap />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ feature }: { feature: Feature }) {
  if (feature.key === "live") {
    return (
      <div className="grid h-full min-h-[24rem] grid-rows-[1fr_auto] gap-3">
        <MiniMap />
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Live", "18"],
            ["Late", "2"],
            ["Stale GPS", "1"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-veyvio-border bg-white p-3">
              <p className="text-[0.62rem] font-semibold text-veyvio-muted">{label}</p>
              <p className="mt-1 text-xl font-extrabold text-veyvio-deep">{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feature.key === "dispatch") {
    return (
      <div className="grid h-full min-h-[24rem] grid-cols-4 gap-2 overflow-hidden">
        {[
          ["Unassigned", ["SEND-08", "DAR-22"]],
          ["Assigned", ["CT-104", "CT-118"]],
          ["In progress", ["SR-05"]],
          ["Complete", ["CT-091", "DAR-18"]],
        ].map(([heading, duties], column) => (
          <div key={heading as string} className="rounded-xl bg-white/85 p-2">
            <p className="truncate text-[0.55rem] font-bold text-veyvio-deep">{heading as string}</p>
            <div className="mt-2 space-y-2">
              {(duties as string[]).map((duty, index) => (
                <div key={duty} className="rounded-lg border border-veyvio-border bg-white p-2 shadow-sm">
                  <p className="text-[0.56rem] font-bold text-veyvio-deep">{duty}</p>
                  <p className="mt-1 text-[0.47rem] text-veyvio-muted">
                    {column === 0 ? "Needs assignment" : column === 2 ? "On route" : "Ready"}
                  </p>
                  <span
                    className="mt-2 block h-1.5 rounded-full"
                    style={{
                      background:
                        column === 0 ? "#f4b37b" : index === 0 ? feature.accent : "#dbe6e8",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (feature.key === "schedule") {
    return (
      <div className="h-full min-h-[24rem] overflow-hidden rounded-xl bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-veyvio-deep">Week plan · 27–31 July</p>
          <span className="rounded-full bg-[#e8f4d7] px-2 py-1 text-[0.55rem] font-bold text-veyvio-deep">
            24 duties
          </span>
        </div>
        <div className="mt-4 grid grid-cols-[72px_repeat(5,1fr)] text-center text-[0.5rem] font-semibold text-veyvio-muted">
          <span />
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          {["A. Morgan", "J. Patel", "S. Williams", "Cover"].map((driver, row) => (
            <div key={driver} className="grid grid-cols-[72px_repeat(5,1fr)] items-center gap-1">
              <span className="truncate text-[0.52rem] font-semibold text-veyvio-deep">{driver}</span>
              {Array.from({ length: 5 }).map((_, column) => (
                <span
                  key={column}
                  className="h-11 rounded-md border border-white/70"
                  style={{
                    background:
                      (row + column) % 4 === 0
                        ? "#fff0dd"
                        : (row + column) % 3 === 0
                          ? "#e7f3d6"
                          : "#e6f2f5",
                  }}
                >
                  <span className="mt-2 block text-[0.42rem] font-bold text-veyvio-muted">
                    {(row + column) % 4 === 0 ? "Check" : `0${7 + row}:30`}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feature.key === "bookings") {
    return (
      <div className="h-full min-h-[24rem] overflow-hidden rounded-xl bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.16em] text-veyvio-teal">
              New booking
            </p>
            <p className="mt-1 text-base font-extrabold text-veyvio-deep">Passenger journey</p>
          </div>
          <span className="rounded-full bg-[#e8f4d7] px-2 py-1 text-[0.52rem] font-bold text-veyvio-deep">
            Draft saved
          </span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1">
          {["Request", "Journey", "Needs", "Review"].map((step, index) => (
            <div key={step}>
              <span className={`block h-1.5 rounded-full ${index < 2 ? "bg-veyvio-lime" : "bg-[#dce5e8]"}`} />
              <p className="mt-1 text-[0.46rem] font-semibold text-veyvio-muted">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Customer", "Northshire Community Services"],
            ["Passenger", "Alex Morgan"],
            ["Journey type", "Return · recurring"],
            ["Service need", "Wheelchair accessible"],
          ].map(([label, value]) => (
            <label key={label} className="block">
              <span className="text-[0.55rem] font-semibold text-veyvio-muted">{label}</span>
              <span className="mt-1 block rounded-lg border border-veyvio-border bg-[#fbfcfc] px-3 py-2.5 text-[0.62rem] font-semibold text-veyvio-deep">
                {value}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-veyvio-deep p-3 text-white">
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-[#a8dbe5]">
            Scheduling context
          </p>
          <p className="mt-1 text-xs font-bold">2 journeys · first service Monday 08:30</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[24rem] overflow-hidden rounded-xl bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.56rem] font-bold uppercase tracking-[0.16em] text-[#5d48b7]">
            Decision history
          </p>
          <p className="mt-1 text-base font-extrabold text-veyvio-deep">DAR-22 · East zone</p>
        </div>
        <span className="rounded-full bg-[#efeafb] px-2 py-1 text-[0.52rem] font-bold text-[#5d48b7]">
          Preserved
        </span>
      </div>
      <div className="relative mt-6 space-y-4 before:absolute before:bottom-3 before:left-[0.68rem] before:top-3 before:w-px before:bg-veyvio-border">
        {[
          ["08:14", "Planned", "Driver and vehicle assigned", "A. Lewis"],
          ["08:26", "Blocked", "Vehicle ramp check overdue", "Safety gate"],
          ["08:34", "Revised", "Approved vehicle swap", "M. Khan"],
          ["08:38", "Published", "Duty released to driver", "A. Lewis"],
        ].map(([time, state, copy, actor], index) => (
          <div key={time} className="relative grid grid-cols-[24px_44px_1fr] gap-2">
            <span
              className="z-10 mt-0.5 size-5 rounded-full border-4 border-white"
              style={{ background: index === 1 ? "#d98545" : feature.accent }}
            />
            <span className="pt-0.5 text-[0.52rem] font-semibold text-veyvio-muted">{time}</span>
            <div className="rounded-lg border border-veyvio-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.6rem] font-bold text-veyvio-deep">{state}</p>
                <span className="text-[0.48rem] text-veyvio-muted">{actor}</span>
              </div>
              <p className="mt-1 text-[0.55rem] text-veyvio-muted">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureExplorer() {
  const [activeKey, setActiveKey] = useState<FeatureKey>("live");
  const active = features.find((feature) => feature.key === activeKey) ?? features[0];
  const { ref, visible } = useRevealOnScroll<HTMLElement>();

  return (
    <section ref={ref} id="capabilities" className="bg-veyvio-surface py-20 sm:py-28">
      <div className="section-container">
        <div className={visible ? "reveal is-visible" : "reveal"}>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
            Explore Command
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <h2 className="max-w-3xl font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
              One control application.
              <br />
              Five connected views.
            </h2>
            <p className="max-w-md text-base leading-7 text-veyvio-muted">
              Move from planning to live service without changing the operational truth underneath.
            </p>
          </div>
        </div>

        <div className={`mt-12 ${visible ? "reveal is-visible" : "reveal"}`}>
          <div className="flex gap-1 overflow-x-auto border-b border-veyvio-border pb-px" role="tablist">
            {features.map((feature) => {
              const selected = feature.key === active.key;
              return (
                <button
                  key={feature.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`command-panel-${feature.key}`}
                  onClick={() => setActiveKey(feature.key)}
                  className={`min-w-max border-b-[3px] px-4 py-3 text-left transition ${
                    selected
                      ? "border-veyvio-deep text-veyvio-deep"
                      : "border-transparent text-veyvio-muted hover:text-veyvio-deep"
                  }`}
                >
                  <span className="mr-2 text-[0.65rem] font-bold text-veyvio-teal">{feature.index}</span>
                  <span className="text-sm font-bold">{feature.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id={`command-panel-${active.key}`}
            role="tabpanel"
            className="mt-6 grid min-h-[36rem] overflow-hidden rounded-[2rem] border border-veyvio-border bg-white shadow-[0_24px_65px_rgba(23,62,72,0.11)] lg:grid-cols-[0.85fr_1.15fr]"
          >
            <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-veyvio-teal">
                  {active.eyebrow}
                </p>
                <h3 className="mt-4 font-marketing text-3xl font-extrabold tracking-[-0.035em] text-veyvio-deep sm:text-4xl">
                  {active.title}
                </h3>
                <p className="mt-5 max-w-xl leading-7 text-veyvio-muted">{active.copy}</p>
                <ul className="mt-7 space-y-3">
                  {active.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm font-semibold text-veyvio-deep">
                      <CheckMark />
                      <span className="pt-0.5">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/demo" className="btn-primary">
                  Explore in a demo
                </Link>
                <Link to="/implementation" className="btn-secondary">
                  See implementation
                </Link>
              </div>
            </div>

            <div
              className="min-h-[28rem] p-5 sm:p-8 lg:p-10"
              style={{
                background: `linear-gradient(145deg, ${active.accent}20, #f8fbfb 74%)`,
                boxShadow: `inset 4px 0 0 ${active.accent}`,
              }}
            >
              <FeatureVisual key={active.key} feature={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="border-t border-veyvio-border bg-white py-20 sm:py-28">
      <div className="section-container grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
            Product questions
          </p>
          <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep">
            The useful answers, up front.
          </h2>
          <p className="mt-5 max-w-md leading-7 text-veyvio-muted">
            Command is being shaped with passenger transport operators. The consultation confirms the
            right scope for each pilot.
          </p>
        </div>

        <div className="divide-y divide-veyvio-border border-y border-veyvio-border">
          {faqs.map((item, index) => {
            const open = index === openIndex;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-5 py-6 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? -1 : index)}
                >
                  <span className="font-marketing text-lg font-bold text-veyvio-deep sm:text-xl">
                    {item.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-2xl font-light text-veyvio-deep transition-transform ${
                      open ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {open ? <p className="max-w-3xl pb-6 leading-7 text-veyvio-muted">{item.answer}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CommandPage() {
  usePageMeta({
    title: "Veyvio Command — passenger transport operations control",
    description:
      "Plan work, manage live passenger transport operations and respond to exceptions from one connected control application.",
    path: "/platform/command",
  });

  const benefitsReveal = useRevealOnScroll<HTMLElement>();
  const workflowReveal = useRevealOnScroll<HTMLElement>();
  const rolesReveal = useRevealOnScroll<HTMLElement>();

  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute left-1/2 top-[36%] size-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(122,184,46,0.12),rgba(74,143,163,0.06)_42%,transparent_70%)]" />
        <div className="section-container relative flex min-h-[calc(100svh-4.75rem)] flex-col items-center justify-center py-16 text-center sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-veyvio-border bg-veyvio-surface px-3 py-1.5">
              <span className="size-2 rounded-full bg-veyvio-lime" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-veyvio-deep">
                Veyvio Command · Pilot
              </span>
            </div>
            <h1 className="page-hero-title mt-8 text-veyvio-deep">
              Run passenger transport
              <span className="mt-2 block text-veyvio-lime">with the full picture.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-veyvio-muted sm:text-xl">
              Plan work, govern release and manage live exceptions from one connected operational
              control application.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/demo"
                className="btn-primary"
                onClick={() =>
                  trackCta("demo_cta_selected", "Book a Command demo", {
                    ctaPosition: "command-hero",
                  })
                }
              >
                Book a Command demo
              </Link>
              <a href="#capabilities" className="btn-secondary">
                Explore capabilities
              </a>
            </div>
          </div>

          <div className="relative mt-14 w-full max-w-5xl sm:mt-16">
            <div className="absolute inset-x-[8%] bottom-[-1rem] h-10 rounded-[50%] bg-veyvio-deep/15 blur-2xl" />
            <CommandInterface />
          </div>
        </div>
      </section>

      <section ref={benefitsReveal.ref} className="border-y border-veyvio-border bg-white py-20 sm:py-24">
        <div className="section-container">
          <div
            className={`mx-auto max-w-3xl text-center ${
              benefitsReveal.visible ? "reveal is-visible" : "reveal"
            }`}
          >
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
              Control without fragmentation
            </p>
            <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
              The operation should not disappear between systems.
            </h2>
          </div>
          <div className="reveal-stagger mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <article
                key={benefit.number}
                className={`group min-h-64 border-t-4 border-veyvio-teal bg-veyvio-surface p-6 transition duration-300 hover:-translate-y-2 hover:border-veyvio-lime hover:bg-white hover:shadow-[0_22px_55px_rgba(23,62,72,0.12)] ${
                  benefitsReveal.visible ? "reveal is-visible" : "reveal"
                }`}
              >
                <p className="text-xs font-extrabold text-veyvio-teal">{benefit.number}</p>
                <h3 className="mt-12 font-marketing text-2xl font-bold tracking-tight text-veyvio-deep">
                  {benefit.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-veyvio-muted">{benefit.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FeatureExplorer />

      <section ref={workflowReveal.ref} className="overflow-hidden bg-veyvio-deep py-20 text-white sm:py-28">
        <div className="section-container">
          <div
            className={`grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end ${
              workflowReveal.visible ? "reveal is-visible" : "reveal"
            }`}
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9fd9e5]">
                One operating thread
              </p>
              <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                From request to closeout without losing context.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-white/70 lg:justify-self-end">
              Command keeps commercial intent, passenger need, the operating plan and the actual
              outcome connected—while preserving the changes in between.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] bg-white/15 md:grid-cols-5">
            {workflow.map(([number, title, copy], index) => (
              <article
                key={number}
                className={`group relative min-h-72 bg-veyvio-deep p-6 transition duration-300 hover:bg-white hover:text-veyvio-deep ${
                  workflowReveal.visible ? "reveal is-visible" : "reveal"
                }`}
                style={{ transitionDelay: `${index * 70}ms` }}
              >
                <p className="text-xs font-black text-[#9fd9e5] group-hover:text-veyvio-teal">
                  {number}
                </p>
                <div className="mt-24">
                  <h3 className="font-marketing text-2xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65 group-hover:text-veyvio-muted">
                    {copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="section-container grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
              Exception-led by design
            </p>
            <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
              A calm dashboard should tell you where to look.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-veyvio-muted">
              The control room is organised around the decisions that change today’s service—not a
              wall of passive metrics.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Prioritise critical and urgent operational exceptions",
                "Open the selected duty with the context needed to act",
                "Record intervention, reason and resulting service state",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 font-semibold text-veyvio-deep">
                  <CheckMark />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <CommandInterface compact />
        </div>
      </section>

      <section ref={rolesReveal.ref} className="border-y border-veyvio-border bg-veyvio-surface py-20 sm:py-28">
        <div className="section-container">
          <div
            className={`flex flex-col justify-between gap-5 lg:flex-row lg:items-end ${
              rolesReveal.visible ? "reveal is-visible" : "reveal"
            }`}
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
                Built around responsibility
              </p>
              <h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
                One operation. Clear views for every control role.
              </h2>
            </div>
            <p className="max-w-md leading-7 text-veyvio-muted">
              Each role sees the detail needed for its work while company, permission and record
              boundaries remain enforced.
            </p>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-2">
            {roles.map((role, index) => (
              <article
                key={role.title}
                className={`group relative min-h-72 overflow-hidden rounded-[1.5rem] border border-veyvio-border bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(23,62,72,0.11)] ${
                  rolesReveal.visible ? "reveal is-visible" : "reveal"
                }`}
                style={{ transitionDelay: `${index * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="font-marketing text-6xl font-extrabold tracking-[-0.07em] text-[#dbe7e9] transition group-hover:text-[#c8dfe4]">
                    0{index + 1}
                  </span>
                  <span className="rounded-full bg-[#eaf4dc] px-3 py-1 text-xs font-bold text-veyvio-deep">
                    {role.stat}
                  </span>
                </div>
                <h3 className="mt-12 font-marketing text-3xl font-bold text-veyvio-deep">{role.title}</h3>
                <p className="mt-3 max-w-md leading-7 text-veyvio-muted">{role.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
              Part of one connected platform
            </p>
            <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
              Command does not operate alone.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              Yard readiness and frontline Driver progress can feed the same operational state seen
              by Command.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-5xl">
            <img
              src="/images/sections/veyvio-connected-apps-v1.png"
              alt="Veyvio Command, Yard and Driver application interfaces shown across laptop, tablet and phone"
              className="h-auto w-full"
              loading="lazy"
            />
          </div>
          <div className="mt-4 flex justify-center">
            <Link to="/platform" className="btn-secondary">
              Explore the Veyvio platform
            </Link>
          </div>
        </div>
      </section>

      <Questions />

      <section className="bg-veyvio-deep py-20 text-white sm:py-24">
        <div className="section-container">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9fd9e5]">
                A focused next step
              </p>
              <h2 className="mt-3 max-w-4xl font-marketing text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">
                See how Command could fit your operating model.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
                Bring your current workflow, constraints and evidence needs. The demonstration is
                tailored to the reality of your service.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to="/demo"
                className="btn-primary"
                onClick={() =>
                  trackCta("demo_cta_selected", "Book a Command demo", {
                    ctaPosition: "command-footer",
                  })
                }
              >
                Book a Command demo
              </Link>
              <Link
                to="/contact"
                className="inline-flex min-h-11 min-w-[9rem] items-center justify-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-veyvio-deep"
              >
                Talk to the team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
