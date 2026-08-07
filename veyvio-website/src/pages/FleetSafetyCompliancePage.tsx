import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";

type GateKey = "driver" | "vehicle" | "defect" | "override" | "evidence";

type Gate = {
  key: GateKey;
  number: string;
  label: string;
  owner: string;
  result: string;
  resultTone: "pass" | "block" | "review";
  title: string;
  copy: string;
  checks: Array<[string, string, "pass" | "block" | "review"]>;
};

const gates: Gate[] = [
  {
    key: "driver",
    number: "01",
    label: "Driver eligibility",
    owner: "Command + Driver",
    result: "Eligible",
    resultTone: "pass",
    title: "Check the person against the work they are about to accept.",
    copy:
      "Licence, employment, training, declarations, duty time and required equipment can form one explainable assignment decision.",
    checks: [
      ["Identity & employment", "Current record", "pass"],
      ["Licence & category", "Category D · valid", "pass"],
      ["Required training", "All modules current", "pass"],
      ["Duty-time rule", "Within configured limit", "pass"],
    ],
  },
  {
    key: "vehicle",
    number: "02",
    label: "Vehicle readiness",
    owner: "Yard",
    result: "Blocked",
    resultTone: "block",
    title: "Release the vehicle only when its current condition supports it.",
    copy:
      "Location, keys, fuel or charge, cleanliness, equipment, checks, body condition and VOR state combine into a readiness result.",
    checks: [
      ["Location & custody", "Bay 04 · Yard custody", "pass"],
      ["Return inspection", "Completed 06:42", "pass"],
      ["Required equipment", "First-aid seal verified", "pass"],
      ["Open defect", "Brake warning · critical", "block"],
    ],
  },
  {
    key: "defect",
    number: "03",
    label: "Defects & VOR",
    owner: "Driver + Yard",
    result: "VOR hold",
    resultTone: "block",
    title: "Turn a frontline report into owned physical work.",
    copy:
      "A failed check can create a linked Yard task, preserve evidence and block operational release until the vehicle is inspected and supported for return.",
    checks: [
      ["Driver report", "DEF-0198 · 05:58", "pass"],
      ["Severity", "Safety-critical", "block"],
      ["Yard task", "YT-1842 · assigned", "review"],
      ["Return-to-road", "Verification outstanding", "block"],
    ],
  },
  {
    key: "override",
    number: "04",
    label: "Controlled override",
    owner: "Authorised role",
    result: "Approval needed",
    resultTone: "review",
    title: "Make exceptions explicit, permissioned and attributable.",
    copy:
      "Where policy allows an exception, Veyvio can require the right permission, a reason, supporting context and an audit event instead of silently changing the result.",
    checks: [
      ["Permission", "Operations manager", "pass"],
      ["Reason code", "Required", "review"],
      ["Supporting note", "Required", "review"],
      ["Audit event", "Recorded on decision", "pass"],
    ],
  },
  {
    key: "evidence",
    number: "05",
    label: "Evidence & audit",
    owner: "Shared record",
    result: "Attributable",
    resultTone: "pass",
    title: "Keep the rule, source and action attached to the outcome.",
    copy:
      "Material decisions can retain who acted, when, from which application, against which record and with what reason or evidence.",
    checks: [
      ["Actor", "Dana Lewis · Yard", "pass"],
      ["Source", "Veyvio Yard", "pass"],
      ["Evidence", "CHK-8831 · 4 photos", "pass"],
      ["Decision history", "Linked to BX62 BCT", "pass"],
    ],
  },
];

const principles = [
  ["01", "Check at the decision", "Evaluate eligibility and readiness when work is assigned or released."],
  ["02", "Block with reasons", "Show the exact failed rule and the action needed to resolve it."],
  ["03", "Give it an owner", "Route physical vehicle work to Yard and operational exceptions to Command."],
  ["04", "Retain the evidence", "Keep actors, timestamps, reasons and source records attached."],
];

