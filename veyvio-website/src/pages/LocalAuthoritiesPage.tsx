import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";
import { openDecisions } from "@/lib/open-decisions";

type AuthorityViewKey = "visibility" | "providers" | "safety" | "evidence";

type AuthorityView = {
  key: AuthorityViewKey;
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  stats: Array<[string, string]>;
  queue: Array<[string, string, "ready" | "review" | "active"]>;
};

const authorityViews: AuthorityView[] = [
  {
    key: "visibility",
    number: "01",
    label: "Visibility",
    eyebrow: "See the service picture",
    title: "Give authority teams a governed view of commissioned transport.",
    copy:
      "Bring contract, route, vehicle and daily service context together so council teams can see what is planned, what is changing and which exceptions still need an owner.",
    accent: "#2498b1",
    stats: [
      ["Contracts", "08"],
      ["Services live", "54"],
      ["Exceptions open", "03"],
      ["Reviews today", "07"],
    ],
    queue: [
      ["North cluster", "2 route changes awaiting review", "review"],
      ["SEND AM departures", "All assigned services published", "ready"],
      ["Vehicle swap", "Replacement approved by operations", "active"],
    ],
  },
  {
    key: "providers",
    number: "02",
    label: "Providers",
    eyebrow: "Accountability across operators",
    title: "Keep provider actions attributable without merging tenant data.",
    copy:
      "Authorities and operators can work from connected service outcomes while preserving company boundaries, role-based access and a clear owner for each operational change.",
    accent: "#6650bd",
    stats: [
      ["Providers", "12"],
      ["Depots", "18"],
      ["Changes held", "02"],
      ["Approvals", "05"],
    ],
    queue: [
      ["Provider onboarding", "New depot awaiting data import", "active"],
      ["Contract 14", "Mileage exception retained with reason", "ready"],
      ["Access review", "Commissioner visibility scoped by role", "review"],
    ],
  },
  {
    key: "safety",
    number: "03",
    label: "Safety",
    eyebrow: "Passenger safety depends on the vehicle too",
    title: "Connect vehicle readiness and frontline delivery to the authority record.",
    copy:
      "Yard and Driver matter because a commissioned service is not genuinely deliverable until the assigned vehicle, equipment and current release state support the work.",
    accent: "#7ab82e",
    stats: [
      ["Ready vehicles", "46"],
      ["VOR", "02"],
      ["Lift checks", "Current"],
      ["Duty blocks", "01"],
    ],
    queue: [
      ["BX24 VYV", "Accessible vehicle released for service", "ready"],
      ["WX21 FYV", "Defect blocks school transport duty", "review"],
      ["Morning readiness", "Driver check queued after yard release", "active"],
    ],
  },
  {
    key: "evidence",
    number: "04",
    label: "Evidence",
    eyebrow: "Review after delivery",
    title: "Retain evidence that supports formal review, not just live dispatch.",
    copy:
      "Planned, changed and actual states can stay connected to checks, incidents, approvals, overrides and retained outcomes so performance and safeguarding reviews do not start from scattered notes.",
    accent: "#ef6b5c",
    stats: [
      ["Services closed", "51"],
      ["Incidents", "01 resolved"],
      ["Overrides", "02 logged"],
      ["Audit pack", "Available"],
    ],
    queue: [
      ["Contract KPI review", "Completion and timing evidence retained", "ready"],
      ["Passenger incident", "Acknowledged and escalated with history", "active"],
      ["Monthly review", "Awaiting authorised export", "review"],
    ],
  },
];

const procurementCards = [
  {
    title: "Procurement-ready information",
    copy:
      "Support formal review with clear statements on hosting, privacy, accessibility, implementation approach and pricing basis.",
    accent: "#2498b1",
  },
  {
    title: "Provider accountability",
    copy:
      "Keep service decisions, exceptions, overrides and operational outcomes attributable to the person and organisation that made them.",
    accent: "#6650bd",
  },
  {
    title: "Safety and safeguarding support",
    copy:
      "Show how vehicle readiness, role-based visibility and controlled workflows support safer service delivery without claiming guaranteed compliance.",
    accent: "#7ab82e",
  },
] as const;

