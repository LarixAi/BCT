import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type NetworkViewKey = "network" | "north" | "riverside" | "east" | "exception";
type DepotTone = "ready" | "attention" | "constrained";

type Depot = {
  key: Exclude<NetworkViewKey, "network" | "exception">;
  name: string;
  code: string;
  location: string;
  vehicles: string;
  ready: string;
  people: string;
  exceptions: string;
  next: string;
  note: string;
  tone: DepotTone;
  colour: string;
  position: string;
};

const depots: Depot[] = [
  {
    key: "north",
    name: "North depot",
    code: "NTH",
    location: "Primary operations base",
    vehicles: "24",
    ready: "18",
    people: "12",
    exceptions: "2",
    next: "07:30 · North Loop",
    note: "Two vehicles require attention before the morning release window.",
    tone: "attention",
    colour: "#42d6bd",
    position: "left-[7%] top-[13%]",
  },
  {
    key: "riverside",
    name: "Riverside depot",
    code: "RIV",
    location: "Accessible fleet base",
    vehicles: "15",
    ready: "12",
    people: "8",
    exceptions: "1",
    next: "07:45 · Riverside Shuttle",
    note: "One return inspection remains open; three vehicles have spare capacity.",
    tone: "ready",
    colour: "#7c6ce8",
    position: "right-[5%] top-[18%]",
  },
  {
    key: "east",
    name: "East hub",
    code: "EST",
    location: "Outstation",
    vehicles: "10",
    ready: "9",
    people: "5",
    exceptions: "1",
    next: "08:05 · East Zone",
    note: "Vehicle capacity is tight. One active duty needs a supported alternative.",
    tone: "constrained",
    colour: "#ff8f70",
    position: "bottom-[9%] left-[36%]",
  },
];

const principles = [
  {
    number: "01",
    title: "Company boundary",
    copy: "The operator remains the hard data boundary. A regional view never becomes a reason to mix one company with another.",
    colour: "#42d6bd",
  },
  {
    number: "02",
    title: "Depot ownership",
    copy: "Vehicles, people, Yard activity and operational evidence stay attributable to the depot that owns the work.",
    colour: "#7c6ce8",
  },
  {
    number: "03",
    title: "Role authority",
    copy: "Local teams see focused workflows. Authorised leaders can compare and coordinate only within their granted scope.",
    colour: "#ff8f70",
  },
  {
    number: "04",
    title: "Traceable decisions",
    copy: "Regional numbers link back to the source depot, current record and the person or rule behind a change.",
    colour: "#f0c65c",
  },
];

const scopeLayers = [
  ["Company", "The licensed operator and primary isolation boundary", "Every record"],
  ["Depot or hub", "The physical operating location that owns resources and activity", "Local focus"],
  ["Application & role", "Command oversight, Yard operations or Driver duty context", "Authorised action"],
  ["Record & event", "The specific vehicle, duty, check, movement or exception", "Attributable history"],
];

const exceptionSteps = [
  {
    number: "01",
    owner: "East hub",
    title: "Expose the service risk",
    copy: "EO71 NTJ is held for inspection. The 08:05 East Zone duty now has no supported vehicle.",
    colour: "#ff8f70",
  },
  {
    number: "02",
    owner: "Command",
    title: "Inspect governed capacity",
    copy: "An authorised controller can compare suitable availability without opening every depot's local working view.",
    colour: "#2aa8c2",
  },
  {
    number: "03",
    owner: "Riverside",
    title: "Confirm local readiness",
    copy: "Yard confirms WX21 FYV is physically present, checked and suitable for the expected service.",
    colour: "#7c6ce8",
  },
  {
    number: "04",
    owner: "Shared record",
    title: "Retain the decision",
    copy: "The approved reassignment keeps the source, receiving depot, actor, reason and vehicle state visible.",
    colour: "#42d6bd",
  },
];

