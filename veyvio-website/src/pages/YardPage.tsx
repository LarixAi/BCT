import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type YardView = "board" | "vehicles" | "map" | "checks" | "release";

type YardFeature = {
  key: YardView;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  bullets: string[];
  accent: string;
};

const features: YardFeature[] = [
  {
    key: "board",
    number: "01",
    label: "Depot board",
    eyebrow: "Start with the yard",
    title: "See what is ready—and what needs action.",
    copy:
      "A shift-level board brings readiness, checks, locations, workshop state and urgent Yard tasks into one calm operational picture.",
    bullets: ["Ready, action and VOR counts", "Tasks ordered by operational impact", "Vehicle and bay context in reach"],
    accent: "#7ab82e",
  },
  {
    key: "vehicles",
    number: "02",
    label: "Vehicles",
    eyebrow: "The fleet on the ground",
    title: "Find any vehicle by state, location or need.",
    copy:
      "Search the depot fleet and filter by zone, readiness, check status, equipment or VOR without walking the yard to reconstruct the picture.",
    bullets: ["Registration, bay and current state", "Fuel or charge and equipment context", "One route into the vehicle record"],
    accent: "#4a8fa3",
  },
  {
    key: "map",
    number: "03",
    label: "Live map",
    eyebrow: "Spatial operational truth",
    title: "Know what is parked where—and what can move next.",
    copy:
      "The Yard map turns zones, bays and vehicle states into a shared spatial view, while every recorded movement retains who, when and why.",
    bullets: ["Depot zones and bay occupancy", "Readiness visible on the ground", "Controlled edits with movement history"],
    accent: "#2498b1",
  },
  {
    key: "checks",
    number: "04",
    label: "Checks & damage",
    eyebrow: "Evidence at the vehicle",
    title: "Compare today’s condition with the known baseline.",
    copy:
      "Guided checks connect photos, body condition, driver reports, defects and follow-up work to the vehicle that Yard is preparing.",
    bullets: ["Configurable Yard checks", "Known versus newly reported damage", "Linked defect, bodywork and VOR decisions"],
    accent: "#5d48b7",
  },
  {
    key: "release",
    number: "05",
    label: "Move & release",
    eyebrow: "Close the readiness loop",
    title: "Release the vehicle only when the evidence supports it.",
    copy:
      "Location, keys, fuel or charge, cleanliness, checks, equipment and VOR state combine into a clear release decision for Command.",
    bullets: ["Reason-coded bay and zone movements", "Explicit readiness gates", "A shared outcome for Command and Driver"],
    accent: "#ef6b5c",
  },
];

const benefits = [
  ["01", "Exact location", "Zone, bay and movement history replace the depot knowledge held in people’s heads."],
  ["02", "Readiness with reasons", "Teams see why a vehicle is blocked and the action needed to change its state."],
  ["03", "Evidence in context", "Checks, photos, damage, equipment and maintenance stay connected to the vehicle."],
  ["04", "Accountable movement", "Every move can retain the actor, time, reason, keys and destination."],
];

const workflow = [
  ["01", "Return", "Receive the vehicle and handback context"],
  ["02", "Locate", "Record depot, zone, bay, keys and custody"],
  ["03", "Inspect", "Complete checks and compare known condition"],
  ["04", "Resolve", "Create tasks, defects, repairs or a VOR hold"],
  ["05", "Release", "Publish a supported readiness state"],
];

const faqs = [
  {
    question: "What is Veyvio Yard?",
    answer:
      "Veyvio Yard is the mobile-first depot application in the Veyvio platform. It is designed for yard managers and depot operatives controlling vehicle location, readiness, movements, equipment, checks, damage and release.",
  },
  {
    question: "How does Yard connect with Command and Driver?",
    answer:
      "Driver can return frontline checks, defects and handback context. Yard resolves the physical vehicle state and publishes readiness. Authorised Command users can then use that state when assigning and releasing work.",
  },
  {
    question: "Can Yard support weak connectivity?",
    answer:
      "The product architecture is designed for selected offline-tolerant tasks, vehicle context, forms and evidence. Queued updates remain attributable and visible until the server acknowledges or resolves them.",
  },
  {
    question: "Is every capability shown generally available?",
    answer:
      "Veyvio Yard is currently presented as a pilot product. This page reflects the intended operating model and current engineering direction; exact implementation and pilot scope are confirmed during consultation.",
  },
];

