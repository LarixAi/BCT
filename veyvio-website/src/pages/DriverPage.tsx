import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type DriverScreen = "home" | "trip" | "check" | "sync" | "handback";

type DriverFeature = {
  key: DriverScreen;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  bullets: string[];
  accent: string;
};

const driverFeatures: DriverFeature[] = [
  {
    key: "home",
    number: "01",
    label: "My duty",
    eyebrow: "The shift starts here",
    title: "Know the duty, vehicle and next required action.",
    copy:
      "The home view brings the driver’s next duty, depot, vehicle, bay and readiness state into one calm starting point.",
    bullets: [
      "Assigned work and acknowledgement",
      "Vehicle, location and estimated finish",
      "One dominant pre-duty action",
    ],
    accent: "#7ab82e",
  },
  {
    key: "trip",
    number: "02",
    label: "Trips",
    eyebrow: "Guidance on the move",
    title: "Progress each stop with the right context in reach.",
    copy:
      "Drivers can follow the assigned stop sequence, open navigation and record controlled arrival, departure and exception states.",
    bullets: [
      "Today and upcoming duties",
      "Stop sequence and passenger requirements",
      "Large, controlled status actions",
    ],
    accent: "#2498b1",
  },
  {
    key: "check",
    number: "03",
    label: "Checks",
    eyebrow: "Safety before movement",
    title: "Complete vehicle checks without paper chasing.",
    copy:
      "Guided pre-use, defect and change-of-vehicle checks make required evidence visible before the duty can safely continue.",
    bullets: [
      "Progressive, camera-first checks",
      "Pass, advisory and fail outcomes",
      "A clear explanation when work is blocked",
    ],
    accent: "#5d48b7",
  },
  {
    key: "sync",
    number: "04",
    label: "Offline & sync",
    eyebrow: "Designed for weak signal",
    title: "Keep selected work moving when connectivity drops.",
    copy:
      "Assigned duties and essential forms can remain available while queued updates show their state until Command acknowledges them.",
    bullets: [
      "Visible last-sync and pending counts",
      "Queued, attributable offline updates",
      "Clear retry and resolution states",
    ],
    accent: "#173e48",
  },
  {
    key: "handback",
    number: "05",
    label: "Handback",
    eyebrow: "Close the operational loop",
    title: "Return the vehicle with a complete handback record.",
    copy:
      "End-of-duty guidance captures mileage, fuel or charge, condition, keys, equipment and exact parking location before sign-off.",
    bullets: [
      "Autosaved end-of-duty progress",
      "Condition, defect and lost-property prompts",
      "Exact bay and key-location record",
    ],
    accent: "#ef6b5c",
  },
];

const benefits = [
  {
    number: "01",
    title: "A clear next action",
    copy: "The duty screen prioritises the step that matters now instead of presenting a wall of controls.",
    colour: "bg-veyvio-lime",
  },
  {
    number: "02",
    title: "Safety in sequence",
    copy: "Readiness checks sit in the path to work, with blocked states explaining what must happen next.",
    colour: "bg-[#5d48b7]",
  },
  {
    number: "03",
    title: "Calm under weak signal",
    copy: "Selected operational work can queue safely while the app keeps sync state visible.",
    colour: "bg-[#2498b1]",
  },
  {
    number: "04",
    title: "A clean handback",
    copy: "The shift closes with vehicle state, evidence, keys and parking location connected to the duty.",
    colour: "bg-[#ef6b5c]",
  },
];

const dutySteps = [
  ["01", "Acknowledge", "Confirm the assigned duty and review the operating context."],
  ["02", "Check", "Complete readiness and vehicle checks before sign-on."],
  ["03", "Operate", "Follow stops, navigate and record controlled progress."],
  ["04", "Record", "Capture exceptions, incidents and evidence as they happen."],
  ["05", "Hand back", "Close mileage, condition, equipment, keys and parking."],
];

const faqs = [
  {
    question: "What is Veyvio Driver?",
    answer:
      "Veyvio Driver is the mobile-first frontline application in the Veyvio platform. It is designed to guide drivers and escorts through assigned duties, checks, trip progress, communication and end-of-duty handback.",
  },
  {
    question: "Does the app work without a reliable signal?",
    answer:
      "The product architecture supports offline-tolerant operation for selected assigned duties, essential forms, vehicle context and messages. Queued updates retain visible pending and failed states until the server acknowledges them.",
  },
  {
    question: "How does Driver connect with Command?",
    answer:
      "Driver communicates through the shared platform APIs and event model. Acknowledgements, checks, progress, incidents and handback updates can contribute to the operational state seen by authorised Command users.",
  },
  {
    question: "Is every capability shown generally available?",
    answer:
      "Veyvio Driver is currently presented as a pilot product. The page reflects the intended operating model and implemented product direction; the exact pilot scope is confirmed during consultation.",
  },
];