const faqs = [
  {
    question: "Can every depot see every other depot?",
    answer:
      "Not by default. Depot and role scope should keep local teams focused on the locations and actions they are authorised to use. Cross-depot visibility is reserved for configured leadership or operational roles.",
  },
  {
    question: "Does a regional dashboard replace each depot's Yard view?",
    answer:
      "No. The regional view helps authorised users understand capacity and exceptions across the company. The physical work—location, checks, movements, equipment and release—remains owned in the relevant depot workflow.",
  },
  {
    question: "How should a vehicle move between depots?",
    answer:
      "A transfer should be an explicit operational event, not a silent edit. The exact approval, custody, location and evidence steps are agreed during implementation so local ownership and history remain clear.",
  },
  {
    question: "Can data from different companies appear together?",
    answer:
      "No. Multi-depot operations sit inside one licensed company. Company isolation remains the primary boundary, and depot scope is applied within that company.",
  },
  {
    question: "Are all cross-depot workflows generally available?",
    answer:
      "Veyvio is currently presented as a pilot product. Exact depot structures, permissions, regional views, transfer rules and integrations are confirmed against the operator's real organisation during consultation.",
  },
];

function DepotNetworkVisual() {
  return (
    <div className="relative mx-auto aspect-[1.08/1] w-full max-w-[44rem] overflow-hidden rounded-[2rem] border border-white/12 bg-[#102f3a] shadow-[0_38px_100px_rgba(3,24,31,.42)]">
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-[10%] rounded-full border border-dashed border-white/15" />
      <div className="absolute inset-[24%] rounded-full border border-dashed border-white/10" />
      <div className="absolute left-[21%] top-[27%] h-px w-[55%] origin-left rotate-[12deg] bg-gradient-to-r from-[#42d6bd] via-white/30 to-[#7c6ce8]" />
      <div className="absolute left-[26%] top-[31%] h-px w-[43%] origin-left rotate-[47deg] bg-gradient-to-r from-[#42d6bd] via-white/25 to-[#ff8f70]" />
      <div className="absolute right-[24%] top-[36%] h-px w-[34%] origin-right -rotate-[54deg] bg-gradient-to-l from-[#7c6ce8] via-white/25 to-[#ff8f70]" />

      <div className="absolute left-1/2 top-1/2 z-10 w-[12.4rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] border border-white/14 bg-[#071f28]/95 p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[0.55rem] font-black uppercase tracking-[.18em] text-white/45">Regional view</span>
          <span className="size-2 rounded-full bg-[#42d6bd] shadow-[0_0_14px_#42d6bd]" />
        </div>
        <p className="mt-4 text-3xl font-black tracking-[-.05em]">49 / 55</p>
        <p className="mt-1 text-xs text-white/55">vehicles ready or supported</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/7 p-2.5">
            <p className="text-lg font-black">4</p>
            <p className="text-[0.52rem] uppercase tracking-[.12em] text-white/45">exceptions</p>
          </div>
          <div className="rounded-xl bg-white/7 p-2.5">
            <p className="text-lg font-black">25</p>
            <p className="text-[0.52rem] uppercase tracking-[.12em] text-white/45">people active</p>
          </div>
        </div>
      </div>

      {depots.map((depot) => (
        <div key={depot.key} className={`absolute z-20 w-[9.3rem] rounded-[1.15rem] border border-white/14 bg-white/[.095] p-3 text-white backdrop-blur-md ${depot.position}`}>
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-xl text-[0.58rem] font-black" style={{ backgroundColor: depot.colour }}>
              {depot.code}
            </span>
            <span className="text-[0.52rem] font-black uppercase tracking-[.12em] text-white/45">{depot.ready}/{depot.vehicles}</span>
          </div>
          <p className="mt-3 text-xs font-black">{depot.name}</p>
          <p className="mt-1 text-[0.58rem] text-white/45">{depot.exceptions} open exception{depot.exceptions === "1" ? "" : "s"}</p>
        </div>
      ))}

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#071f28]/80 px-4 py-3 text-white backdrop-blur">
        <span className="text-[0.58rem] font-black uppercase tracking-[.14em] text-white/45">Network pulse</span>
        <span className="text-xs font-bold">Local ownership · governed visibility</span>
      </div>
    </div>
  );
}

function StatusDot({ tone }: { tone: DepotTone }) {
  const style =
    tone === "ready"
      ? "bg-[#dff8ee] text-[#227c69]"
      : tone === "constrained"
        ? "bg-[#ffe8e0] text-[#a9462d]"
        : "bg-[#fff3ce] text-[#896718]";
  const label = tone === "ready" ? "Capacity available" : tone === "constrained" ? "Capacity tight" : "Needs attention";
  return <span className={`rounded-full px-3 py-1 text-[0.62rem] font-black ${style}`}>{label}</span>;
}

