import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trackCta, trackEvent } from "@/lib/analytics";

type ApplicationKey = "command" | "driver" | "yard" | "maintenance" | "customer";

type Application = {
  key: ApplicationKey;
  name: string;
  eyebrow: string;
  status: string;
  title: string;
  description: string;
  href: string;
  features: string[];
  metrics: [string, string][];
  rows: { title: string; detail: string; status: string; attention?: boolean }[];
};

const applications: Application[] = [
  {
    key: "command",
    name: "Command",
    eyebrow: "For controllers and operations teams",
    status: "Pilot",
    title: "Plan, control and understand the live operation.",
    description:
      "Bring bookings, runs, duties, drivers, vehicles and exceptions into one calm operational view.",
    href: "/platform/command",
    features: [
      "Plan bookings, runs and duties",
      "Assign with eligibility and readiness checks",
      "Own live exceptions and retain the decision history",
    ],
    metrics: [
      ["Duties live", "18"],
      ["Vehicles ready", "24 / 27"],
      ["Needs attention", "3"],
    ],
    rows: [
      { title: "CT-104 · North Loop", detail: "A. Morgan · BX62 BCT", status: "On time" },
      { title: "SEND-08 · School run", detail: "J. Patel · LK19 VYO", status: "Ready" },
      {
        title: "DAR-22 · East zone",
        detail: "Driver swap requested",
        status: "Review",
        attention: true,
      },
    ],
  },
  {
    key: "driver",
    name: "Driver",
    eyebrow: "For drivers and escorts",
    status: "Pilot",
    title: "Keep every duty clear from sign-on to handback.",
    description:
      "Give frontline teams one guided mobile workflow for duties, passenger requirements, checks, messages and closeout.",
    href: "/platform/driver",
    features: [
      "Follow assigned work stop by stop",
      "Complete pre-use checks and report defects",
      "Queue selected actions safely when connectivity drops",
    ],
    metrics: [
      ["Stops left", "6"],
      ["Checks queued", "0"],
      ["New messages", "1"],
    ],
    rows: [
      { title: "Green Lane Centre", detail: "Arrive by 08:48", status: "Next" },
      { title: "Passenger requirements", detail: "Mobility aid noted", status: "Viewed" },
      { title: "End-of-shift handback", detail: "Available after final stop", status: "Later" },
    ],
  },
  {
    key: "yard",
    name: "Yard",
    eyebrow: "For depot and yard teams",
    status: "Pilot",
    title: "Know where every vehicle is and whether it is ready.",
    description:
      "Connect location, keys, equipment, checks, damage and movement history to the live operating plan.",
    href: "/platform/yard",
    features: [
      "Track bays, movements, keys and equipment",
      "Run guided checks with supporting evidence",
      "Feed current readiness into dispatch decisions",
    ],
    metrics: [
      ["Vehicles ready", "24"],
      ["Warnings", "2"],
      ["VOR", "1"],
    ],
    rows: [
      { title: "BX62 BCT", detail: "Bay 04 · keys logged", status: "Ready" },
      { title: "LK19 VYO", detail: "Equipment check complete", status: "Ready" },
      {
        title: "YN68 CTD",
        detail: "Ramp inspection required",
        status: "Restricted",
        attention: true,
      },
    ],
  },
  {
    key: "maintenance",
    name: "Maintenance",
    eyebrow: "For workshop and fleet teams",
    status: "Coming soon",
    title: "Connect defects to work and controlled release.",
    description:
      "Keep inspections, service plans, tyres, work orders and return-to-service decisions linked to the vehicle record.",
    href: "/platform/maintenance",
    features: [
      "Work from the same defect history seen by operations",
      "Record work, parts, costs and supporting evidence",
      "Keep work completion separate from return-to-service approval",
    ],
    metrics: [
      ["Work orders", "3"],
      ["Due soon", "5"],
      ["Awaiting approval", "1"],
    ],
    rows: [
      {
        title: "WO-218 · Ramp inspection",
        detail: "YN68 CTD",
        status: "In progress",
        attention: true,
      },
      { title: "WO-214 · Tyre replacement", detail: "BX17 PSV", status: "Complete" },
      { title: "WO-209 · Safety inspection", detail: "LK19 VYO", status: "Approved" },
    ],
  },
  {
    key: "customer",
    name: "Customer",
    eyebrow: "For authorised customers and commissioners",
    status: "Coming soon",
    title: "Share the right service information, not the whole operation.",
    description:
      "Give authorised customers controlled access to bookings, communication and service information without opening internal systems.",
    href: "/platform/customer-portal",
    features: [
      "Show only the bookings a customer can access",
      "Keep changes and communication connected",
      "Respect company, role and record boundaries",
    ],
    metrics: [
      ["Bookings", "14"],
      ["Upcoming", "6"],
      ["Messages", "2"],
    ],
    rows: [
      { title: "CT-104 · North Loop", detail: "Sunday · 08:35", status: "Confirmed" },
      { title: "DAR-22 · East zone", detail: "Sunday · 10:10", status: "Upcoming" },
      {
        title: "Service request 184",
        detail: "Additional requirement received",
        status: "Review",
        attention: true,
      },
    ],
  },
];