function Tick() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f4d7] text-xs font-black text-veyvio-deep"
    >
      ✓
    </span>
  );
}

function PhoneHeader({ title, synced = true }: { title: string; synced?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2 pt-3 text-[0.56rem] font-bold text-veyvio-deep">
        <span>09:41</span>
        <span className="h-1.5 w-14 rounded-full bg-veyvio-deep" />
        <span>{synced ? "5G" : "Offline"} · 87%</span>
      </div>
      <div className="flex items-center justify-between border-b border-[#dbe5e7] px-4 py-3">
        <div>
          <p className="text-[0.5rem] font-black uppercase tracking-[0.18em] text-veyvio-teal">
            Veyvio Driver
          </p>
          <p className="mt-1 text-sm font-extrabold text-veyvio-deep">{title}</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-veyvio-deep text-[0.58rem] font-black text-white">
          AM
        </span>
      </div>
    </>
  );
}

function HomeScreen() {
  return (
    <div>
      <PhoneHeader title="Today’s shift" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between rounded-xl bg-[#edf6e4] px-3 py-2">
          <span className="flex items-center gap-2 text-[0.58rem] font-bold text-veyvio-deep">
            <span className="size-2 rounded-full bg-veyvio-lime" />
            Synced 1 min ago
          </span>
          <span className="text-[0.52rem] font-semibold text-veyvio-muted">0 pending</span>
        </div>
        <div className="rounded-2xl bg-veyvio-deep p-4 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.52rem] font-bold uppercase tracking-[0.16em] text-[#9fd9e5]">
                Next duty · 32 min
              </p>
              <p className="mt-2 text-lg font-extrabold">CT-104</p>
              <p className="mt-1 text-[0.62rem] text-white/70">North Loop · 8 jobs</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.52rem] font-bold">
              Assigned
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="text-[0.48rem] uppercase tracking-[0.12em] text-white/55">Vehicle</p>
              <p className="mt-1 text-xs font-bold">BX62 BCT</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="text-[0.48rem] uppercase tracking-[0.12em] text-white/55">Location</p>
              <p className="mt-1 text-xs font-bold">Bay 04</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#dbe5e7] bg-white p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.52rem] font-bold uppercase tracking-[0.14em] text-veyvio-teal">
                Pre-duty
              </p>
              <p className="mt-1 text-sm font-extrabold text-veyvio-deep">Vehicle check required</p>
            </div>
            <span className="flex size-8 items-center justify-center rounded-full bg-[#fff0dc] text-sm font-black text-[#b46b19]">
              !
            </span>
          </div>
          <button className="mt-4 w-full rounded-xl bg-veyvio-lime px-4 py-3 text-xs font-black text-veyvio-deep">
            Start vehicle check
          </button>
        </div>
      </div>
    </div>
  );
}