function DepotPanel({ depot }: { depot: Depot }) {
  const rows = [
    ["Vehicles assigned", depot.vehicles, "Owned by this depot"],
    ["Ready or supported", depot.ready, "Current operational view"],
    ["People active", depot.people, "Authorised local users"],
    ["Open exceptions", depot.exceptions, "Linked to source records"],
  ];

  return (
    <div className="grid min-h-[34rem] overflow-hidden rounded-[1.8rem] border border-[#d4e1e4] bg-white shadow-[0_28px_80px_rgba(8,43,54,.12)] lg:grid-cols-[.72fr_1.28fr]">
      <div className="flex flex-col justify-between p-7 text-white sm:p-10" style={{ backgroundColor: depot.colour }}>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-[.18em] text-white/65">{depot.code} · Depot view</span>
            <span className="rounded-full bg-white/18 px-3 py-1 text-[0.6rem] font-black uppercase tracking-[.12em]">Local ownership</span>
          </div>
          <h3 className="mt-10 font-marketing text-5xl font-extrabold leading-[.9] tracking-[-.055em] sm:text-7xl">{depot.name}</h3>
          <p className="mt-4 text-base font-bold text-white/75">{depot.location}</p>
          <p className="mt-8 max-w-md text-base leading-7 text-white/75">{depot.note}</p>
        </div>
        <div className="mt-8 rounded-2xl bg-[#071f28]/18 p-4">
          <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-white/55">Next planned departure</p>
          <p className="mt-2 text-sm font-black">{depot.next}</p>
        </div>
      </div>

      <div className="bg-[#f3f7f7] p-5 sm:p-9">
        <div className="overflow-hidden rounded-[1.4rem] border border-[#d5e1e3] bg-white shadow-[0_20px_55px_rgba(12,48,59,.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce6e7] px-5 py-4">
            <div>
              <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#687d83]">Veyvio Yard · local state</p>
              <p className="mt-1 text-sm font-black text-[#123844]">Today at {depot.name}</p>
            </div>
            <StatusDot tone={depot.tone} />
          </div>
          <div className="grid gap-px bg-[#dfe8e9] sm:grid-cols-2">
            {rows.map(([label, value, context]) => (
              <div key={label} className="bg-white p-5">
                <p className="text-[0.57rem] font-black uppercase tracking-[.14em] text-[#74868b]">{label}</p>
                <p className="mt-3 text-4xl font-black tracking-[-.05em] text-[#123844]">{value}</p>
                <p className="mt-1 text-xs text-[#738489]">{context}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#dfe8e9] p-5">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#edf4f4] p-4">
              <div>
                <p className="text-xs font-black text-[#123844]">Depot-owned operational record</p>
                <p className="mt-1 text-[0.66rem] leading-5 text-[#6c8085]">Vehicle state, Yard activity and exceptions remain attributable to {depot.name}.</p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#123844] text-sm font-black text-white">✓</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[0.62rem] leading-5 text-[#74868b]">
          Illustrative pilot view. Exact depot metrics, permissions and readiness rules are agreed for the operator.
        </p>
      </div>
    </div>
  );
}

function RegionalPanel() {
  return (
    <div className="grid min-h-[34rem] overflow-hidden rounded-[1.8rem] border border-[#d4e1e4] bg-[#0b2c36] text-white shadow-[0_28px_80px_rgba(8,43,54,.2)] lg:grid-cols-[.78fr_1.22fr]">
      <div className="p-7 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#42d6bd]">Authorised regional view</p>
        <h3 className="mt-8 max-w-[9ch] font-marketing text-5xl font-extrabold leading-[.9] tracking-[-.055em] sm:text-7xl">
          See the network. Keep the source.
        </h3>
        <p className="mt-6 max-w-md text-base leading-7 text-white/60">
          Compare readiness, people and exceptions across the company without turning every depot into one undifferentiated queue.
        </p>
        <div className="mt-10 grid grid-cols-3 gap-2">
          {[
            ["55", "Vehicles"],
            ["49", "Supported"],
            ["4", "Exceptions"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[.055] p-3">
              <p className="text-2xl font-black">{value}</p>
              <p className="mt-1 text-[0.52rem] uppercase tracking-[.13em] text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#f2f6f6] p-5 text-[#123844] sm:p-8">
        <div className="overflow-hidden rounded-[1.35rem] border border-[#d5e1e3] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#dce6e7] px-5 py-4">
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-[.17em] text-[#708388]">Veyvio Command</p>
              <p className="mt-1 text-sm font-black">Depot network · current view</p>
            </div>
            <span className="rounded-full bg-[#ddf8ee] px-3 py-1 text-[0.62rem] font-black text-[#227c69]">3 locations</span>
          </div>
          <div className="divide-y divide-[#dfe8e9]">
            {depots.map((depot) => (
              <div key={depot.key} className="grid gap-3 px-4 py-4 sm:grid-cols-[1.2fr_.7fr_.7fr_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[0.55rem] font-black text-white" style={{ backgroundColor: depot.colour }}>
                    {depot.code}
                  </span>
                  <div>
                    <p className="text-sm font-black">{depot.name}</p>
                    <p className="text-[0.62rem] text-[#708388]">{depot.location}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#839398]">Supported</p>
                  <p className="mt-1 text-sm font-black">{depot.ready}/{depot.vehicles}</p>
                </div>
                <div>
                  <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#839398]">Exceptions</p>
                  <p className="mt-1 text-sm font-black">{depot.exceptions}</p>
                </div>
                <StatusDot tone={depot.tone} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[#d5e1e3] bg-white p-4">
          <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#2aa8c2]">Regional rule</p>
          <p className="mt-2 text-xs font-bold leading-5">
            Aggregated visibility can reveal pressure. The local source record remains the authority for the depot action.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExceptionPanel() {
  return (
    <div className="grid min-h-[34rem] overflow-hidden rounded-[1.8rem] border border-[#d4e1e4] bg-white shadow-[0_28px_80px_rgba(8,43,54,.14)] lg:grid-cols-[.72fr_1.28fr]">
      <div className="flex flex-col justify-between bg-[#ff8f70] p-7 text-[#123844] sm:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#123844]/55">Cross-depot exception</p>
          <h3 className="mt-9 font-marketing text-5xl font-extrabold leading-[.9] tracking-[-.055em] sm:text-7xl">
            Solve the gap without losing ownership.
          </h3>
          <p className="mt-6 text-base leading-7 text-[#123844]/75">
            East hub needs a suitable vehicle. Riverside has supported capacity. The decision still needs local confirmation and a traceable reason.
          </p>
        </div>
        <span className="mt-8 w-fit rounded-full bg-[#123844] px-4 py-2 text-xs font-black text-white">Pilot-configured workflow</span>
      </div>
      <div className="bg-[#f5f8f8] p-5 sm:p-9">
        <div className="overflow-hidden rounded-[1.35rem] border border-[#d5e1e3] bg-white">
          <div className="flex items-center justify-between border-b border-[#dce6e7] px-5 py-4">
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-[#708388]">Operational exception</p>
              <p className="mt-1 text-sm font-black text-[#123844]">East Zone · 08:05 departure</p>
            </div>
            <span className="rounded-full bg-[#ffe7df] px-3 py-1 text-[0.62rem] font-black text-[#9c402b]">Vehicle gap</span>
          </div>
          <div className="grid gap-px bg-[#dfe8e9] sm:grid-cols-2">
            <div className="bg-white p-5">
              <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#ff7957]">Source depot</p>
              <p className="mt-3 text-xl font-black text-[#123844]">East hub</p>
              <p className="mt-2 text-xs leading-5 text-[#718388]">EO71 NTJ · inspection hold<br />No supported local replacement</p>
            </div>
            <div className="bg-white p-5">
              <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#6a58d2]">Potential capacity</p>
              <p className="mt-3 text-xl font-black text-[#123844]">Riverside</p>
              <p className="mt-2 text-xs leading-5 text-[#718388]">WX21 FYV · ready<br />Service suitability still to confirm</p>
            </div>
          </div>
          <div className="p-5">
            {[
              ["✓", "Regional need identified", "Command · 07:08"],
              ["✓", "Receiving capacity inspected", "Authorised view · 07:09"],
              ["…", "Local readiness confirmation", "Riverside Yard · pending"],
              ["—", "Reassignment and custody event", "Not started"],
            ].map(([mark, title, meta], index) => (
              <div key={title} className={`flex items-center gap-3 py-3 ${index ? "border-t border-[#e1e9ea]" : ""}`}>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${mark === "✓" ? "bg-[#dff8ee] text-[#227c69]" : mark === "…" ? "bg-[#fff3ce] text-[#896718]" : "bg-[#edf2f2] text-[#7b8b8f]"}`}>
                  {mark}
                </span>
                <div>
                  <p className="text-xs font-black text-[#123844]">{title}</p>
                  <p className="mt-0.5 text-[0.62rem] text-[#75868a]">{meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[0.62rem] leading-5 text-[#74868b]">
          This illustrates the target operating model; approval, transfer and custody rules are confirmed during the pilot.
        </p>
      </div>
    </div>
  );
}

function NetworkExplorer() {
  const [activeKey, setActiveKey] = useState<NetworkViewKey>("network");
  const activeDepot = depots.find((depot) => depot.key === activeKey);
  const tabs: Array<[NetworkViewKey, string]> = [
    ["network", "Regional view"],
    ["north", "North depot"],
    ["riverside", "Riverside"],
    ["east", "East hub"],
    ["exception", "Cross-depot case"],
  ];

  return (
    <>
      <div role="tablist" aria-label="Depot network views" className="mt-12 flex gap-2 overflow-x-auto pb-2">
        {tabs.map(([key, label], index) => {
          const active = key === activeKey;
          return (
            <button
              key={key}
              id={`network-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="network-control-panel"
              onClick={() => setActiveKey(key)}
              className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black transition ${
                active
                  ? "border-[#123844] bg-[#123844] text-white shadow-lg"
                  : "border-[#d3e0e2] bg-white text-[#123844] hover:border-[#2aa8c2]"
              }`}
            >
              <span className="mr-2 text-[0.62rem] opacity-55">0{index + 1}</span>
              {label}
            </button>
          );
        })}
      </div>
      <div id="network-control-panel" role="tabpanel" aria-labelledby={`network-tab-${activeKey}`} className="mt-6">
        {activeKey === "network" && <RegionalPanel />}
        {activeDepot && <DepotPanel depot={activeDepot} />}
        {activeKey === "exception" && <ExceptionPanel />}
      </div>
    </>
  );
}

export function MultiDepotPage() {
  const principlesReveal = useRevealOnScroll<HTMLDivElement>();
  const explorerReveal = useRevealOnScroll<HTMLDivElement>();
  const exceptionReveal = useRevealOnScroll<HTMLDivElement>();

  usePageMeta({
    title: "Multi-depot transport operations | Veyvio",
    description:
      "Keep vehicles, people, Yard activity and decisions locally attributable while authorised leaders understand readiness, capacity and exceptions across the depot network.",
    path: "/solutions/multi-depot",
  });

  return (
    <>
      <section className="relative min-h-[calc(100svh-4.25rem)] overflow-hidden bg-[#071f28] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(66,214,189,.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(124,108,232,.18),transparent_30%),radial-gradient(circle_at_70%_86%,rgba(255,143,112,.12),transparent_28%)]" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4.25rem)] max-w-[92rem] items-center gap-12 px-6 py-16 md:grid-cols-[.92fr_1.08fr] md:px-8 lg:gap-16 lg:px-10 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.055] px-4 py-2 text-[0.68rem] font-black uppercase tracking-[.2em] text-[#7de6d4]">
              <span className="size-2 rounded-full bg-[#42d6bd] shadow-[0_0_14px_#42d6bd]" />
              Solution · Multi-depot operations
            </p>
            <h1 className="page-hero-title mt-8 max-w-[9.5ch]">
              Run every depot locally. Understand the network as one.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">
              Keep people, vehicles, Yard work and operational decisions scoped to the depot that owns them—while authorised leaders see capacity, exceptions and dependencies across the company.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#network-control" className="rounded-full bg-[#42d6bd] px-7 py-3.5 text-sm font-black text-[#071f28] shadow-[0_14px_36px_rgba(66,214,189,.24)] transition hover:-translate-y-0.5 hover:bg-white">
                Explore the depot network
              </a>
              <Link
                to="/demo"
                className="text-sm font-bold text-white underline decoration-[#7c6ce8] decoration-2 underline-offset-4"
                onClick={() =>
                  trackCta("demo_cta_selected", "Map our depot network", {
                    page: "/solutions/multi-depot",
                    ctaPosition: "multi-depot-hero",
                  })
                }
              >
                Map our depot network
              </Link>
            </div>
          </div>
          <DepotNetworkVisual />
        </div>
      </section>

      <section className="border-b border-[#d6e2e4] bg-white">
        <div className="mx-auto grid max-w-[92rem] divide-y divide-[#d6e2e4] px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:px-10">
          {[
            ["01", "Local", "The physical depot owns the work"],
            ["02", "Scoped", "People see the locations and actions they need"],
            ["03", "Connected", "Authorised users compare one current picture"],
            ["04", "Traceable", "Every aggregate leads back to its source"],
          ].map(([number, title, copy]) => (
            <div key={number} className="px-5 py-8 first:pl-0 sm:first:pl-5">
              <p className="text-xs font-black text-[#2aa8c2]">{number}</p>
              <h2 className="mt-3 text-lg font-black tracking-[-.02em] text-[#123844]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667b81]">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f4f8f8] py-24 sm:py-32">
        <div ref={principlesReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2aa8c2]">The operating principle</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#123844] sm:text-7xl">
                One company does not mean one giant queue.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#667b81]">
                The network stays understandable because its boundaries remain visible at every level.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[1.7rem] bg-[#d7e3e5] sm:grid-cols-2">
              {principles.map((principle, index) => (
                <article
                  key={principle.number}
                  className={`group min-h-[19rem] bg-white p-6 transition duration-300 hover:-translate-y-1 ${principlesReveal.visible ? "reveal is-visible" : "reveal"}`}
                  style={{ transitionDelay: `${index * 75}ms` }}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl text-xs font-black text-white" style={{ backgroundColor: principle.colour }}>
                    {principle.number}
                  </span>
                  <h3 className="mt-10 text-2xl font-black tracking-[-.03em] text-[#123844]">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#667b81]">{principle.copy}</p>
                  <div className="mt-6 h-1 w-12 rounded-full transition-all duration-300 group-hover:w-24" style={{ backgroundColor: principle.colour }} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#123844] py-24 text-white sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <p className="max-w-6xl font-marketing text-[clamp(3.1rem,7vw,7.3rem)] font-extrabold leading-[.89] tracking-[-.065em]">
            Central visibility should not erase
            <span className="block text-[#42d6bd]">local ownership.</span>
          </p>
          <div className="mt-14 grid max-w-5xl gap-6 border-t border-white/14 pt-8 sm:grid-cols-3">
            <p className="text-lg leading-8 text-white/58">Yard acts on the physical depot.</p>
            <p className="text-lg leading-8 text-white/58">Command understands the authorised network.</p>
            <p className="text-lg leading-8 text-white/58">Driver sees the vehicle and duty relevant now.</p>
          </div>
        </div>
      </section>

      <section id="network-control" className="scroll-mt-24 bg-[#f2f6f6] py-24 sm:py-32">
        <div ref={explorerReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2aa8c2]">Network control room</p>
              <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#123844] sm:text-7xl">
                Zoom out without flattening the operation.
              </h2>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#667b81]">
              Switch between an authorised regional view, each depot's current picture and one cross-depot exception.
            </p>
          </div>
          <div className={explorerReveal.visible ? "reveal is-visible" : "reveal"}>
            <NetworkExplorer />
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#7c6ce8]">The scope stack</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#123844] sm:text-7xl">
                Access narrows as the action gets closer.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#667b81]">
                A broad view does not automatically grant a broad action. Each layer adds operational context and authority.
              </p>
            </div>
            <div className="space-y-3">
              {scopeLayers.map(([title, copy, outcome], index) => (
                <article
                  key={title}
                  className="group grid gap-4 rounded-[1.25rem] border border-[#d6e2e4] bg-[#f6f9f9] p-5 transition duration-300 hover:-translate-x-2 hover:border-[#7c6ce8] hover:bg-white hover:shadow-[0_18px_50px_rgba(15,52,63,.1)] sm:grid-cols-[3.2rem_1fr_auto] sm:items-center"
                  style={{ marginLeft: `${index * 3}%` }}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#123844] text-xs font-black text-white">0{index + 1}</span>
                  <div>
                    <h3 className="text-lg font-black text-[#123844]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#667b81]">{copy}</p>
                  </div>
                  <span className="w-fit rounded-full bg-[#ebe8fb] px-3 py-1 text-[0.6rem] font-black text-[#5847b0]">{outcome}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b2c36] py-24 text-white sm:py-32">
        <div ref={exceptionReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#ff9d82]">One exception across the network</p>
            <h2 className="mt-4 font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] sm:text-7xl">
              Regional coordination. Local confirmation. One retained decision.
            </h2>
          </div>
          <div className="relative mt-14 grid gap-4 lg:grid-cols-4">
            <div className="absolute left-[10%] right-[10%] top-8 hidden h-px bg-white/14 lg:block" />
            {exceptionSteps.map((step, index) => (
              <article
                key={step.number}
                className={`relative min-h-[21rem] rounded-[1.5rem] border border-white/10 bg-white/[.045] p-6 transition duration-300 hover:-translate-y-2 hover:bg-white/[.075] ${exceptionReveal.visible ? "reveal is-visible" : "reveal"}`}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <span className="flex size-12 items-center justify-center rounded-2xl text-sm font-black text-[#0b2c36]" style={{ backgroundColor: step.colour }}>
                  {step.number}
                </span>
                <p className="mt-10 text-xs font-black uppercase tracking-[.17em]" style={{ color: step.colour }}>{step.owner}</p>
                <h3 className="mt-3 text-2xl font-black tracking-[-.03em]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f4f8f8] py-24 sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#2aa8c2]">Role-owned applications</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#123844] sm:text-7xl">
                The network is shared. The interfaces stay focused.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Yard", "Own the physical depot", "Vehicles, zones, checks, movements, equipment, exceptions and release.", "/platform/yard", "#42d6bd"],
                ["Command", "Coordinate authorised scope", "Compare capacity, plan work and respond to cross-depot pressure.", "/platform/command", "#2aa8c2"],
                ["Driver", "Deliver the current duty", "Receive the relevant vehicle, work, restriction and handback context.", "/platform/driver", "#7c6ce8"],
              ].map(([role, title, copy, href, colour]) => (
                <Link key={role} to={href} className="group flex min-h-[21rem] flex-col rounded-[1.5rem] border border-[#d6e2e4] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-[0_24px_65px_rgba(12,49,60,.12)]">
                  <span className="w-fit rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-[.14em] text-white" style={{ backgroundColor: colour }}>{role}</span>
                  <h3 className="mt-10 text-2xl font-black tracking-[-.03em] text-[#123844]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#667b81]">{copy}</p>
                  <span className="mt-auto pt-8 text-sm font-black text-[#123844] group-hover:text-[#2aa8c2]">Explore Veyvio {role} →</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d6e2e4] bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[76rem] px-6">
          <p className="text-center text-sm font-black uppercase tracking-[.2em] text-[#2aa8c2]">Multi-depot questions</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-center font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#123844] sm:text-7xl">
            Clarify the boundaries before connecting the sites.
          </h2>
          <div className="mt-12 divide-y divide-[#d6e2e4] border-y border-[#d6e2e4]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-black text-[#123844] sm:text-xl">
                  {faq.question}
                  <span className="text-2xl font-light text-[#2aa8c2] transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-2 pt-4 text-base leading-7 text-[#667b81]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#42d6bd] py-20 sm:py-24">
        <div className="mx-auto flex max-w-[92rem] flex-col justify-between gap-10 px-6 lg:flex-row lg:items-end lg:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#123844]/60">Bring the real depot map</p>
            <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.93] tracking-[-.055em] text-[#123844] sm:text-7xl">
              Map one local decision and one cross-depot exception.
            </h2>
          </div>
          <Link
            to="/demo"
            className="shrink-0 rounded-full bg-[#123844] px-8 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#071f28]"
            onClick={() =>
              trackCta("demo_cta_selected", "Book a depot-network workshop", {
                page: "/solutions/multi-depot",
                ctaPosition: "multi-depot-final",
              })
            }
          >
            Book a depot-network workshop
          </Link>
        </div>
      </section>
    </>
  );
}