const governanceAreas = [
  {
    title: "Commissioner visibility",
    copy: "Review the service picture, provider performance and owned exceptions without exposing unrestricted operational data.",
    items: ["Service and contract context", "Exception and escalation visibility", "Review-ready outcome history"],
    accent: "#2498b1",
  },
  {
    title: "Operator control",
    copy: "Let provider operations teams plan, assign, communicate and resolve issues within their own governed tenant boundary.",
    items: ["Planning and live operations", "Driver and vehicle workflow ownership", "Attributable operational changes"],
    accent: "#6650bd",
  },
  {
    title: "Yard-backed readiness",
    copy: "Feed the physical vehicle state into the service record so authorities are not reviewing delivery in isolation from fleet readiness.",
    items: ["Checks, equipment and restrictions", "Defects, VOR and release state", "Evidence that supports the assignment"],
    accent: "#7ab82e",
  },
] as const;

const evidenceRows = [
  ["Service plan", "What was scheduled, published and assigned."],
  ["Vehicle support", "Which readiness state and equipment supported the duty."],
  ["Provider actions", "Who changed what, when and why."],
  ["Passenger events", "Which incidents, exceptions or safeguarding-relevant outcomes were retained."],
  ["Review pack", "What an authority or commissioner can retrieve for contract and performance review."],
] as const;

const faqs = [
  {
    question: "Is this page aimed at local-authority transport teams or software procurement teams?",
    answer:
      "Both. The page should help operational commissioners understand the service model and help procurement reviewers find trust, privacy, accessibility, implementation and pricing information quickly.",
  },
  {
    question: "Can authorities see provider operations without collapsing tenant boundaries?",
    answer:
      "That is the target model. Veyvio should support controlled commissioner visibility while preserving company isolation, role-based access and attributable actions. Exact authority views and approvals are part of implementation scoping.",
  },
  {
    question: "Why is Yard relevant to a local-authority page?",
    answer:
      "Because service assurance is not only about scheduling. Vehicle condition, accessibility equipment, restrictions, defects and release state all affect whether a commissioned service can actually be delivered safely and as planned.",
  },
  {
    question: "Does Veyvio guarantee compliance or safeguarding?",
    answer:
      "No. Veyvio can help organisations manage visibility, evidence, workflow controls and audit history, but authorities and operators remain responsible for legal, safeguarding, contractual and regulatory obligations.",
  },
  {
    question: "Is Veyvio already listed on G-Cloud or a public procurement framework?",
    answer:
      "This page should support procurement-style review, but it does not claim a live framework listing unless that has been formally published.",
  },
] as const;

function Check({ colour = "#7ab82e" }: { colour?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-black text-white"
      style={{ backgroundColor: colour }}
    >
      ✓
    </span>
  );
}

function Status({ state }: { state: "ready" | "review" | "active" }) {
  const tone =
    state === "ready"
      ? "bg-[#e8f5d6] text-[#466f1d]"
      : state === "active"
        ? "bg-[#e2f2f6] text-[#28677a]"
        : "bg-[#fff0dc] text-[#8d5b18]";
  return <span className={`rounded-full px-2.5 py-1 text-[0.54rem] font-black uppercase tracking-[.1em] ${tone}`}>{state}</span>;
}