const workflow = [
  {
    number: "01",
    label: "Plan",
    copy: "Capture the booking, requirements and operating plan.",
  },
  {
    number: "02",
    label: "Check",
    copy: "Apply driver eligibility and vehicle readiness rules.",
  },
  {
    number: "03",
    label: "Operate",
    copy: "Keep frontline progress and live exceptions visible.",
  },
  {
    number: "04",
    label: "Close",
    copy: "Retain handback, outcomes and attributable evidence.",
  },
];

const foundations = [
  {
    number: "01",
    title: "One governed record",
    copy: "Each application reads the same operational state instead of maintaining a competing copy.",
  },
  {
    number: "02",
    title: "Safety before convenience",
    copy: "Configured eligibility and readiness gates sit inside the workflow, not in a separate checklist.",
  },
  {
    number: "03",
    title: "Frontline resilience",
    copy: "Driver and Yard can queue selected work safely and make sync state visible when connectivity returns.",
  },
  {
    number: "04",
    title: "Controlled access",
    copy: "Company, application, role and record boundaries are checked before protected information is returned.",
  },
];

const foundationPalettes = [
  { background: "#7ab82e", foreground: "#173e48", badge: "#dff3bd" },
  { background: "#4a8fa3", foreground: "#ffffff", badge: "#cce8ed" },
  { background: "#173e48", foreground: "#ffffff", badge: "#d8e5e8" },
  { background: "#2498b1", foreground: "#ffffff", badge: "#c8f0f6" },
] as const;

const rotatingHeroWords = [
  { label: "passenger transport", color: "#4a8fa3" },
  { label: "community transport", color: "#7ab82e" },
  { label: "school transport", color: "#2498b1" },
  { label: "accessible services", color: "#173e48" },
  { label: "fleet operations", color: "#6aa92b" },
] as const;

const liveApplicationCards = [
  {
    key: "command" as const,
    name: "Veyvio Command",
    color: "#4a8fa3",
    backgroundSize: "245%",
    backgroundPosition: "78% 20%",
  },
  {
    key: "driver" as const,
    name: "Veyvio Driver",
    color: "#2498b1",
    backgroundSize: "390%",
    backgroundPosition: "49% 78%",
  },
  {
    key: "yard" as const,
    name: "Veyvio Yard",
    color: "#7ab82e",
    backgroundSize: "255%",
    backgroundPosition: "3% 76%",
  },
] as const;

const applicationAccents: Record<ApplicationKey, { line: string; wash: string }> = {
  command: { line: "#4a8fa3", wash: "#e6f1f3" },
  driver: { line: "#6f42c1", wash: "#eee8fa" },
  yard: { line: "#7ab82e", wash: "#eef6e5" },
  maintenance: { line: "#2498b1", wash: "#e5f4f7" },
  customer: { line: "#173e48", wash: "#e7eef0" },
};

const applicationVisuals: Record<
  ApplicationKey,
  { backgroundSize: string; backgroundPosition: string }