const vehicles = [
  ["WX21 FYV", "Bay 01", "Available", "78%", "Ready"],
  ["EO71 NTJ", "Bay 03", "Awaiting check", "45%", "PMI due"],
  ["YG68 AKF", "Bay 04", "Awaiting check", "62%", "Cleaning"],
  ["HV20 PLK", "Bay 08", "Available", "71%", "Ready"],
  ["LM19 BCT", "Bay 10", "VOR", "30%", "Brake defect"],
  ["NK22 HRP", "Bay 15", "Available", "88%", "WAV ready"],
];

function Tick() {
  return (
    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f4d7] text-xs font-black text-veyvio-deep">
      ✓
    </span>
  );
}

function ConsoleHeader({ title }: { title: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between border-b border-[#d7e2e4] bg-white px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-veyvio-deep text-xs font-black text-white">
          VY
        </span>
        <div>
          <p className="text-[0.48rem] font-black uppercase tracking-[0.18em] text-veyvio-teal">Veyvio Yard</p>
          <p className="text-[0.72rem] font-extrabold text-veyvio-deep">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[0.55rem] font-bold text-veyvio-muted">
        <span className="hidden rounded-full bg-[#e8f4d7] px-2.5 py-1 sm:inline">Synced now</span>
        <span className="flex size-7 items-center justify-center rounded-full bg-[#eaf1f2] text-veyvio-deep">DL</span>
      </div>
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-36 shrink-0 bg-veyvio-deep p-3 text-white sm:block">
      <p className="px-2 pb-3 pt-2 text-[0.46rem] font-black uppercase tracking-[0.18em] text-white/35">Depot</p>
      {["Board", "Vehicles", "Yard map", "Checks", "Bodywork", "Movements"].map((item) => (
        <div
          key={item}
          className={`mb-1 rounded-lg px-3 py-2 text-[0.58rem] font-bold ${
            item === active ? "bg-white/12 text-white" : "text-white/45"
          }`}
        >
          {item}
        </div>
      ))}
    </aside>
  );
}

function Metric({ label, value, note, colour = "text-veyvio-deep" }: { label: string; value: string; note: string; colour?: string }) {
  return (
    <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
      <p className="text-[0.46rem] font-black uppercase tracking-[0.13em] text-veyvio-muted">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${colour}`}>{value}</p>
      <p className="mt-0.5 text-[0.5rem] text-veyvio-muted">{note}</p>
    </div>
  );
}

function ConsoleShell({ title, active, children }: { title: string; active: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[42rem] overflow-hidden rounded-[1.5rem] border border-[#cedde0] bg-[#f4f7f7] shadow-[0_30px_75px_rgba(23,62,72,0.2)]">
      <ConsoleHeader title={title} />
      <div className="flex min-h-[29rem]">
        <Sidebar active={active} />
        <div className="min-w-0 flex-1 p-3 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function BoardView() {
  return (
    <ConsoleShell title="Depot board" active="Board">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.5rem] font-bold uppercase tracking-[0.14em] text-veyvio-teal">Sunday · Early shift</p>
          <h4 className="mt-1 text-lg font-extrabold text-veyvio-deep">Good morning, Dana.</h4>
        </div>
        <span className="rounded-full bg-veyvio-lime px-3 py-1.5 text-[0.55rem] font-black text-veyvio-deep">+ New task</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Ready" value="18" note="of 24 on site" colour="text-[#5d9221]" />
        <Metric label="Needs action" value="4" note="2 checks due" colour="text-[#b06a15]" />
        <Metric label="VOR" value="2" note="release blocked" colour="text-[#c44c43]" />
        <Metric label="Unlocated" value="0" note="all accounted" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
          <p className="text-[0.56rem] font-extrabold text-veyvio-deep">Readiness by state</p>
          <div className="mt-4 flex h-28 items-end gap-3">
            {([["Ready", 82, "#7ab82e"], ["Check", 54, "#e7a331"], ["VOR", 30, "#ef6b5c"], ["Shop", 42, "#4a8fa3"]] as [string, number, string][]).map(
              ([label, height, colour]) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="w-full rounded-t-md" style={{ height: `${height}%`, backgroundColor: colour }} />
                  <span className="text-[0.42rem] font-bold text-veyvio-muted">{label}</span>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[0.56rem] font-extrabold text-veyvio-deep">Needs attention</p>
            <span className="text-[0.46rem] font-bold text-veyvio-teal">View all</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {[
              ["LM19 BCT", "Brake defect · VOR", "Critical"],
              ["EO71 NTJ", "PMI and Yard check due", "Due"],
              ["YG68 AKF", "Cleaning in progress", "Active"],
            ].map(([reg, issue, state]) => (
              <div key={reg} className="flex items-center justify-between rounded-lg bg-[#f5f8f8] p-2.5">
                <div><p className="text-[0.56rem] font-extrabold text-veyvio-deep">{reg}</p><p className="text-[0.46rem] text-veyvio-muted">{issue}</p></div>
                <span className="rounded-full bg-white px-2 py-1 text-[0.42rem] font-bold text-veyvio-deep">{state}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}

function VehiclesView() {
  return (
    <ConsoleShell title="Vehicles" active="Vehicles">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[0.5rem] font-bold uppercase tracking-[0.14em] text-veyvio-teal">24 vehicles on site</p><h4 className="mt-1 text-lg font-extrabold text-veyvio-deep">Depot fleet</h4></div>
        <div className="flex gap-2"><span className="rounded-lg border border-[#dbe5e7] bg-white px-3 py-2 text-[0.5rem] text-veyvio-muted">Search registration</span><span className="rounded-lg bg-veyvio-deep px-3 py-2 text-[0.5rem] font-bold text-white">Needs action</span></div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#dbe5e7] bg-white">
        <div className="grid grid-cols-[1.05fr_.75fr_1fr_.55fr_1fr] gap-2 border-b border-[#dbe5e7] bg-[#f3f7f7] px-3 py-2 text-[0.42rem] font-black uppercase tracking-[0.12em] text-veyvio-muted">
          <span>Vehicle</span><span>Location</span><span>State</span><span>Fuel</span><span>Readiness</span>
        </div>
        {vehicles.map(([reg, bay, state, fuel, note]) => (
          <div key={reg} className="grid grid-cols-[1.05fr_.75fr_1fr_.55fr_1fr] items-center gap-2 border-b border-[#edf1f2] px-3 py-3 last:border-0">
            <span className="text-[0.56rem] font-extrabold text-veyvio-deep">{reg}</span>
            <span className="text-[0.5rem] text-veyvio-muted">{bay}</span>
            <span className={`text-[0.48rem] font-bold ${state === "VOR" ? "text-[#c44c43]" : "text-veyvio-deep"}`}>{state}</span>
            <span className="text-[0.5rem] text-veyvio-muted">{fuel}</span>
            <span className="text-[0.48rem] font-bold text-veyvio-teal">{note}</span>
          </div>
        ))}
      </div>
    </ConsoleShell>
  );
}

const mapVehicles: Record<number, [string, string]> = {
  1: ["WX21", "#7ab82e"], 3: ["EO71", "#e7a331"], 4: ["YG68", "#e7a331"], 8: ["HV20", "#7ab82e"],
  10: ["LM19", "#ef6b5c"], 15: ["NK22", "#7ab82e"], 20: ["PF70", "#4a8fa3"], 22: ["RS21", "#7ab82e"],
};

function DepotMap({ large = false }: { large?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#cddcdf] bg-[#eaf2f1] p-3 ${large ? "min-h-[29rem]" : "min-h-[20rem]"}`}>
      <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#a9c4c8_1px,transparent_1px)] [background-size:13px_13px]" />
      <div className="relative grid grid-cols-5 gap-1.5">
        {Array.from({ length: 25 }, (_, index) => index + 1).map((bay) => {
          const vehicle = mapVehicles[bay];
          return (
            <div key={bay} className={`relative min-h-11 rounded-md border ${vehicle ? "border-white bg-white shadow-sm" : "border-[#c3d5d8] bg-white/30"}`}>
              <span className="absolute left-1 top-1 text-[0.38rem] font-bold text-veyvio-muted">{String(bay).padStart(2, "0")}</span>
              {vehicle ? (
                <span className="absolute inset-x-1 bottom-1 rounded px-1 py-1 text-center text-[0.4rem] font-black text-white" style={{ backgroundColor: vehicle[1] }}>{vehicle[0]}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="relative mt-2 grid grid-cols-[1fr_.7fr] gap-2">
        <div className="rounded-lg border border-dashed border-[#4a8fa3] bg-white/70 px-3 py-2">
          <p className="text-[0.42rem] font-black uppercase tracking-[0.12em] text-veyvio-teal">Workshop</p>
          <p className="mt-0.5 text-[0.48rem] font-bold text-veyvio-deep">PF70 XTR · Bay W2</p>
        </div>
        <div className="rounded-lg bg-veyvio-deep px-3 py-2 text-white">
          <p className="text-[0.42rem] font-black uppercase tracking-[0.12em] text-white/55">Departure line</p>
          <p className="mt-0.5 text-[0.48rem] font-bold">D01–D04 clear</p>
        </div>
      </div>
      <div className="relative mt-2 flex gap-3 text-[0.4rem] font-bold text-veyvio-muted">
        {[["#7ab82e", "Ready"], ["#e7a331", "Action"], ["#ef6b5c", "VOR"], ["#4a8fa3", "Workshop"]].map(([colour, label]) => (
          <span key={label} className="flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: colour }} />{label}</span>
        ))}
      </div>
    </div>
  );
}

function MapView() {
  return (
    <ConsoleShell title="Live Yard map" active="Yard map">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[0.5rem] font-bold uppercase tracking-[0.14em] text-veyvio-teal">North depot · live</p><h4 className="mt-1 text-lg font-extrabold text-veyvio-deep">Every vehicle accounted for.</h4></div>
        <span className="rounded-lg bg-white px-3 py-2 text-[0.5rem] font-bold text-veyvio-deep shadow-sm">Layers · Readiness</span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_8.5rem]">
        <DepotMap />
        <div className="rounded-xl bg-veyvio-deep p-3 text-white">
          <p className="text-[0.45rem] font-black uppercase tracking-[0.12em] text-white/45">Selected</p>
          <p className="mt-2 text-base font-extrabold">LM19 BCT</p>
          <p className="mt-1 text-[0.48rem] text-white/55">Bay 10 · VOR</p>
          <div className="my-4 h-px bg-white/10" />
          <p className="text-[0.48rem] text-white/55">Brake defect</p>
          <p className="mt-1 text-[0.52rem] font-bold">Movement blocked</p>
          <button className="mt-5 w-full rounded-lg bg-[#ef6b5c] px-2 py-2 text-[0.48rem] font-black">Open vehicle</button>
        </div>
      </div>
    </ConsoleShell>
  );
}

function ChecksView() {
  return (
    <ConsoleShell title="Checks & bodywork" active="Checks">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Awaiting Yard" value="2" note="checks" />
        <Metric label="Driver reports" value="2" note="to review" colour="text-[#5d48b7]" />
        <Metric label="Follow-up" value="1" note="new damage" colour="text-[#b06a15]" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[.82fr_1.18fr]">
        <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
          <p className="text-[0.56rem] font-extrabold text-veyvio-deep">Driver reports</p>
          {[["EO71 NTJ", "Rear bumper scuff", "Review"], ["NK22 HRP", "Sliding-door dent", "Compare"]].map(([reg, issue, state]) => (
            <div key={reg} className="mt-2 rounded-lg bg-[#f5f8f8] p-2.5">
              <div className="flex items-center justify-between"><p className="text-[0.54rem] font-extrabold text-veyvio-deep">{reg}</p><span className="text-[0.42rem] font-bold text-[#5d48b7]">{state}</span></div>
              <p className="mt-1 text-[0.46rem] text-veyvio-muted">{issue}</p>
            </div>
          ))}
          <button className="mt-3 w-full rounded-lg bg-veyvio-deep px-3 py-2 text-[0.5rem] font-bold text-white">Start Yard check</button>
        </div>
        <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
          <div className="flex items-center justify-between"><div><p className="text-[0.46rem] font-bold uppercase tracking-[0.12em] text-veyvio-teal">Body condition</p><p className="mt-1 text-sm font-extrabold text-veyvio-deep">NK22 HRP · WAV</p></div><span className="rounded-full bg-[#fff0dc] px-2 py-1 text-[0.42rem] font-bold text-[#9b5c12]">1 new</span></div>
          <div className="relative mt-7 h-28">
            <div className="absolute left-1/2 top-1/2 h-16 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[45%_45%_32%_32%] border-2 border-[#9db4b9] bg-[#eaf1f2]" />
            <div className="absolute left-1/2 top-1/2 h-11 w-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#9db4b9] bg-white" />
            <span className="absolute left-[23%] top-[28%] size-4 rounded-full border-4 border-white bg-[#ef6b5c] shadow" />
            <span className="absolute bottom-[22%] right-[28%] size-3 rounded-full border-2 border-white bg-[#5d48b7] shadow" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#fff0ee] p-2"><p className="text-[0.44rem] font-bold text-[#c44c43]">New report</p><p className="mt-1 text-[0.46rem] text-veyvio-deep">Sliding-door dent</p></div>
            <div className="rounded-lg bg-[#f0ebfc] p-2"><p className="text-[0.44rem] font-bold text-[#5d48b7]">Known damage</p><p className="mt-1 text-[0.46rem] text-veyvio-deep">Rear quarter mark</p></div>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}

function ReleaseView() {
  const checklist: [string, boolean, string][] = [
    ["Vehicle staged", true, "Departure line D02"],
    ["Yard check passed", true, "Completed 06:42"],
    ["Fuel adequate", true, "78%"],
    ["VOR hold", true, "No active hold"],
    ["Equipment ready", false, "First-aid seal missing"],
  ];
  return (
    <ConsoleShell title="Move & release" active="Movements">
      <div className="grid gap-3 lg:grid-cols-[.82fr_1.18fr]">
        <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
          <p className="text-[0.46rem] font-black uppercase tracking-[0.12em] text-veyvio-teal">Record movement</p>
          <p className="mt-1 text-base font-extrabold text-veyvio-deep">WX21 FYV</p>
          <div className="mt-4 space-y-2">
            {[["From", "Bay 01"], ["To", "Departure line · D02"], ["Reason", "Morning service staging"], ["Keys", "With Yard · Dana L."]].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#f5f8f8] px-3 py-2"><p className="text-[0.42rem] text-veyvio-muted">{label}</p><p className="mt-0.5 text-[0.54rem] font-bold text-veyvio-deep">{value}</p></div>
            ))}
          </div>
          <button className="mt-3 w-full rounded-lg bg-veyvio-deep px-3 py-2.5 text-[0.5rem] font-black text-white">Record movement</button>
        </div>
        <div className="rounded-xl border border-[#dbe5e7] bg-white p-3">
          <div className="flex items-center justify-between"><div><p className="text-[0.46rem] font-black uppercase tracking-[0.12em] text-veyvio-teal">Release gate</p><p className="mt-1 text-sm font-extrabold text-veyvio-deep">Morning school · RUN-24017</p></div><span className="rounded-full bg-[#fff0dc] px-2 py-1 text-[0.42rem] font-bold text-[#9b5c12]">Blocked</span></div>
          <div className="mt-3 space-y-1.5">
            {checklist.map(([label, passed, value]) => (
              <div key={label} className="flex items-center gap-2 rounded-lg bg-[#f5f8f8] px-2.5 py-2">
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[0.48rem] font-black ${passed ? "bg-[#e8f4d7] text-[#5d9221]" : "bg-[#fff0dc] text-[#b06a15]"}`}>{passed ? "✓" : "!"}</span>
                <div className="min-w-0"><p className="text-[0.5rem] font-bold text-veyvio-deep">{label}</p><p className="truncate text-[0.42rem] text-veyvio-muted">{value}</p></div>
              </div>
            ))}
          </div>
          <button disabled className="mt-3 w-full cursor-not-allowed rounded-lg bg-[#d7e0e2] px-3 py-2.5 text-[0.5rem] font-black text-veyvio-muted">Resolve equipment before release</button>
        </div>
      </div>
    </ConsoleShell>
  );
}

function YardConsole({ view }: { view: YardView }) {
  if (view === "vehicles") return <VehiclesView />;
  if (view === "map") return <MapView />;
  if (view === "checks") return <ChecksView />;
  if (view === "release") return <ReleaseView />;
  return <BoardView />;
}

function Questions() {
  return (
    <section className="border-t border-veyvio-border bg-white py-20 sm:py-28">
      <div className="section-container grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Yard questions</p>
          <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">Useful answers before a depot walkthrough.</h2>
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

export function YardPage() {
  usePageMeta({
    title: "Veyvio Yard",
    description: "Control depot vehicle location, readiness, movements, equipment, checks, damage and safe release with Veyvio Yard.",
    path: "/platform/yard",
  });

  const [activeView, setActiveView] = useState<YardView>("board");
  const active = features.find((feature) => feature.key === activeView) ?? features[0];
  const benefitReveal = useRevealOnScroll<HTMLDivElement>();
  const explorerReveal = useRevealOnScroll<HTMLDivElement>();
  const workflowReveal = useRevealOnScroll<HTMLDivElement>();

  return (
    <>
      <section className="relative min-h-[calc(100svh-5rem)] overflow-hidden bg-white">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#edf5f3] to-transparent" />
        <div className="absolute -left-24 top-32 size-72 rounded-full bg-[#dff1c8] blur-3xl" />
        <div className="absolute -right-20 top-20 size-80 rounded-full bg-[#d9eef2] blur-3xl" />
        <div className="section-container relative grid min-h-[calc(100svh-5rem)] gap-12 py-16 min-[900px]:grid-cols-[.82fr_1.18fr] min-[900px]:items-center min-[900px]:py-10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-veyvio-border bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-veyvio-teal shadow-sm backdrop-blur">
              <span className="size-2 rounded-full bg-veyvio-lime" />Veyvio Yard · Pilot
            </div>
            <h1 className="page-hero-title text-veyvio-deep">
              Every vehicle.
              <br />
              <span className="text-veyvio-lime">Ready and</span>
              <br />
              accounted for.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-veyvio-muted">
              Give depot teams one operational view of vehicle location, readiness, equipment, checks, damage, movements and safe release.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/demo" className="btn-primary" onClick={() => trackCta("demo_cta_selected", "Book a Yard demo", { ctaPosition: "yard-hero" })}>Book a Yard demo</Link>
              <a href="#capabilities" className="btn-secondary">Explore Yard</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-veyvio-deep">
              {["Mobile-first", "Invitation-only", "Depot & role scoped"].map((item) => <span key={item} className="flex items-center gap-2"><Tick />{item}</span>)}
            </div>
          </div>
          <div className="relative mx-auto min-h-[38rem] w-full max-w-[46rem] min-[900px]:scale-[.84] lg:scale-100">
            <div className="absolute left-1/2 top-1/2 h-[31rem] w-[31rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c7dcdf] bg-white/65 shadow-[0_50px_100px_rgba(23,62,72,.1)]" />
            <div className="absolute left-[2%] top-[11%] w-[88%] rotate-[-2deg] opacity-55"><MapView /></div>
            <div className="absolute right-0 top-[5%] z-10 w-[88%] rotate-[1.5deg]"><BoardView /></div>
            <div className="absolute left-0 top-[17%] z-20 rounded-2xl border border-veyvio-border bg-white p-3.5 shadow-xl">
              <p className="text-[.55rem] font-bold uppercase tracking-[.14em] text-veyvio-teal">Depot readiness</p>
              <p className="mt-1 text-sm font-extrabold text-veyvio-deep">18 of 24 ready</p>
            </div>
            <div className="absolute bottom-[12%] right-0 z-20 rounded-2xl bg-veyvio-deep p-3.5 text-white shadow-xl">
              <p className="text-[.52rem] uppercase tracking-[.14em] text-white/50">Needs action</p>
              <p className="mt-1 text-sm font-extrabold"><span className="text-veyvio-lime">2 checks</span> · 2 VOR</p>
            </div>
          </div>
        </div>
      </section>

      <section ref={benefitReveal.ref} className="bg-veyvio-deep py-20 text-white sm:py-24">
        <div className="section-container">
          <div className={`grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end ${benefitReveal.visible ? "reveal is-visible" : "reveal"}`}>
            <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#9fd9e5]">Physical operations, shared truth</p><h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-6xl">Know what is in the yard—and what it can do next.</h2></div>
            <p className="max-w-xl text-lg leading-8 text-white/65 lg:justify-self-end">Yard turns physical custody into operational evidence, so readiness is supported by location, condition, equipment and accountable action.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[1.6rem] bg-white/15 md:grid-cols-4">
            {benefits.map(([number, title, copy], index) => (
              <article key={number} className={`group min-h-80 bg-veyvio-deep p-6 transition duration-300 hover:bg-white hover:text-veyvio-deep ${benefitReveal.visible ? "reveal is-visible" : "reveal"}`} style={{ transitionDelay: `${index * 70}ms` }}>
                <span className="flex size-10 items-center justify-center rounded-full bg-veyvio-lime text-sm font-black text-veyvio-deep">{number}</span>
                <div className="mt-24"><h3 className="font-marketing text-2xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/60 group-hover:text-veyvio-muted">{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" ref={explorerReveal.ref} className="scroll-mt-24 bg-veyvio-surface py-20 sm:py-28">
        <div className="section-container">
          <div className={`grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end ${explorerReveal.visible ? "reveal is-visible" : "reveal"}`}>
            <div><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Explore the Yard app</p><h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">One depot view from return to release.</h2></div>
            <p className="max-w-xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">Select a capability to see how Yard joins the physical vehicle, its evidence and the release decision.</p>
          </div>
          <div className="mt-10 flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="Yard capabilities">
            {features.map((feature) => (
              <button key={feature.key} type="button" role="tab" aria-selected={feature.key === activeView} onClick={() => setActiveView(feature.key)} className={`min-w-max rounded-full border px-4 py-2.5 text-sm font-bold transition ${feature.key === activeView ? "border-veyvio-deep bg-veyvio-deep text-white shadow-lg" : "border-veyvio-border bg-white text-veyvio-deep hover:border-veyvio-teal"}`}>
                <span className="mr-2 text-[.62rem] opacity-60">{feature.number}</span>{feature.label}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-[2rem] border border-veyvio-border bg-white shadow-[0_25px_70px_rgba(23,62,72,.1)]">
            <div className="grid min-[940px]:grid-cols-[.86fr_1.14fr]">
              <div className="flex min-h-[37rem] flex-col justify-center p-7 sm:p-12">
                <p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: active.accent }}>{active.eyebrow}</p>
                <h3 className="mt-4 max-w-xl font-marketing text-[clamp(1.875rem,3vw,3rem)] font-extrabold tracking-[-.035em] text-veyvio-deep">{active.title}</h3>
                <p className="mt-5 max-w-lg text-lg leading-8 text-veyvio-muted">{active.copy}</p>
                <ul className="mt-8 space-y-4">{active.bullets.map((bullet) => <li key={bullet} className="flex items-start gap-3 font-semibold text-veyvio-deep"><Tick /><span>{bullet}</span></li>)}</ul>
                <div className="mt-9 flex flex-wrap gap-3"><Link to="/demo" className="btn-primary">See Yard in a demo</Link><Link to="/platform" className="btn-secondary">View the platform</Link></div>
              </div>
              <div className="relative flex min-h-[42rem] items-center justify-center overflow-hidden px-5 py-12" style={{ background: `radial-gradient(circle at 50% 45%, white 0%, ${active.accent}18 44%, ${active.accent}0d 100%)` }}>
                <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#b7cdd2_1px,transparent_1px)] [background-size:15px_15px]" />
                <div key={active.key} className="relative z-10 w-full animate-[fadeIn_.35s_ease-out]"><YardConsole view={active.key} /></div>
              </div>
            </div>
            <div className="h-2" style={{ backgroundColor: active.accent }} />
          </div>
        </div>
      </section>

      <section ref={workflowReveal.ref} className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-4xl text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">One controlled vehicle journey</p><h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">Readiness is a workflow, not a coloured badge.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">Each step preserves the reason for the current state and the evidence needed to change it.</p></div>
          <div className="mt-14 grid gap-3 md:grid-cols-5">
            {workflow.map(([number, title, copy], index) => (
              <article key={number} className={`group relative min-h-80 overflow-hidden rounded-[1.4rem] border border-veyvio-border bg-white p-5 transition duration-300 hover:-translate-y-2 hover:border-veyvio-teal hover:shadow-[0_24px_55px_rgba(23,62,72,.13)] ${workflowReveal.visible ? "reveal is-visible" : "reveal"}`} style={{ transitionDelay: `${index * 70}ms` }}>
                <span className="font-marketing text-5xl font-extrabold tracking-[-.07em] text-[#dbe7e9] transition group-hover:text-[#a5d2db]">{number}</span>
                <div className="mt-24"><h3 className="font-marketing text-2xl font-bold text-veyvio-deep">{title}</h3><p className="mt-3 text-sm leading-6 text-veyvio-muted">{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-veyvio-deep py-20 text-white sm:py-28">
        <div className="section-container grid gap-14 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#9fd9e5]">Condition, not just compliance</p><h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-6xl">Damage should start a controlled workflow.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-white/65">A new report can be compared with the onboarding baseline and known damage, then linked to inspection, repair, maintenance or a VOR decision—with the vehicle and evidence still connected.</p><div className="mt-9 grid gap-3 sm:grid-cols-2">{[["Compare", "Separate known condition from genuinely new damage."], ["Evidence", "Keep the diagram, photos, actor and time together."], ["Decide", "Record whether the vehicle can move or must be held."], ["Resolve", "Link bodywork, maintenance and return-to-service work."]].map(([title, copy]) => <div key={title} className="rounded-2xl border border-white/15 bg-white/[.06] p-5"><p className="font-marketing text-lg font-bold">{title}</p><p className="mt-2 text-sm leading-6 text-white/55">{copy}</p></div>)}</div></div>
          <div className="relative flex min-h-[40rem] items-center justify-center"><div className="absolute size-[32rem] rounded-full border border-white/10 bg-[#5d48b7]/10" /><div className="relative z-10 w-full max-w-[39rem]"><ChecksView /></div><div className="absolute bottom-[12%] right-0 z-20 rounded-2xl bg-[#ef6b5c] p-3.5 shadow-xl"><p className="text-[.52rem] uppercase tracking-[.14em] text-white/65">Outcome</p><p className="mt-1 text-sm font-extrabold">Follow-up required</p></div></div>
        </div>
      </section>

      <section className="bg-veyvio-surface py-20 sm:py-28">
        <div className="section-container grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
          <div><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">A spatial record</p><h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">The depot map becomes operational evidence.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-veyvio-muted">Location is part of readiness. Yard records the zone, bay, movement, actor, reason and custody state so the next team can find and trust the vehicle.</p><ul className="mt-8 space-y-4">{["See occupancy and readiness together", "Move vehicles with a recorded reason", "Keep keys and custody visible", "Retain a movement history for each vehicle"].map((item) => <li key={item} className="flex items-center gap-3 font-semibold text-veyvio-deep"><Tick />{item}</li>)}</ul></div>
          <DepotMap large />
        </div>
      </section>

      <section className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-teal">Part of one connected platform</p><h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">Yard closes the gap between plan and physical reality.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">Command plans and governs the work. Driver returns frontline context. Yard establishes the vehicle state that the next safe decision depends on.</p></div>
          <div className="mx-auto mt-10 max-w-5xl"><img src="/images/sections/veyvio-connected-apps-v1.png" alt="Veyvio Command, Yard and Driver interfaces shown across laptop, tablet and phone" className="h-auto w-full" loading="lazy" /></div>
          <div className="mt-4 flex justify-center"><Link to="/platform" className="btn-secondary">Explore the Veyvio platform</Link></div>
        </div>
      </section>

      <Questions />

      <section className="bg-veyvio-lime py-20 sm:py-24">
        <div className="section-container grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[.2em] text-veyvio-deep/65">A depot-specific next step</p><h2 className="mt-3 max-w-4xl font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-6xl">Walk through your readiness process with Veyvio Yard.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-veyvio-deep/70">Bring your current return, inspection, movement, equipment and release workflow. The demonstration can follow the reality of your depot.</p></div>
          <div className="flex flex-wrap gap-3 lg:justify-end"><Link to="/demo" className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-full bg-veyvio-deep px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-.5 hover:bg-[#0e3038]" onClick={() => trackCta("demo_cta_selected", "Book a Yard demo", { ctaPosition: "yard-footer" })}>Book a Yard demo</Link><Link to="/contact" className="inline-flex min-h-11 min-w-[9rem] items-center justify-center rounded-full border border-veyvio-deep/30 px-6 py-2.5 text-sm font-semibold text-veyvio-deep transition hover:border-veyvio-deep hover:bg-white">Talk to the team</Link></div>
        </div>
      </section>
    </>
  );
}