function AuthorityPreview({ view }: { view: AuthorityView }) {
  return (
    <div className="relative min-h-[35rem] overflow-hidden rounded-[2rem] bg-[#edf4f4] p-5 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: view.accent }}
      />
      <div className="relative mx-auto max-w-[34rem] overflow-hidden rounded-[1.5rem] border border-[#d6e1e2] bg-white shadow-[0_30px_70px_rgba(23,62,72,.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#e0e8e9] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: view.accent }} />
            <span className="text-xs font-black text-veyvio-deep">veyvio</span>
          </div>
          <span className="rounded-full bg-[#f3f6f6] px-3 py-1 text-[0.55rem] font-black uppercase tracking-[.16em] text-veyvio-muted">
            Authority overview
          </span>
        </div>
        <div className="grid min-h-[26rem] grid-cols-[4rem_1fr]">
          <div className="bg-veyvio-deep p-3">
            <span className="mx-auto mt-1 block size-8 rounded-xl bg-white/10" />
            {[1, 2, 3, 4, 5].map((item) => (
              <span key={item} className="mx-auto mt-6 block h-1.5 w-7 rounded-full bg-white/20" />
            ))}
          </div>
          <div className="min-w-0 p-5 sm:p-7">
            <p className="text-[0.58rem] font-black uppercase tracking-[.16em]" style={{ color: view.accent }}>
              {view.label} view
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="font-marketing text-xl font-extrabold text-veyvio-deep">Commissioned service picture</h3>
              <span className="rounded-full bg-[#e8f5d6] px-3 py-1 text-[0.55rem] font-bold text-[#466f1d]">Current</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {view.stats.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#dce5e6] p-3">
                  <p className="text-[0.45rem] font-black uppercase tracking-[.1em] text-veyvio-muted">{label}</p>
                  <p className="mt-1 text-[0.7rem] font-extrabold text-veyvio-deep">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {view.queue.map(([title, detail, state]) => (
                <div key={title} className="rounded-xl border border-[#dfe7e8] bg-[#fbfcfc] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.7rem] font-extrabold text-veyvio-deep">{title}</p>
                      <p className="mt-1 text-[0.6rem] text-veyvio-muted">{detail}</p>
                    </div>
                    <Status state={state} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-[#c9d8da] p-3">
              <span className="size-2 rounded-full" style={{ backgroundColor: view.accent }} />
              <p className="text-[0.6rem] font-semibold text-veyvio-muted">
                Provider, commissioner and operational events remain attributable
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative -mt-5 ml-auto mr-4 max-w-[17rem] rounded-2xl bg-veyvio-deep p-4 text-white shadow-xl">
        <p className="text-[0.54rem] font-black uppercase tracking-[.16em] text-white/55">Review path</p>
        <p className="mt-1 text-sm font-extrabold">{view.label} stays linked to delivery evidence</p>
        <p className="mt-1 text-xs text-white/65">Command · Driver · Yard</p>
      </div>
    </div>
  );
}

export function LocalAuthoritiesPage() {
  const [activeView, setActiveView] = useState<AuthorityViewKey>("visibility");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const overviewReveal = useRevealOnScroll<HTMLElement>();
  const governanceReveal = useRevealOnScroll<HTMLElement>();
  const yardReveal = useRevealOnScroll<HTMLElement>();
  const trustReveal = useRevealOnScroll<HTMLElement>();
  const selectedView = authorityViews.find((view) => view.key === activeView) ?? authorityViews[0];

  usePageMeta({
    title: "Local Authorities",
    description:
      "Explore how Veyvio supports local-authority transport oversight with service visibility, provider accountability, vehicle readiness evidence and procurement-ready trust information.",
    path: "/industries/local-authorities",
  });

  return (
    <div className="overflow-hidden bg-[#fffdfa]">
      <section className="relative min-h-[calc(100svh-5rem)] bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div aria-hidden="true" className="absolute left-[-6rem] top-16 size-80 rounded-full bg-[#d8eef3] blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-8rem] right-[18%] size-96 rounded-full bg-[#e2f0cf] blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center gap-12 lg:grid-cols-[.88fr_1.12fr]">
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-veyvio-teal" />
              <p className="text-xs font-black uppercase tracking-[.24em] text-veyvio-teal">Local authorities</p>
            </div>
            <h1 className="page-hero-title max-w-[11ch] text-veyvio-deep">
              Clearer oversight for commissioned passenger transport.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-veyvio-muted sm:text-xl">
              Help authority teams review service visibility, provider accountability, passenger safety and retrievable evidence without losing the operational detail behind the decision.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="btn-primary"
                onClick={() =>
                  trackCta("contact_selected", "Discuss authority requirements", {
                    page: "/industries/local-authorities",
                    section: "hero",
                    ctaPosition: "primary",
                  })
                }
              >
                Discuss authority requirements
              </Link>
              <a href="#authority-overview" className="btn-secondary">
                Explore the authority view
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {["Service visibility", "Provider accountability", "Yard-backed readiness", "Procurement-ready trust"].map((item) => (
                <span key={item} className="rounded-full border border-[#d8e4e6] bg-white px-3 py-2 text-xs font-bold text-veyvio-deep">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.2rem] bg-veyvio-deep shadow-[0_35px_100px_rgba(23,62,72,.22)]">
              <img
                src="/images/sections/veyvio-connected-apps-v1.png"
                alt="Veyvio Command, Driver and Yard shown together as one connected operational platform."
                className="aspect-[1.08/1] w-full object-cover"
              />
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2 sm:inset-x-7 sm:bottom-7 sm:grid-cols-4">
                {[
                  ["12", "providers"],
                  ["54", "services live"],
                  ["03", "open exceptions"],
                  ["02", "VOR blocks"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-veyvio-deep/88 p-3 text-white backdrop-blur-md">
                    <span className="font-marketing text-sm font-extrabold sm:text-base">{value}</span>
                    <span className="mt-1 block text-[0.48rem] font-black uppercase tracking-[.1em] text-white/55">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-5 top-8 hidden rounded-2xl bg-white p-4 shadow-[0_20px_55px_rgba(23,62,72,.18)] sm:block">
              <p className="text-[0.54rem] font-black uppercase tracking-[.16em] text-veyvio-teal">Commissioner view</p>
              <p className="mt-1 text-sm font-extrabold text-veyvio-deep">Service picture → provider action → retained evidence</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#dde7e5] bg-[#f4f8f8] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">What authority teams need</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              Review transport delivery without guessing what happened underneath it.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {procurementCards.map((card) => (
              <article key={card.title} className="rounded-[1.5rem] bg-white p-6 shadow-[0_10px_35px_rgba(23,62,72,.06)]">
                <span className="block h-2 w-12 rounded-full" style={{ backgroundColor: card.accent }} />
                <h3 className="mt-6 font-marketing text-xl font-extrabold text-veyvio-deep">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-veyvio-muted">{card.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="authority-overview"
        ref={overviewReveal.ref}
        className={`reveal px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${overviewReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Four linked authority views</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                Keep the review path connected from live service to formal evidence.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Select a view to see how Veyvio can support commissioner visibility, provider accountability, Yard-backed readiness and evidence retention in one governed operating model.
            </p>
          </div>

          <div role="tablist" aria-label="Local authority review views" className="mt-10 flex gap-2 overflow-x-auto pb-2">
            {authorityViews.map((view) => {
              const active = activeView === view.key;
              return (
                <button
                  key={view.key}
                  type="button"
                  role="tab"
                  id={`authority-view-tab-${view.key}`}
                  aria-controls={`authority-view-panel-${view.key}`}
                  aria-selected={active}
                  className={`flex shrink-0 items-center gap-3 rounded-full border px-5 py-3 text-sm font-extrabold transition ${
                    active
                      ? "border-veyvio-deep bg-veyvio-deep text-white"
                      : "border-[#ccd9d6] bg-white text-veyvio-deep hover:border-veyvio-teal"
                  }`}
                  onClick={() => setActiveView(view.key)}
                >
                  <span className={`text-[0.62rem] ${active ? "text-white/55" : "text-veyvio-teal"}`}>{view.number}</span>
                  {view.label}
                </button>
              );
            })}
          </div>

          <div
            key={selectedView.key}
            id={`authority-view-panel-${selectedView.key}`}
            role="tabpanel"
            aria-labelledby={`authority-view-tab-${selectedView.key}`}
            className="mt-6 grid overflow-hidden rounded-[2.2rem] bg-white shadow-[0_24px_70px_rgba(23,62,72,.1)] lg:grid-cols-[.78fr_1.22fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.65rem] font-black uppercase tracking-[.18em]" style={{ color: selectedView.accent }}>
                {selectedView.eyebrow}
              </p>
              <h3 className="mt-4 max-w-[13ch] font-marketing text-3xl font-extrabold leading-tight tracking-[-.04em] text-veyvio-deep sm:text-4xl">
                {selectedView.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-veyvio-muted">{selectedView.copy}</p>
              <div className="mt-9 space-y-3 border-t border-[#e1e7e5] pt-7">
                {[
                  ["The service", "can be reviewed with current operational context."],
                  ["The provider", "retains ownership of its governed actions."],
                  ["The outcome", "stays usable for later authority review."],
                ].map(([title, copy]) => (
                  <div key={title} className="flex items-start gap-3">
                    <Check colour={selectedView.accent} />
                    <p className="text-sm leading-6 text-veyvio-muted">
                      <strong className="text-veyvio-deep">{title}</strong> {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <AuthorityPreview view={selectedView} />
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-veyvio-muted">
            Representative workflow preview. Exact commissioner visibility, provider boundaries, approval flows and review exports are agreed during discovery and implementation scoping.
          </p>
        </div>
      </section>

      <section
        ref={governanceReveal.ref}
        className={`reveal bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${governanceReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Governed by role</p>
              <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
                One operational record. Different views for different responsibilities.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-veyvio-muted lg:justify-self-end">
              Local-authority users, provider operations teams and frontline staff do not need the same screen. They do need the same governed truth.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {governanceAreas.map((area) => (
              <article key={area.title} className="rounded-[1.7rem] border border-[#dfe6e7] bg-[#fbfcfc] p-7 sm:p-8">
                <span className="inline-flex rounded-full px-4 py-2 text-[0.65rem] font-black uppercase tracking-[.16em] text-white" style={{ backgroundColor: area.accent }}>
                  {area.title}
                </span>
                <p className="mt-6 text-sm leading-6 text-veyvio-muted">{area.copy}</p>
                <div className="mt-7 space-y-3 border-t border-[#e0e7e8] pt-6">
                  {area.items.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-semibold text-veyvio-muted">
                      <Check colour={area.accent} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={yardReveal.ref}
        className={`reveal border-y border-[#dce5e1] bg-[#f2f6f4] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 ${yardReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-veyvio-deep shadow-[0_32px_80px_rgba(23,62,72,.2)]">
            <img
              src="/images/case-studies/vehicle-readiness-preview-v1.png"
              alt="A yard operative checking accessibility equipment on a passenger vehicle."
              className="aspect-[1.12/1] w-full object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/94 p-5 shadow-xl backdrop-blur-md sm:inset-x-7 sm:bottom-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-veyvio-teal">Authority safety view</p>
                  <p className="mt-1 font-marketing text-lg font-extrabold text-veyvio-deep sm:text-xl">Accessible vehicle release supported</p>
                </div>
                <span className="rounded-full bg-[#e7f5d3] px-3 py-2 text-xs font-black text-[#426c16]">Ready</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Why Yard belongs on this page</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              “Scheduled” is not the same as safe and supportable.
            </h2>
            <p className="mt-6 text-lg leading-8 text-veyvio-muted">
              Yard brings the physical vehicle state into the authority story: location, checks, accessibility equipment, restrictions, defects and VOR all affect whether a commissioned service can genuinely proceed.
            </p>
            <div className="mt-8 rounded-[1.4rem] border border-[#d7e1dd] bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[.16em] text-veyvio-deep">Authority-facing readiness checks</p>
              <div className="mt-5 space-y-4">
                {[
                  ["Accessibility equipment", "Lift, ramp and restraints support the planned duty", "#2498b1"],
                  ["Vehicle restrictions", "Defects or VOR are visible before dispatch", "#ef6b5c"],
                  ["Release result", "Command can use the current supported state in the assignment", "#7ab82e"],
                ].map(([label, value, colour]) => (
                  <div key={label} className="grid grid-cols-[.8rem_1fr] gap-3">
                    <span className="mt-1.5 size-2 rounded-full" style={{ backgroundColor: colour }} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[.12em] text-veyvio-muted">{label}</p>
                      <p className="mt-1 text-sm font-extrabold text-veyvio-deep">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/platform/yard" className="btn-primary mt-8">
              Explore Veyvio Yard
            </Link>
          </div>
        </div>
      </section>

      <section
        ref={trustReveal.ref}
        className={`reveal bg-veyvio-deep px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8 ${trustReveal.visible ? "is-visible" : ""}`}
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#8ad0df]">Procurement and trust</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
              Give reviewers the information they expect to find.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/68">
              Local-authority conversations usually combine operations, privacy, hosting, accessibility and implementation questions. This page should route that review clearly instead of hiding it behind a generic sales CTA.
            </p>
            <div className="mt-8 space-y-3">
              {evidenceRows.map(([title, copy], index) => (
                <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 rounded-xl border border-white/12 bg-white/5 p-4">
                  <span className="font-marketing text-xs font-black text-[#8ad0df]">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-extrabold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/60">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-2xl border border-white/12 bg-white/6 p-6">
              <h3 className="font-marketing text-xl font-extrabold">Trust information</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Hosting region currently stated as {openDecisions.dataHostingRegion.value}. Privacy, tenant-isolation, accessibility and security materials should be easy for procurement reviewers to find.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/trust" className="btn-secondary border-white/25 bg-transparent text-white hover:bg-white/10">
                  Trust Centre
                </Link>
                <Link to="/trust/tenant-isolation" className="btn-secondary border-white/25 bg-transparent text-white hover:bg-white/10">
                  Tenant isolation
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-white/12 bg-white/6 p-6">
              <h3 className="font-marketing text-xl font-extrabold">Procurement links</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link to="/pricing" className="rounded-xl border border-white/12 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/8">
                  Pricing approach
                </Link>
                <Link to="/implementation" className="rounded-xl border border-white/12 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/8">
                  Implementation
                </Link>
                <Link to="/legal/privacy" className="rounded-xl border border-white/12 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/8">
                  Privacy notice
                </Link>
                <Link to="/legal/accessibility-statement" className="rounded-xl border border-white/12 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/8">
                  Accessibility statement
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-veyvio-teal">Questions before a review</p>
            <h2 className="mt-4 font-marketing text-4xl font-extrabold tracking-[-.04em] text-veyvio-deep sm:text-5xl">
              What authority teams usually ask.
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
                    <span aria-hidden="true" className={`text-2xl font-light text-veyvio-teal transition ${open ? "rotate-45" : ""}`}>
                      +
                    </span>
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
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#4e7d19]">Start with one governed service model</p>
            <h2 className="mt-4 max-w-[17ch] font-marketing text-4xl font-extrabold tracking-[-.045em] text-veyvio-deep sm:text-6xl">
              Review visibility, boundaries and evidence together.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-veyvio-muted">
              We will map the commissioner view, provider hand-offs, Yard readiness inputs and formal review requirements before proposing a controlled local-authority rollout or pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-veyvio-deep px-7 text-sm font-extrabold text-white transition hover:bg-[#0f3038]"
              onClick={() =>
                trackCta("final_cta_clicked", "Request a procurement conversation", {
                  page: "/industries/local-authorities",
                  section: "final-cta",
                  ctaPosition: "primary",
                })
              }
            >
              Request a procurement conversation
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