> = {
  command: { backgroundSize: "106%", backgroundPosition: "50% 70%" },
  driver: { backgroundSize: "245%", backgroundPosition: "52% 88%" },
  yard: { backgroundSize: "158%", backgroundPosition: "4% 78%" },
  maintenance: { backgroundSize: "150%", backgroundPosition: "91% 25%" },
  customer: { backgroundSize: "230%", backgroundPosition: "50% 86%" },
};

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductScene({ product }: { product: Application }) {
  const accent = applicationAccents[product.key];
  const visual = applicationVisuals[product.key];

  return (
    <div className="relative h-full min-h-[330px] overflow-hidden bg-white">
      <div className="absolute left-[3%] top-[5%] z-20 rounded-xl border border-veyvio-border bg-white/95 px-3.5 py-2.5 shadow-[0_14px_34px_rgba(23,62,72,0.1)] backdrop-blur">
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-veyvio-muted">
          {product.metrics[0][0]}
        </p>
        <p className="mt-0.5 font-marketing text-lg font-bold text-veyvio-deep">
          {product.metrics[0][1]}
        </p>
      </div>

      <div className="absolute right-[2%] top-[3%] z-20 min-w-36 rounded-xl border border-veyvio-border bg-white/95 px-3.5 py-2.5 shadow-[0_14px_34px_rgba(23,62,72,0.1)] backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-veyvio-muted">
              {product.metrics[1][0]}
            </p>
            <p className="mt-0.5 font-marketing text-lg font-bold text-veyvio-deep">
              {product.metrics[1][1]}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accent.line }}
          />
        </div>
      </div>

      <div
        role="img"
        aria-label={`${product.name} application shown across connected Veyvio devices`}
        className="absolute inset-x-0 bottom-0 top-[8%] z-10 bg-no-repeat"
        style={{
          backgroundImage: "url('/images/sections/veyvio-connected-apps-v1.png')",
          backgroundSize: visual.backgroundSize,
          backgroundPosition: visual.backgroundPosition,
          maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 94%, transparent 100%)",
        }}
      />

      <div className="absolute bottom-[6%] right-[3%] z-20 max-w-52 rounded-xl border border-veyvio-border bg-white/95 px-3.5 py-2.5 shadow-[0_14px_34px_rgba(23,62,72,0.1)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: accent.wash, color: accent.line }}
          >
            ✓
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-veyvio-deep">
              {product.rows[0].title}
            </p>
            <p className="truncate text-[0.65rem] text-veyvio-muted">
              {product.rows[0].status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EcosystemCard({
  application,
  className = "",
  inactive = false,
}: {
  application: Application;
  className?: string;
  inactive?: boolean;
}) {
  const accent = applicationAccents[application.key];

  return (
    <article
      aria-hidden={inactive}
      inert={inactive ? true : undefined}
      className={`relative overflow-hidden bg-white ${className}`}
    >
      <div className="grid h-full min-h-0 min-[900px]:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-0 flex-col justify-center px-5 py-7 sm:px-7 lg:px-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-veyvio-teal">
              {application.eyebrow}
            </p>
            <span className="rounded-full border border-veyvio-border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-veyvio-muted">
              {application.status}
            </span>
          </div>

          <h3 className="mt-3 font-marketing text-[2rem] font-bold leading-[1.02] tracking-[-0.035em] text-veyvio-deep lg:text-[2.45rem]">
            Veyvio {application.name}
          </h3>
          <p
            className="mt-2 font-marketing text-lg font-bold leading-snug lg:text-xl"
            style={{ color: accent.line }}
          >
            {application.title}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-veyvio-muted lg:text-[0.95rem]">
            {application.description}
          </p>

          <ul className="mt-4 list-disc space-y-1.5 pl-5">
            {application.features.map((feature) => (
              <li key={feature} className="text-sm leading-relaxed text-veyvio-deep">
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={application.href}
              className="btn-primary"
              onClick={() =>
                trackCta("application_card_selected", `Explore Veyvio ${application.name}`, {
                  page: "/platform",
                  section: `platform_${application.key}`,
                })
              }
            >
              Explore Veyvio {application.name}
            </Link>
            <Link
              to="/contact"
              className="btn-secondary"
              onClick={() =>
                trackCta("demo_cta_selected", "Book a demo", {
                  page: "/platform",
                  section: `platform_${application.key}`,
                })
              }
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div className="min-h-0">
          <ProductScene product={application} />
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1"
        style={{ backgroundColor: accent.line }}
      />
    </article>
  );
}

export function PlatformPage() {
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [appDropProgress, setAppDropProgress] = useState(0);
  const [ecosystemProgress, setEcosystemProgress] = useState(0);
  const [activeFoundation, setActiveFoundation] = useState(0);
  const appRailRef = useRef<HTMLElement>(null);
  const ecosystemRef = useRef<HTMLDivElement>(null);
  const heroWord = rotatingHeroWords[heroWordIndex];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setHeroWordIndex((current) => (current + 1) % rotatingHeroWords.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const section = ecosystemRef.current;
        if (!section) return;

        const bounds = section.getBoundingClientRect();
        const scrollDistance = Math.max(1, bounds.height - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -bounds.top / scrollDistance));
        setEcosystemProgress(progress);
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAppDropProgress(1);
      return;
    }

    let frame = 0;

    const updateProgress = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rail = appRailRef.current;
        if (!rail) return;

        const railTop = rail.getBoundingClientRect().top;
        const start = window.innerHeight * 0.94;
        const end = window.innerHeight * 0.36;
        const progress = Math.min(1, Math.max(0, (start - railTop) / (start - end)));
        setAppDropProgress(progress);
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  usePageMeta({
    title: "Connected passenger transport platform",
    description:
      "Explore Veyvio Command, Driver, Yard, Maintenance and customer access — role-specific applications connected by one operational record.",
    path: "/platform",
  });

  return (
    <>
      <section className="relative overflow-hidden border-b border-veyvio-border bg-white">
        <div className="relative mx-auto flex min-h-[max(620px,calc(100svh-76px))] max-w-[1440px] items-center justify-center px-5 py-20 text-center sm:px-8">
          <h1 className="font-marketing font-bold leading-[0.95] tracking-[-0.055em] text-veyvio-deep">
            <span className="sr-only">
              One connected platform for passenger transport operations.
            </span>
            <span aria-hidden="true">
              <span className="block text-[3.15rem] sm:text-[4.5rem] lg:text-[5.75rem] xl:text-[6.35rem]">
                One connected platform
              </span>
              <span className="mt-2 block text-[3.15rem] sm:text-[4.5rem] lg:text-[5.75rem] xl:text-[6.35rem]">
                for your
              </span>
              <span className="relative mt-3 block min-h-[1.05em] overflow-hidden text-[3.15rem] sm:text-[4.5rem] lg:text-[5.75rem] xl:text-[6.35rem]">
                <span
                  key={heroWord.label}
                  className="platform-word-enter block"
                  style={{ color: heroWord.color }}
                >
                  {heroWord.label}
                </span>
              </span>
            </span>
          </h1>
        </div>

        <div className="section-container pb-24 text-center sm:pb-28 lg:pb-32">
          <nav
            ref={appRailRef}
            aria-label="Platform applications"
            className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-10 overflow-hidden sm:grid-cols-3 sm:gap-8"
          >
            {liveApplicationCards.map((application, index) => {
              const staggerStart = index * 0.1;
              const itemProgress = Math.min(
                1,
                Math.max(0, (appDropProgress - staggerStart) / (1 - staggerStart)),
              );
              const travel = -170 * (1 - itemProgress);

              return (
                <a
                  key={application.key}
                  href="#applications"
                  onClick={() => {
                    trackEvent("solution_selected", {
                      section: `platform_${application.key}_shortcut`,
                    });
                  }}
                  className="group relative flex min-h-64 flex-col items-center justify-end text-sm font-semibold text-veyvio-deep transition-colors hover:text-veyvio-teal"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[18%] bottom-14 top-0 origin-top"
                    style={{
                      opacity: 0.28 + itemProgress * 0.62,
                      transform: `scaleY(${0.24 + itemProgress * 0.76})`,
                      backgroundImage: `radial-gradient(circle, ${application.color}4d 1px, transparent 1.4px), linear-gradient(to bottom, transparent 0%, ${application.color}1f 38%, ${application.color}73 100%)`,
                      backgroundSize: "7px 7px, 100% 100%",
                      maskImage: "linear-gradient(to bottom, transparent 0%, black 34%, black 100%)",
                    }}
                  />
                  <span
                    className="relative z-10 block h-28 w-36 overflow-hidden rounded-[1.35rem] border-4 border-white bg-white shadow-[0_18px_38px_rgba(23,62,72,0.18)] group-hover:shadow-[0_22px_44px_rgba(23,62,72,0.24)]"
                    style={{
                      opacity: 0.18 + itemProgress * 0.82,
                      transform: `translate3d(0, ${travel}px, 0) scale(${0.9 + itemProgress * 0.1})`,
                      backgroundImage: "url('/images/sections/veyvio-connected-apps-v1.png')",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: application.backgroundSize,
                      backgroundPosition: application.backgroundPosition,
                      willChange: "transform, opacity",
                    }}
                    role="img"
                    aria-label={`${application.name} interface preview`}
                  />
                  <span
                    className="relative z-10 mt-4 font-marketing text-base font-bold"
                    style={{ opacity: itemProgress }}
                  >
                    {application.name}
                  </span>
                </a>
              );
            })}
          </nav>

          <h2 className="mx-auto mt-24 max-w-5xl font-marketing text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-veyvio-deep sm:mt-32 sm:text-5xl lg:text-[4rem]">
            Veyvio is a{" "}
            <span className="text-veyvio-lime">connected transport platform</span>
            <span className="block">with focused web and mobile applications</span>
          </h2>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-relaxed text-veyvio-muted">
            Bring Command, Driver, Yard, Maintenance and customer access together around one
            shared operational record.
          </p>
          <a
            href="#applications"
            className="btn-primary mt-8"
            onClick={() =>
              trackCta("platform_cta_selected", "Explore the applications", {
                page: "/platform",
                section: "platform_hero",
              })
            }
          >
            Explore the applications
          </a>
        </div>
      </section>

      <section id="applications" className="scroll-mt-24 border-y border-veyvio-border bg-veyvio-surface">
        <div
          ref={ecosystemRef}
          className="relative hidden min-[900px]:block"
          style={{ height: `${(applications.length + 1) * 100}svh` }}
        >
          <div className="sticky top-[76px] h-[calc(100svh-76px)] overflow-hidden">
            <div className="section-container flex h-full min-h-0 flex-col py-5 lg:py-6">
              <div className="flex shrink-0 items-end justify-between gap-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-veyvio-teal">
                    Explore the ecosystem
                  </p>
                  <h2 className="mt-2 font-marketing text-3xl font-bold tracking-[-0.035em] text-veyvio-deep lg:text-4xl">
                    See the operation through every role.
                  </h2>
                </div>
                <div className="w-56 pb-1" aria-hidden="true">
                  <div className="flex gap-2">
                    {applications.map((application, index) => {
                      const timeline = ecosystemProgress * applications.length;
                      const activeIndex = Math.min(
                        applications.length - 1,
                        Math.floor(timeline),
                      );
                      return (
                        <span
                          key={application.key}
                          className="h-1 flex-1 rounded-full transition-colors duration-200"
                          style={{
                            backgroundColor:
                              index <= activeIndex
                                ? applicationAccents[application.key].line
                                : "#d8e0e3",
                          }}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-right text-xs font-semibold text-veyvio-muted">
                    Scroll to explore
                  </p>
                </div>
              </div>

              <div className="relative mt-5 min-h-0 flex-1">
                {applications.map((application, index) => {
                  const timeline = ecosystemProgress * applications.length;
                  const enterProgress =
                    index === 0 ? 1 : Math.min(1, Math.max(0, timeline - (index - 1)));
                  const activeIndex = Math.min(
                    applications.length - 1,
                    Math.floor(timeline),
                  );
                  const isInactive = index !== activeIndex;
                  const translateY = index === 0 ? 0 : (1 - enterProgress) * 108;

                  return (
                    <div
                      key={application.key}
                      className="absolute inset-0"
                      style={{
                        zIndex: index + 1,
                        opacity: index === 0 ? 1 : Math.max(0.12, enterProgress),
                        transform: `translate3d(0, ${translateY}%, 0)`,
                        visibility: index > 0 && enterProgress === 0 ? "hidden" : "visible",
                        willChange: "transform, opacity",
                      }}
                    >
                      <EcosystemCard
                        application={application}
                        inactive={isInactive}
                        className="h-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="section-container py-20 min-[900px]:hidden">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-veyvio-teal">
            Explore the ecosystem
          </p>
          <h2 className="section-heading mt-4">See the operation through every role.</h2>
          <p className="mt-5 max-w-xl leading-relaxed text-veyvio-muted">
            Every role gets a focused view of the same live operational record.
          </p>
          <div className="mt-10 space-y-8">
            {applications.map((application) => (
              <EcosystemCard key={application.key} application={application} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-veyvio-deep py-20 text-white sm:py-24 lg:py-28">
        <div className="section-container">
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-veyvio-lime">
                One connected workflow
              </p>
              <h2 className="mt-4 max-w-xl font-marketing text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl">
                The record moves with the operation.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-white/70">
              Work does not disappear at the hand-off between office, driver, yard and workshop.
              The next team receives the current state and the context behind it.
            </p>
          </div>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <li key={step.label} className="relative bg-veyvio-deep p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-marketing text-sm font-bold text-veyvio-lime">{step.number}</span>
                  {index < workflow.length - 1 ? (
                    <ArrowIcon className="hidden h-5 w-5 text-white/30 lg:block" />
                  ) : null}
                </div>
                <h3 className="mt-10 font-marketing text-2xl font-bold">{step.label}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24 lg:py-28">
        <div className="section-container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-veyvio-teal">
              Shared platform foundations
            </p>
            <h2 className="section-heading mt-4">
              Connected by design, not reconciled afterwards.
            </h2>
            <p className="section-lead mx-auto">
              The value is not only in each application. It is in the rules, access controls and
              operational history they share.
            </p>
          </div>

          <div
            className="mt-12 hidden h-[410px] gap-3 md:flex"
            onMouseLeave={() => setActiveFoundation(0)}
            aria-label="Shared platform foundations"
          >
            {foundations.map((foundation, index) => {
              const isActive = activeFoundation === index;
              const palette = foundationPalettes[index];

              return (
                <button
                  key={foundation.title}
                  type="button"
                  aria-expanded={isActive}
                  aria-label={`${foundation.title}. ${foundation.copy}`}
                  onMouseEnter={() => setActiveFoundation(index)}
                  onFocus={() => setActiveFoundation(index)}
                  onClick={() => setActiveFoundation(index)}
                  className="group relative flex basis-0 flex-col overflow-hidden p-6 text-left outline-none transition-[flex-grow,transform,box-shadow] duration-500 ease-out hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-veyvio-deep/30"
                  style={{
                    flexGrow: isActive ? 2.35 : 0.78,
                    backgroundColor: palette.background,
                    color: palette.foreground,
                    boxShadow: isActive ? "0 22px 55px rgba(23,62,72,0.16)" : "none",
                  }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-marketing text-base font-bold"
                    style={{
                      backgroundColor: palette.badge,
                      color: palette.background === "#7ab82e" ? "#173e48" : palette.background,
                    }}
                  >
                    {index + 1}
                  </span>

                  <div
                    className="mt-8 min-w-[270px] transition-all duration-300"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: `translateX(${isActive ? 0 : 18}px)`,
                      visibility: isActive ? "visible" : "hidden",
                    }}
                  >
                    <h3 className="max-w-sm font-marketing text-3xl font-bold leading-tight">
                      {foundation.title}
                    </h3>
                    <p className="mt-4 max-w-sm text-base leading-relaxed opacity-80">
                      {foundation.copy}
                    </p>
                  </div>

                  <span
                    className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-veyvio-deep shadow-[0_12px_28px_rgba(23,62,72,0.14)] transition duration-300"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: `translateY(${isActive ? 0 : 12}px)`,
                      visibility: isActive ? "visible" : "hidden",
                    }}
                  >
                    Explore this foundation
                    <ArrowIcon className="h-5 w-5" />
                  </span>

                  <span
                    aria-hidden="true"
                    className="absolute bottom-7 left-1/2 origin-center whitespace-nowrap font-marketing text-sm font-bold uppercase tracking-[0.16em] opacity-75 transition-opacity duration-200"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "translateX(-50%) rotate(180deg)",
                      opacity: isActive ? 0 : 0.78,
                    }}
                  >
                    {foundation.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 md:hidden">
            {foundations.map((foundation, index) => {
              const palette = foundationPalettes[index];
              return (
                <article
                  key={foundation.title}
                  className="min-h-56 p-6"
                  style={{ backgroundColor: palette.background, color: palette.foreground }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full font-marketing text-sm font-bold"
                    style={{
                      backgroundColor: palette.badge,
                      color: palette.background === "#7ab82e" ? "#173e48" : palette.background,
                    }}
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-6 font-marketing text-2xl font-bold">{foundation.title}</h3>
                  <p className="mt-3 leading-relaxed opacity-80">{foundation.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-veyvio-border bg-veyvio-surface py-16 sm:py-20">
        <div className="section-container">
          <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#173e48_0%,#285d69_100%)] px-7 py-12 text-white sm:px-12 sm:py-14 lg:px-16">
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[42px] border-veyvio-lime/20" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-veyvio-lime">
                  See the connected platform
                </p>
                <h2 className="mt-4 max-w-2xl font-marketing text-3xl font-bold tracking-tight sm:text-4xl">
                  Bring your real operating workflow to the demonstration.
                </h2>
                <p className="mt-4 max-w-2xl text-white/70">
                  We will map how Veyvio could connect your services, people, vehicles and evidence
                  around one governed record.
                </p>
              </div>
              <Link
                to="/demo"
                className="btn-primary relative"
                onClick={() => trackCta("demo_cta_selected", "Book a platform demo", { page: "/platform" })}
              >
                Book a platform demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