const faqs = [
  {
    question: "Does Veyvio guarantee legal compliance?",
    answer:
      "No. Veyvio helps organisations configure, operate and evidence their own safety and compliance processes. It does not provide legal advice or guarantee compliance with any law, regulation or operator obligation.",
  },
  {
    question: "What happens when a safety gate fails?",
    answer:
      "The action can be blocked with a visible reason. The failed check remains connected to the driver, vehicle, duty or assignment, and the relevant team can receive the work needed to resolve it.",
  },
  {
    question: "Can an authorised user override a result?",
    answer:
      "Only where the organisation's configured policy permits it. An override can require a specific permission, reason, supporting note and audit event; critical rules can remain non-overridable.",
  },
  {
    question: "How do Driver, Yard and Command share responsibility?",
    answer:
      "Driver captures frontline checks and defects. Yard owns physical inspection, vehicle location, VOR and supported return-to-road work. Command uses the resulting eligibility and readiness states when assigning and releasing operations.",
  },
  {
    question: "Is every capability shown generally available?",
    answer:
      "Veyvio Command, Driver and Yard are currently presented as pilot products. Exact rules, evidence, integrations and acceptance criteria are agreed for each controlled pilot.",
  },
];

function StatusMark({ tone }: { tone: "pass" | "block" | "review" }) {
  const style =
    tone === "pass"
      ? "bg-[#b8f05d] text-[#132f36]"
      : tone === "block"
        ? "bg-[#ff6b5c] text-white"
        : "bg-[#ffc04a] text-[#302000]";
  return (
    <span aria-hidden="true" className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-black ${style}`}>
      {tone === "pass" ? "✓" : tone === "block" ? "!" : "·"}
    </span>
  );
}

function DecisionRoom() {
  return (
    <div className="relative mx-auto w-full max-w-[38rem]">
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(184,240,93,.2),rgba(36,152,177,.08)_44%,transparent_70%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#102e36] shadow-[0_40px_100px_rgba(0,0,0,.38)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-[#b8f05d]" />
            <span className="text-sm font-black text-white">veyvio</span>
          </div>
          <span className="rounded-full bg-white/8 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[.16em] text-white/65">
            Release decision
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Assignment", "RUN-24017"],
              ["Driver", "J. Patel"],
              ["Vehicle", "BX62 BCT"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-3">
                <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-white/35">{label}</p>
                <p className="mt-1 text-xs font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#ff6b5c]/35 bg-[#ff6b5c]/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[.18em] text-[#ff9b91]">Action blocked</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-.03em] text-white">Vehicle cannot be released.</h2>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ff6b5c] text-xl font-black text-white">!</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/65">
              One safety-critical vehicle rule failed. The assignment remains intact while the physical issue is resolved.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            {[
              ["Driver eligibility", "All configured rules passed", "pass" as const],
              ["Vehicle readiness", "Open safety-critical defect", "block" as const],
              ["Yard ownership", "Task YT-1842 assigned", "review" as const],
              ["Override", "Not permitted for this rule", "block" as const],
            ].map(([label, detail, tone], index) => (
              <div key={label} className={`flex items-center justify-between gap-4 bg-white/[.035] px-4 py-3 ${index ? "border-t border-white/10" : ""}`}>
                <div>
                  <p className="text-xs font-bold text-white">{label}</p>
                  <p className="mt-0.5 text-[0.62rem] text-white/45">{detail}</p>
                </div>
                <StatusMark tone={tone as "pass" | "block" | "review"} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-[#b8f05d] px-4 py-3 text-[#132f36]">
            <div>
              <p className="text-[0.54rem] font-black uppercase tracking-[.16em] opacity-60">Next safe action</p>
              <p className="mt-0.5 text-sm font-black">Inspect defect in Veyvio Yard</p>
            </div>
            <span className="text-xl font-black" aria-hidden="true">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GatePanel({ gate }: { gate: Gate }) {
  const badge =
    gate.resultTone === "pass"
      ? "bg-[#eaf8d3] text-[#345713]"
      : gate.resultTone === "block"
        ? "bg-[#ffe5e1] text-[#9c3028]"
        : "bg-[#fff0cf] text-[#7a4c00]";

  return (
    <div className="grid overflow-hidden rounded-[1.8rem] border border-[#d8e3e5] bg-white shadow-[0_28px_80px_rgba(15,48,57,.1)] lg:grid-cols-[.78fr_1.22fr]">
      <div className="flex min-h-[34rem] flex-col justify-between bg-[#132f36] p-7 text-white sm:p-10">
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-black uppercase tracking-[.2em] text-[#b8f05d]">{gate.owner}</span>
            <span className="text-sm font-black text-white/35">{gate.number}</span>
          </div>
          <h3 className="mt-10 font-marketing text-4xl font-extrabold leading-[.98] tracking-[-.045em] sm:text-5xl">{gate.title}</h3>
          <p className="mt-6 text-base leading-7 text-white/62">{gate.copy}</p>
        </div>
        <Link
          to="/demo"
          className="mt-8 inline-flex w-fit rounded-full bg-[#b8f05d] px-6 py-3 text-sm font-black text-[#132f36] transition hover:-translate-y-0.5 hover:bg-white"
          onClick={() =>
            trackCta("demo_cta_selected", "Discuss our safety rules", {
              page: "/solutions/fleet-safety-compliance",
              ctaPosition: `safety-gate-${gate.key}`,
            })
          }
        >
          Discuss our safety rules
        </Link>
      </div>

      <div className="relative overflow-hidden bg-[#f3f7f6] p-5 sm:p-9">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-[#b8f05d]/20 blur-3xl" />
        <div className="relative mx-auto max-w-[38rem] overflow-hidden rounded-[1.45rem] border border-[#d7e2e4] bg-white shadow-[0_22px_60px_rgba(15,48,57,.13)]">
          <div className="flex items-center justify-between border-b border-[#dfe8e9] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#b8f05d]" />
              <span className="text-sm font-black text-[#132f36]">Decision trace</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-[0.62rem] font-black ${badge}`}>{gate.result}</span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Record", gate.key === "driver" ? "J. Patel" : gate.key === "vehicle" || gate.key === "defect" ? "BX62 BCT" : "RUN-24017"],
                ["Evaluated", "Today · 06:48"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f3f7f6] p-3">
                  <p className="text-[0.52rem] font-black uppercase tracking-[.15em] text-[#6d7d82]">{label}</p>
                  <p className="mt-1 text-xs font-black text-[#132f36]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe8e9]">
              {gate.checks.map(([label, value, tone], index) => (
                <div key={label} className={`flex items-center justify-between gap-3 px-3 py-3.5 ${index ? "border-t border-[#dfe8e9]" : ""}`}>
                  <div>
                    <p className="text-xs font-bold text-[#132f36]">{label}</p>
                    <p className="mt-0.5 text-[0.65rem] text-[#718087]">{value}</p>
                  </div>
                  <StatusMark tone={tone} />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-[#132f36] p-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.54rem] font-black uppercase tracking-[.16em] text-white/45">Explainable outcome</p>
                  <p className="mt-1 text-sm font-bold">Rule, source and next action remain attached.</p>
                </div>
                <span className="text-xl font-black text-[#b8f05d]" aria-hidden="true">↗</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseFile() {
  const steps = [
    ["01", "Driver reports", "Brake warning captured during the pre-use check.", "Driver", "#6f56c7"],
    ["02", "Gate blocks", "Vehicle readiness fails for BX62 BCT.", "Command", "#ff6b5c"],
    ["03", "Yard owns", "YT-1842 created with check evidence and operational impact.", "Yard", "#28a0b7"],
    ["04", "VOR retained", "Vehicle remains unavailable while inspection and work are open.", "Yard", "#e7a331"],
    ["05", "Return verified", "Authorised evidence supports a new readiness decision.", "Shared", "#b8f05d"],
  ];

  return (
    <div className="mt-12 grid gap-3 lg:grid-cols-5">
      {steps.map(([number, title, copy, owner, colour], index) => (
        <article
          key={number}
          className="group relative min-h-[17rem] overflow-hidden rounded-[1.4rem] border border-white/12 bg-white/[.045] p-5 transition duration-300 hover:-translate-y-2 hover:bg-white/[.075]"
        >
          <div className="absolute inset-x-0 bottom-0 h-1 transition-all duration-300 group-hover:h-2" style={{ backgroundColor: colour }} />
          <div className="flex items-center justify-between">
            <span className="text-sm font-black" style={{ color: colour }}>{number}</span>
            <span className="rounded-full border border-white/12 px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-[.14em] text-white/45">{owner}</span>
          </div>
          <h3 className="mt-12 text-xl font-black tracking-[-.025em] text-white">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/55">{copy}</p>
          {index < steps.length - 1 && (
            <span className="absolute bottom-4 right-4 text-xl font-black text-white/18 transition group-hover:text-white/55" aria-hidden="true">→</span>
          )}
        </article>
      ))}
    </div>
  );
}

export function FleetSafetyCompliancePage() {
  const [activeKey, setActiveKey] = useState<GateKey>("vehicle");
  const activeGate = gates.find((gate) => gate.key === activeKey) ?? gates[1];
  const principlesReveal = useRevealOnScroll<HTMLDivElement>();
  const gateReveal = useRevealOnScroll<HTMLDivElement>();
  const rolesReveal = useRevealOnScroll<HTMLDivElement>();

  usePageMeta({
    title: "Fleet safety and compliance workflows | Veyvio",
    description:
      "Connect driver eligibility, vehicle readiness, safety-critical defects, VOR, controlled overrides and attributable evidence with Veyvio.",
    path: "/solutions/fleet-safety-compliance",
  });

  return (
    <>
      <section className="relative min-h-[calc(100svh-4.25rem)] overflow-hidden bg-[#0b242b] text-white">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="absolute -left-32 top-1/4 size-[32rem] rounded-full bg-[#28a0b7]/12 blur-3xl" />
        <div className="absolute -right-40 bottom-0 size-[36rem] rounded-full bg-[#b8f05d]/10 blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4.25rem)] max-w-[92rem] items-center gap-14 px-6 py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-[0.68rem] font-black uppercase tracking-[.2em] text-white/65">
              <span className="size-2 rounded-full bg-[#b8f05d]" />
              Solution · Fleet safety & compliance
            </p>
            <h1 className="page-hero-title mt-8 max-w-[10ch]">
              Make the unsafe action harder to take.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/62 sm:text-xl">
              Put eligibility, vehicle readiness, evidence and controlled exceptions inside the
              operational decision—not in a folder beside it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#safety-gates" className="rounded-full bg-[#b8f05d] px-7 py-3.5 text-sm font-black text-[#132f36] shadow-[0_12px_32px_rgba(184,240,93,.2)] transition hover:-translate-y-0.5 hover:bg-white">
                Review the safety workflow
              </a>
              <Link
                to="/demo"
                className="text-sm font-bold text-white underline decoration-[#28a0b7] decoration-2 underline-offset-4"
                onClick={() =>
                  trackCta("demo_cta_selected", "Talk through your rules", {
                    page: "/solutions/fleet-safety-compliance",
                    ctaPosition: "safety-hero",
                  })
                }
              >
                Talk through your rules
              </Link>
            </div>
          </div>
          <DecisionRoom />
        </div>
      </section>

      <section className="border-b border-[#dbe5e6] bg-white">
        <div ref={principlesReveal.ref} className="mx-auto grid max-w-[92rem] px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {principles.map(([number, title, copy], index) => (
            <article
              key={number}
              className={`border-b border-[#dbe5e6] px-5 py-9 sm:border-r lg:border-b-0 ${principlesReveal.visible ? "reveal is-visible" : "reveal"}`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <span className="text-xs font-black text-[#28a0b7]">{number}</span>
              <h2 className="mt-3 text-lg font-black tracking-[-.02em] text-[#132f36]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#66777d]">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden bg-[#eff4f3] py-24 sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <p className="max-w-6xl font-marketing text-[clamp(3.2rem,7vw,7.5rem)] font-extrabold leading-[.89] tracking-[-.065em] text-[#132f36]">
            A reminder can be ignored.
            <span className="block text-[#28a0b7]">A governed gate must explain itself.</span>
          </p>
          <div className="mt-14 grid max-w-5xl gap-6 border-t border-[#cddbdc] pt-8 sm:grid-cols-3">
            <p className="text-lg leading-8 text-[#66777d]">Show which rule passed or failed.</p>
            <p className="text-lg leading-8 text-[#66777d]">Name the owner and the next safe action.</p>
            <p className="text-lg leading-8 text-[#66777d]">Keep override and decision history attributable.</p>
          </div>
        </div>
      </section>

      <section id="safety-gates" className="scroll-mt-24 bg-white py-24 sm:py-32">
        <div ref={gateReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#28a0b7]">Explore the decision gates</p>
              <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#132f36] sm:text-7xl">
                Safety becomes operational when it can stop the work.
              </h2>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#66777d]">
              Choose a gate to inspect its owner, inputs, outcome and evidence trace.
            </p>
          </div>

          <div role="tablist" aria-label="Safety and compliance decision gates" className="mt-12 flex gap-2 overflow-x-auto pb-2">
            {gates.map((gate) => {
              const active = gate.key === activeGate.key;
              return (
                <button
                  key={gate.key}
                  type="button"
                  role="tab"
                  id={`gate-tab-${gate.key}`}
                  aria-controls="safety-gate-panel"
                  aria-selected={active}
                  onClick={() => setActiveKey(gate.key)}
                  className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black transition ${
                    active
                      ? "border-[#132f36] bg-[#132f36] text-white shadow-lg"
                      : "border-[#d6e1e2] bg-white text-[#132f36] hover:border-[#28a0b7]"
                  }`}
                >
                  <span className="mr-2 text-[0.65rem] opacity-55">{gate.number}</span>
                  {gate.label}
                </button>
              );
            })}
          </div>

          <div
            id="safety-gate-panel"
            role="tabpanel"
            aria-labelledby={`gate-tab-${activeGate.key}`}
            className={`mt-6 ${gateReveal.visible ? "reveal is-visible" : "reveal"}`}
          >
            <GatePanel gate={activeGate} />
          </div>
        </div>
      </section>

      <section className="bg-[#0b242b] py-24 text-white sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#b8f05d]">One linked case file</p>
              <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] sm:text-7xl">
                From driver report to supported return.
              </h2>
            </div>
            <p className="max-w-md text-lg leading-8 text-white/55">
              The defect, vehicle, operational impact, Yard work and release decision stay connected.
            </p>
          </div>
          <CaseFile />
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div ref={rolesReveal.ref} className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#28a0b7]">Clear application ownership</p>
              <h2 className="mt-4 font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#132f36] sm:text-7xl">
                One rule. Different work for every role.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#66777d]">
                Each application contributes to the same decision without pretending that planners,
                drivers and depot teams do the same job.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                ["Driver", "Capture at the frontline", "Complete required checks, acknowledge safety information and report defects with evidence.", "/platform/driver", "#6f56c7"],
                ["Yard", "Resolve the physical state", "Locate and inspect the vehicle, own VOR and return-to-road work, and publish supported readiness.", "/platform/yard", "#28a0b7"],
                ["Command", "Enforce the operational gate", "Use current eligibility and vehicle readiness when assigning and releasing duties; surface exceptions with reasons.", "/platform/command", "#b8f05d"],
              ].map(([role, title, copy, href, colour], index) => (
                <Link
                  key={role}
                  to={href}
                  className={`group grid gap-5 rounded-[1.4rem] border border-[#d9e3e5] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:grid-cols-[6rem_1fr_auto] sm:items-center ${rolesReveal.visible ? "reveal is-visible" : "reveal"}`}
                  style={{ transitionDelay: `${index * 90}ms` }}
                >
                  <div className="flex size-16 items-center justify-center rounded-2xl text-xl font-black text-[#132f36]" style={{ backgroundColor: colour }}>
                    {role.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.17em] text-[#66777d]">Veyvio {role}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-.03em] text-[#132f36]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#66777d]">{copy}</p>
                  </div>
                  <span className="text-2xl font-black text-[#28a0b7] transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9e3e5] bg-[#f3f7f6] py-24 sm:py-32">
        <div className="mx-auto max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[.2em] text-[#28a0b7]">Attributable evidence</p>
              <h2 className="mt-4 max-w-[10ch] font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#132f36] sm:text-7xl">
                The result is only useful if people can inspect why.
              </h2>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-[#d6e1e2] bg-white shadow-[0_24px_70px_rgba(15,48,57,.08)]">
              <div className="flex items-center justify-between border-b border-[#dfe8e9] px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.17em] text-[#28a0b7]">Evidence ledger</p>
                  <p className="mt-1 text-sm font-bold text-[#132f36]">BX62 BCT · release decision</p>
                </div>
                <span className="rounded-full bg-[#ffe5e1] px-3 py-1 text-[0.62rem] font-black text-[#9c3028]">Blocked</span>
              </div>
              {[
                ["06:42", "Yard check completed", "Dana Lewis · Yard", "CHK-8831"],
                ["06:44", "Critical defect confirmed", "Dana Lewis · Yard", "DEF-0198"],
                ["06:45", "Vehicle marked VOR", "Veyvio rules", "VOR-0412"],
                ["06:46", "Release gate evaluated", "Command", "RUN-24017"],
              ].map(([time, action, actor, record], index) => (
                <div key={record} className={`grid gap-2 px-5 py-4 sm:grid-cols-[4rem_1.2fr_1fr_auto] sm:items-center ${index ? "border-t border-[#e3eaeb]" : ""}`}>
                  <strong className="text-xs text-[#28a0b7]">{time}</strong>
                  <span className="text-sm font-bold text-[#132f36]">{action}</span>
                  <span className="text-xs text-[#66777d]">{actor}</span>
                  <span className="rounded-full bg-[#eef3f2] px-2.5 py-1 text-[0.6rem] font-black text-[#132f36]">{record}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[76rem] px-6">
          <p className="text-center text-sm font-black uppercase tracking-[.2em] text-[#28a0b7]">Important questions</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-center font-marketing text-5xl font-extrabold leading-[.95] tracking-[-.055em] text-[#132f36] sm:text-7xl">
            Safety claims should withstand inspection.
          </h2>
          <div className="mt-12 divide-y divide-[#d9e3e5] border-y border-[#d9e3e5]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-black text-[#132f36] sm:text-xl">
                  {faq.question}
                  <span className="text-2xl font-light text-[#28a0b7] transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-2 pt-4 text-base leading-7 text-[#66777d]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#b8f05d] py-20 sm:py-24">
        <div className="mx-auto flex max-w-[92rem] flex-col justify-between gap-10 px-6 lg:flex-row lg:items-end lg:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#132f36]/60">A controlled next step</p>
            <h2 className="mt-4 max-w-4xl font-marketing text-5xl font-extrabold leading-[.93] tracking-[-.055em] text-[#132f36] sm:text-7xl">
              Bring one real safety rule. We’ll map the decision around it.
            </h2>
          </div>
          <Link
            to="/demo"
            className="shrink-0 rounded-full bg-[#132f36] px-8 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#0b242b]"
            onClick={() =>
              trackCta("demo_cta_selected", "Map a safety rule", {
                page: "/solutions/fleet-safety-compliance",
                ctaPosition: "safety-final",
              })
            }
          >
            Map a safety rule
          </Link>
        </div>
      </section>

      <section className="bg-[#0b242b] py-7 text-white">
        <p className="mx-auto max-w-[92rem] px-6 text-xs leading-5 text-white/45 lg:px-10">
          Veyvio supports configured safety and compliance workflows. It does not provide legal advice
          or guarantee compliance with laws, regulations or operator responsibilities.
        </p>
      </section>
    </>
  );
}