function TripScreen() {
  const stops = [
    ["08:40", "Depot", "Departed"],
    ["09:05", "Moor Lane", "Complete"],
    ["09:22", "Greenbank Centre", "Next"],
    ["09:48", "Riverside Clinic", "Planned"],
  ];
  return (
    <div>
      <PhoneHeader title="CT-104 · North Loop" />
      <div className="relative h-40 overflow-hidden bg-[#eaf3f2]">
        <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(28deg,transparent_46%,#cbdad7_47%,#cbdad7_50%,transparent_51%),linear-gradient(102deg,transparent_47%,#d4e2df_48%,#d4e2df_51%,transparent_52%)] [background-size:62px_52px,76px_68px]" />
        <div className="absolute left-[17%] top-[60%] h-1.5 w-[68%] -rotate-12 rounded-full bg-[#2498b1]" />
        <span className="absolute left-[18%] top-[57%] size-4 rounded-full border-4 border-white bg-veyvio-deep shadow" />
        <span className="absolute right-[20%] top-[39%] flex size-6 items-center justify-center rounded-full border-4 border-white bg-veyvio-lime text-[0.45rem] font-black text-veyvio-deep shadow">
          3
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[0.52rem] font-bold text-veyvio-deep shadow">
          Open navigation ↗
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        {stops.map(([time, place, state], index) => (
          <div
            key={place}
            className={`grid grid-cols-[38px_1fr_auto] items-center gap-2 rounded-xl px-2.5 py-2.5 ${
              state === "Next" ? "bg-[#e9f5f8]" : "bg-[#f5f8f8]"
            }`}
          >
            <span className="text-[0.54rem] font-bold text-veyvio-muted">{time}</span>
            <div>
              <p className="text-[0.66rem] font-extrabold text-veyvio-deep">{place}</p>
              <p className="mt-0.5 text-[0.5rem] text-veyvio-muted">
                {index === 2 ? "Boarding support noted" : "Scheduled stop"}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-[0.48rem] font-bold ${
                state === "Next"
                  ? "bg-[#2498b1] text-white"
                  : state === "Complete" || state === "Departed"
                    ? "bg-[#e8f4d7] text-veyvio-deep"
                    : "bg-white text-veyvio-muted"
              }`}
            >
              {state}
            </span>
          </div>
        ))}
        <button className="mt-2 w-full rounded-xl bg-[#2498b1] px-4 py-3 text-xs font-black text-white">
          Arrived at Greenbank Centre
        </button>
      </div>
    </div>
  );
}

function CheckScreen() {
  return (
    <div>
      <PhoneHeader title="Vehicle check" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.52rem] font-bold uppercase tracking-[0.14em] text-[#5d48b7]">
              Step 4 of 7
            </p>
            <p className="mt-1 text-base font-extrabold text-veyvio-deep">Tyres and wheels</p>
          </div>
          <span className="rounded-full bg-[#eee8fa] px-2.5 py-1 text-[0.52rem] font-bold text-[#5d48b7]">
            BX62 BCT
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e2e8ea]">
          <div className="h-full w-[57%] rounded-full bg-[#5d48b7]" />
        </div>
        <div className="mt-5 flex h-36 items-center justify-center rounded-2xl border border-dashed border-[#bfcfd3] bg-[#f5f8f8]">
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
              +
            </span>
            <p className="mt-2 text-[0.58rem] font-bold text-veyvio-deep">Add evidence photo</p>
            <p className="mt-0.5 text-[0.48rem] text-veyvio-muted">Camera-first · saved with this check</p>
          </div>
        </div>
        <p className="mt-4 text-[0.58rem] font-semibold leading-5 text-veyvio-deep">
          Check tyre condition, visible damage and wheel security.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Pass", "bg-[#e8f4d7] text-veyvio-deep"],
            ["Advisory", "bg-[#fff0dc] text-[#9b5c12]"],
            ["Fail", "bg-[#fde7e3] text-[#a13f32]"],
          ].map(([label, classes]) => (
            <button key={label} className={`rounded-xl px-2 py-3 text-[0.58rem] font-black ${classes}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SyncScreen() {
  return (
    <div className="min-h-[30rem] bg-veyvio-deep text-white">
      <PhoneHeader title="Sync centre" synced={false} />
      <div className="p-4">
        <div className="rounded-2xl bg-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.52rem] font-bold uppercase tracking-[0.15em] text-[#9fd9e5]">
                Weak signal
              </p>
              <p className="mt-2 text-lg font-extrabold">Your work is saved</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-full bg-[#2498b1] text-base font-black">
              ↕
            </span>
          </div>
          <p className="mt-3 text-[0.62rem] leading-5 text-white/65">
            Assigned duty details remain available. Updates will send when a connection returns.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["2", "Pending"],
            ["0", "Failed"],
            ["08:57", "Last sync"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-sm font-extrabold">{value}</p>
              <p className="mt-1 text-[0.46rem] uppercase tracking-[0.1em] text-white/50">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[
            ["Stop status", "Greenbank Centre · Arrived", "Queued"],
            ["Vehicle check", "Photo evidence · Tyres", "Queued"],
            ["Duty acknowledgement", "CT-104 · North Loop", "Synced"],
          ].map(([title, detail, state]) => (
            <div key={title} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-veyvio-deep">
              <div>
                <p className="text-[0.62rem] font-extrabold">{title}</p>
                <p className="mt-0.5 text-[0.48rem] text-veyvio-muted">{detail}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[0.48rem] font-bold ${
                  state === "Synced" ? "bg-[#e8f4d7]" : "bg-[#e9f5f8] text-[#17697b]"
                }`}
              >
                {state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HandbackScreen() {
  const rows = [
    ["End mileage", "48,219 mi", "Done"],
    ["Fuel / charge", "72%", "Done"],
    ["Condition", "No new damage", "Done"],
    ["Keys", "Returned to desk", "Done"],
    ["Parking", "Depot A · Bay 04", "Review"],
  ];
  return (
    <div>
      <PhoneHeader title="End your duty" />
      <div className="p-4">
        <div className="rounded-2xl bg-[#f6edea] p-4">
          <p className="text-[0.52rem] font-bold uppercase tracking-[0.14em] text-[#b7584b]">
            Handback
          </p>
          <p className="mt-1 text-base font-extrabold text-veyvio-deep">5 of 6 steps complete</p>
          <p className="mt-2 text-[0.56rem] leading-5 text-veyvio-muted">
            Progress is autosaved on this device until submission is acknowledged.
          </p>
        </div>
        <div className="mt-3 space-y-1.5">
          {rows.map(([label, value, state]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f8f8] px-3 py-2.5">
              <div>
                <p className="text-[0.5rem] font-semibold text-veyvio-muted">{label}</p>
                <p className="mt-0.5 text-[0.62rem] font-extrabold text-veyvio-deep">{value}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[0.46rem] font-bold ${
                  state === "Done" ? "bg-[#e8f4d7]" : "bg-[#fff0dc] text-[#9b5c12]"
                }`}
              >
                {state}
              </span>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full rounded-xl bg-[#ef6b5c] px-4 py-3 text-xs font-black text-white">
          Review and submit handback
        </button>
      </div>
    </div>
  );
}

function DriverPhone({
  screen,
  className = "",
}: {
  screen: DriverScreen;
  className?: string;
}) {
  return (
    <div
      className={`relative w-[17rem] rounded-[2.55rem] border-[7px] border-[#102f38] bg-white p-1.5 shadow-[0_35px_85px_rgba(23,62,72,0.28)] ${className}`}
    >
      <span className="absolute left-1/2 top-2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-[#102f38]" />
      <div className="min-h-[30rem] overflow-hidden rounded-[2rem] bg-[#f7f9f9]">
        {screen === "home" ? <HomeScreen /> : null}
        {screen === "trip" ? <TripScreen /> : null}
        {screen === "check" ? <CheckScreen /> : null}
        {screen === "sync" ? <SyncScreen /> : null}
        {screen === "handback" ? <HandbackScreen /> : null}
      </div>
      <span className="mx-auto mt-1.5 block h-1 w-20 rounded-full bg-[#cad6d8]" />
    </div>
  );
}

function Questions() {
  return (
    <section className="border-t border-veyvio-border bg-white py-20 sm:py-28">
      <div className="section-container grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
            Driver questions
          </p>
          <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
            Useful answers before a demonstration.
          </h2>
        </div>
        <div className="divide-y divide-veyvio-border border-y border-veyvio-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-marketing text-lg font-bold text-veyvio-deep">
                {faq.question}
                <span className="text-2xl font-light transition group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pb-2 pt-4 leading-7 text-veyvio-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DriverPage() {
  usePageMeta({
    title: "Veyvio Driver",
    description:
      "Guide drivers through duties, vehicle checks, trip progress, offline-tolerant updates and end-of-duty handback with Veyvio Driver.",
    path: "/platform/driver",
  });

  const [activeFeature, setActiveFeature] = useState<DriverScreen>("home");
  const active = driverFeatures.find((feature) => feature.key === activeFeature) ?? driverFeatures[0];
  const benefitReveal = useRevealOnScroll<HTMLDivElement>();
  const explorerReveal = useRevealOnScroll<HTMLDivElement>();
  const dutyReveal = useRevealOnScroll<HTMLDivElement>();

  return (
    <>
      <section className="relative min-h-[calc(100svh-5rem)] overflow-hidden bg-white">
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#eef6f4] to-transparent" />
        <div className="absolute left-[-7rem] top-36 size-64 rounded-full bg-[#dff1c8] blur-3xl" />
        <div className="absolute right-[-5rem] top-24 size-72 rounded-full bg-[#d9eef2] blur-3xl" />
        <div className="section-container relative grid min-h-[calc(100svh-5rem)] gap-10 py-16 min-[880px]:grid-cols-[0.88fr_1.12fr] min-[880px]:items-center min-[880px]:py-10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-veyvio-border bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-veyvio-teal shadow-sm backdrop-blur">
              <span className="size-2 rounded-full bg-veyvio-lime" />
              Veyvio Driver · Pilot
            </div>
            <h1 className="page-hero-title text-veyvio-deep">
              Every duty.
              <br />
              <span className="text-veyvio-lime">One clear</span>
              <br />
              next action.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-veyvio-muted">
              Give drivers and escorts a guided mobile workflow for checks, trips, communication,
              exceptions and end-of-duty handback—even when the signal is unreliable.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="btn-primary"
                onClick={() =>
                  trackCta("demo_cta_selected", "Book a Driver demo", {
                    ctaPosition: "driver-hero",
                  })
                }
              >
                Book a Driver demo
              </Link>
              <a href="#capabilities" className="btn-secondary">
                Explore the workflow
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-veyvio-deep">
              {["Android & iOS shell", "Offline-tolerant", "Role-scoped access"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#e8f4d7] text-[0.65rem]">
                    ✓
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto min-h-[38rem] w-full max-w-[39rem] min-[880px]:scale-[0.82] lg:min-h-[43rem] lg:scale-100">
            <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#cae0e3] bg-white/65 shadow-[0_50px_100px_rgba(23,62,72,0.1)]" />
            <DriverPhone
              screen="trip"
              className="absolute left-[4%] top-[10%] scale-[0.78] -rotate-6 opacity-75 sm:left-[10%]"
            />
            <DriverPhone
              screen="home"
              className="absolute right-[3%] top-[2%] z-10 rotate-3 sm:right-[9%]"
            />
            <div className="absolute left-0 top-[16%] z-20 rounded-2xl border border-veyvio-border bg-white p-3.5 shadow-xl sm:left-[2%]">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-veyvio-teal">
                Next duty
              </p>
              <p className="mt-1 text-sm font-extrabold text-veyvio-deep">CT-104 · 32 min</p>
            </div>
            <div className="absolute bottom-[15%] right-0 z-20 rounded-2xl bg-veyvio-deep p-3.5 text-white shadow-xl">
              <p className="text-[0.55rem] uppercase tracking-[0.14em] text-white/55">Sync state</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-extrabold">
                <span className="size-2 rounded-full bg-veyvio-lime" />
                All work saved
              </p>
            </div>
          </div>
        </div>
      </section>

      <section ref={benefitReveal.ref} className="bg-veyvio-deep py-20 text-white sm:py-24">
        <div className="section-container">
          <div
            className={`grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end ${
              benefitReveal.visible ? "reveal is-visible" : "reveal"
            }`}
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9fd9e5]">
                Mobile-first frontline workflow
              </p>
              <h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">
                Help drivers focus on safe delivery.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-white/65 lg:justify-self-end">
              The app reduces back-and-forth by making the current duty, readiness gate and next
              recorded action clear to the person doing the work.
            </p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[1.6rem] bg-white/15 md:grid-cols-4">
            {benefits.map((benefit, index) => (
              <article
                key={benefit.number}
                className={`group min-h-80 bg-veyvio-deep p-6 transition duration-300 hover:bg-white hover:text-veyvio-deep ${
                  benefitReveal.visible ? "reveal is-visible" : "reveal"
                }`}
                style={{ transitionDelay: `${index * 70}ms` }}
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-full ${benefit.colour} text-sm font-black ${
                    index === 1 || index === 2 || index === 3 ? "text-white" : "text-veyvio-deep"
                  }`}
                >
                  {benefit.number}
                </span>
                <div className="mt-24">
                  <h3 className="font-marketing text-2xl font-bold">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60 group-hover:text-veyvio-muted">
                    {benefit.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="capabilities"
        ref={explorerReveal.ref}
        className="scroll-mt-24 bg-veyvio-surface py-20 sm:py-28"
      >
        <div className="section-container">
          <div
            className={`grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end ${
              explorerReveal.visible ? "reveal is-visible" : "reveal"
            }`}
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
                Explore the Driver app
              </p>
              <h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-5xl">
                One guided journey through the working day.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Select a stage to see how the interface turns operational rules into calm, direct
              driver actions.
            </p>
          </div>

          <div className="mt-10 flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="Driver capabilities">
            {driverFeatures.map((feature) => (
              <button
                key={feature.key}
                type="button"
                role="tab"
                aria-selected={feature.key === activeFeature}
                onClick={() => setActiveFeature(feature.key)}
                className={`min-w-max rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                  feature.key === activeFeature
                    ? "border-veyvio-deep bg-veyvio-deep text-white shadow-lg"
                    : "border-veyvio-border bg-white text-veyvio-deep hover:border-veyvio-teal"
                }`}
              >
                <span className="mr-2 text-[0.62rem] opacity-60">{feature.number}</span>
                {feature.label}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-[2rem] border border-veyvio-border bg-white shadow-[0_25px_70px_rgba(23,62,72,0.1)]">
            <div className="grid min-[880px]:grid-cols-[0.9fr_1.1fr]">
              <div className="flex min-h-[37rem] flex-col justify-center p-7 sm:p-12">
                <p
                  className="text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: active.accent }}
                >
                  {active.eyebrow}
                </p>
                <h3 className="mt-4 max-w-xl font-marketing text-3xl font-extrabold tracking-[-0.035em] text-veyvio-deep sm:text-5xl">
                  {active.title}
                </h3>
                <p className="mt-5 max-w-lg text-lg leading-8 text-veyvio-muted">{active.copy}</p>
                <ul className="mt-8 space-y-4">
                  {active.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 font-semibold text-veyvio-deep">
                      <Tick />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link to="/demo" className="btn-primary">
                    See Driver in a demo
                  </Link>
                  <Link to="/platform" className="btn-secondary">
                    View the platform
                  </Link>
                </div>
              </div>
              <div
                className="relative flex min-h-[42rem] items-center justify-center overflow-hidden px-6 py-14"
                style={{
                  background: `radial-gradient(circle at 50% 45%, white 0%, ${active.accent}18 44%, ${active.accent}0d 100%)`,
                }}
              >
                <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#b7cdd2_1px,transparent_1px)] [background-size:15px_15px]" />
                <span
                  className="absolute left-[12%] top-[14%] h-36 w-20 rounded-full blur-3xl"
                  style={{ backgroundColor: `${active.accent}55` }}
                />
                <DriverPhone key={active.key} screen={active.key} className="relative z-10 animate-[fadeIn_.35s_ease-out]" />
                <div className="absolute bottom-8 right-8 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-xl backdrop-blur">
                  <p className="text-[0.52rem] font-bold uppercase tracking-[0.14em] text-veyvio-teal">
                    Current stage
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-veyvio-deep">
                    {active.number} · {active.label}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-2" style={{ backgroundColor: active.accent }} />
          </div>
        </div>
      </section>

      <section ref={dutyReveal.ref} className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-teal">
              One controlled duty
            </p>
            <h2 className="mt-3 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-6xl">
              From assignment to a complete operational record.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              Driver keeps each frontline action connected to the duty Command planned and the
              vehicle Yard prepared.
            </p>
          </div>
          <div className="mt-14 grid gap-3 md:grid-cols-5">
            {dutySteps.map(([number, title, copy], index) => (
              <article
                key={number}
                className={`group relative min-h-80 overflow-hidden rounded-[1.4rem] border border-veyvio-border bg-white p-5 transition duration-300 hover:-translate-y-2 hover:border-veyvio-teal hover:shadow-[0_24px_55px_rgba(23,62,72,0.13)] ${
                  dutyReveal.visible ? "reveal is-visible" : "reveal"
                }`}
                style={{ transitionDelay: `${index * 70}ms` }}
              >
                <span className="font-marketing text-5xl font-extrabold tracking-[-0.07em] text-[#dbe7e9] transition group-hover:text-[#a5d2db]">
                  {number}
                </span>
                <div className="mt-24">
                  <h3 className="font-marketing text-2xl font-bold text-veyvio-deep">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-veyvio-muted">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-veyvio-deep py-20 text-white sm:py-28">
        <div className="section-container grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9fd9e5]">
              Weak signal is an operating condition
            </p>
            <h2 className="mt-3 max-w-3xl font-marketing text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">
              Offline work should remain visible—not become a mystery.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
              Veyvio’s offline model keeps the signed-in driver’s selected operational context
              bounded to their assigned work, with pending, failed and acknowledged states made
              explicit.
            </p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {[
                ["Cached with purpose", "Only the assigned duties, records and essential messages needed for the work."],
                ["Queued with identity", "Offline updates retain device, timestamp and idempotency context."],
                ["Resolved by the server", "Unsafe conflicts become a clear resolution task instead of a silent overwrite."],
                ["Protected on device", "Encrypted storage, inactivity controls and revocation support the mobile boundary."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/15 bg-white/[0.06] p-5">
                  <p className="font-marketing text-lg font-bold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex min-h-[42rem] items-center justify-center">
            <div className="absolute size-[31rem] rounded-full border border-white/10 bg-[#2498b1]/10" />
            <DriverPhone screen="sync" className="relative z-10" />
            <div className="absolute left-0 top-[18%] z-20 rounded-2xl bg-white p-3.5 text-veyvio-deep shadow-2xl">
              <p className="text-[0.52rem] uppercase tracking-[0.14em] text-veyvio-muted">Connection</p>
              <p className="mt-1 text-sm font-extrabold">Weak · work cached</p>
            </div>
            <div className="absolute bottom-[16%] right-0 z-20 rounded-2xl bg-veyvio-lime p-3.5 text-veyvio-deep shadow-2xl">
              <p className="text-[0.52rem] uppercase tracking-[0.14em] opacity-65">On reconnect</p>
              <p className="mt-1 text-sm font-extrabold">2 updates acknowledged</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-veyvio-surface py-20 sm:py-28">
        <div className="section-container">
          <div className="grid gap-10 lg:grid-cols-2">
            <article className="group min-h-[31rem] overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_20px_55px_rgba(23,62,72,0.08)] transition hover:-translate-y-1 sm:p-10">
              <div className="flex items-start justify-between gap-6">
                <span className="rounded-full bg-[#e8f4d7] px-3 py-1 text-xs font-bold text-veyvio-deep">
                  For drivers and escorts
                </span>
                <span className="font-marketing text-6xl font-extrabold tracking-[-0.08em] text-[#e4ecee]">01</span>
              </div>
              <h2 className="mt-16 font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep">
                Less ambiguity at the frontline.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-veyvio-muted">
                See the assigned work, current readiness state and one clear next action without
                having to reconstruct the duty through calls and paper.
              </p>
              <ul className="mt-7 space-y-3">
                {["Guided duty progress", "Large operational actions", "Visible save and sync state"].map((item) => (
                  <li key={item} className="flex items-center gap-3 font-semibold text-veyvio-deep">
                    <Tick /> {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="group min-h-[31rem] overflow-hidden rounded-[2rem] bg-veyvio-deep p-8 text-white shadow-[0_20px_55px_rgba(23,62,72,0.14)] transition hover:-translate-y-1 sm:p-10">
              <div className="flex items-start justify-between gap-6">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#9fd9e5]">
                  For controllers and managers
                </span>
                <span className="font-marketing text-6xl font-extrabold tracking-[-0.08em] text-white/10">02</span>
              </div>
              <h2 className="mt-16 font-marketing text-4xl font-extrabold tracking-[-0.04em]">
                Frontline progress with context.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/65">
                Receive acknowledged updates, checks, progress and handback evidence against the
                same operational record—within the authorised company and role boundary.
              </p>
              <ul className="mt-7 space-y-3">
                {["Fewer status-chasing calls", "Exception-led follow-up", "Attributable operational history"].map((item) => (
                  <li key={item} className="flex items-center gap-3 font-semibold">
                    <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-xs">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
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
              Driver does not work in isolation.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              Command plans and monitors the duty. Yard contributes vehicle readiness. Driver
              records frontline progress and returns the completed operational story.
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

      <section className="bg-veyvio-lime py-20 sm:py-24">
        <div className="section-container grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-veyvio-deep/65">
              A focused next step
            </p>
            <h2 className="mt-3 max-w-4xl font-marketing text-4xl font-extrabold tracking-[-0.04em] text-veyvio-deep sm:text-6xl">
              Walk through a real duty with Veyvio Driver.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-veyvio-deep/70">
              Bring your current sign-on, vehicle-check, trip-progress and handback process. The
              demonstration can follow the reality of your service.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/demo"
              className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-full bg-veyvio-deep px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#0e3038]"
              onClick={() =>
                trackCta("demo_cta_selected", "Book a Driver demo", {
                  ctaPosition: "driver-footer",
                })
              }
            >
              Book a Driver demo
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-11 min-w-[9rem] items-center justify-center rounded-full border border-veyvio-deep/30 px-6 py-2.5 text-sm font-semibold text-veyvio-deep transition hover:border-veyvio-deep hover:bg-white"
            >
              Talk to the team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
