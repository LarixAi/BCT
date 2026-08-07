import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { trackCta } from "@/lib/analytics";
import { openDecisions } from "@/lib/open-decisions";

const heroWords = [
  { label: "Transparent scope", color: "#173e48" },
  { label: "Connected modules", color: "#4a8fa3" },
  { label: "Procurement-ready review", color: "#7ab82e" },
] as const;

const planCards = [
  {
    title: "Starting scope",
    eyebrow: "For operators solving one operational bottleneck first",
    cta: "Start the pricing review",
    badge: null,
    body: "A controlled pilot or first rollout focused on one workflow, one team or one operating site.",
    bullets: [
      "Best when replacing one painful manual process first",
      "Command, Driver or Yard-led starting scope",
      "Commercial review stays tightly aligned to the first operational change",
    ],
  },
  {
    title: "Core operations",
    eyebrow: "For teams connecting live control with frontline delivery",
    cta: "Discuss core operations scope",
    badge: "Most common",
    body: "Designed for organisations that need Command connected to Driver, Yard or both as the live operating model matures.",
    bullets: [
      "Good fit for live dispatch, duty and readiness workflows",
      "Scope depends on fleet scale, depots and rollout pace",
      "Training and implementation planning usually become part of the discussion",
    ],
  },
  {
    title: "Connected rollout",
    eyebrow: "For operators shaping multi-role, multi-site change",
    cta: "Plan a connected rollout",
    badge: null,
    body: "For broader operational change where multiple modules, multiple depots or procurement governance need to move together.",
    bullets: [
      "Usually spans Command plus Driver and/or Yard",
      "Commercial scope often includes rollout sequencing and support structure",
      "Best for organisations standardising processes across teams or sites",
    ],
  },
  {
    title: "Custom programme",
    eyebrow: "For authorities, commissioners or complex delivery models",
    cta: "Request a custom plan",
    badge: null,
    body: "Use a tailored commercial review where procurement, authority visibility, governance or phased deployment matter as much as application count.",
    bullets: [
      "Supports authority and procurement-led conversations",
      "Useful when trust, rollout and module scope must be reviewed together",
      "Best when public-sector or multi-provider context shapes the decision",
    ],
  },
] as const;

const comparisonRows = [
  ["Command pricing discussion", "Included", "Included", "Included", "Included"],
  ["Driver scope available", "Optional", "Available", "Available", "Available"],
  ["Yard scope available", "Optional", "Available", "Available", "Available"],
  ["Multi-depot rollout support", "As needed", "As needed", "Included in review", "Included in review"],
  ["Discovery and workflow mapping", "Included", "Included", "Included", "Included"],
  ["Training and onboarding", "Scoped", "Scoped", "Scoped", "Scoped"],
  ["Data migration and imports", "Scoped", "Scoped", "Scoped", "Scoped"],
  ["Trust / procurement review", "Available", "Available", "Available", "Priority"],
  ["Maintenance and customer access", "Future scope", "Future scope", "Future scope", "Future scope"],
  ["Commercial model", "Tailored", "Tailored", "Tailored", "Tailored"],
] as const;

const faqs = [
  {
    question: "Why does Veyvio not publish list prices yet?",
    answer:
      "Packaging is still being finalised around real pilot and rollout scope. We would rather explain what shapes price clearly than publish misleading flat packages.",
  },
  {
    question: "Can we start with only one module or one depot?",
    answer:
      "Yes, depending on the operational problem you want to solve first. The commercial review can start from a controlled pilot rather than an all-at-once rollout.",
  },
  {
    question: "Does Veyvio guarantee compliance if we buy the platform?",
    answer:
      "No. Veyvio can help make checks, evidence and operational controls visible, but each operator remains responsible for legal, regulatory and safeguarding obligations.",
  },
  {
    question: "What do you need in order to prepare a pricing review?",
    answer:
      "Usually your service type, fleet size, depot model, which workflows are most painful today, and which roles need to use the system first.",
  },
] as const;

function RevealSection({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>();
  return (
    <section
      id={id}
      ref={ref}
      className={`${className} ${visible ? "reveal is-visible" : "reveal"}`}
    >
      {children}
    </section>
  );
}

export function PricingPage() {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroWord = heroWords[heroIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroWords.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  usePageMeta({
    title: "Pricing tailored to your operation",
    description:
      "Explore how Veyvio pricing is shaped by modules, depots, rollout scope and procurement needs for passenger transport operators.",
    path: "/pricing",
  });

  return (
    <>
      <section className="border-b border-veyvio-border bg-white">
        <div className="section-container py-18 text-center sm:py-22 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
            Plans &amp; Pricing
          </p>
          <h1 className="mx-auto mt-5 max-w-5xl font-marketing font-bold leading-[0.95] tracking-[-0.05em] text-veyvio-deep">
            <span className="sr-only">
              Transparent scope, connected modules and procurement-ready review for transport
              operators.
            </span>
            <span aria-hidden="true">
              <span className="block text-[3rem] sm:text-[4.5rem] lg:text-[5.5rem]">
                Pricing for
              </span>
              <span className="relative mt-3 block min-h-[1.05em] overflow-hidden text-[3rem] sm:text-[4.5rem] lg:text-[5.5rem]">
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
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-veyvio-muted">
            Veyvio is licensed around the modules, depots, service scale and implementation scope
            your organisation needs. We are not publishing list prices while packaging is still
            being finalised, but we can make the commercial shape clear for real transport buyers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="btn-primary"
              onClick={() =>
                trackCta("contact_selected", "Request pricing review", {
                  page: "/pricing",
                  section: "pricing_hero",
                  ctaPosition: "primary",
                })
              }
            >
              Request pricing review
            </Link>
            <Link
              to="/demo"
              className="btn-secondary"
              onClick={() =>
                trackCta("demo_cta_selected", "Book a demo", {
                  page: "/pricing",
                  section: "pricing_hero",
                  ctaPosition: "secondary",
                })
              }
            >
              Book a demo
            </Link>
          </div>
          <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem] bg-white">
            <img
              src="/images/sections/veyvio-connected-apps-v1.png"
              alt="Veyvio Command, Yard and Driver shown together as connected applications."
              className="mx-auto w-full max-w-4xl object-cover"
            />
          </div>
          <p className="mt-5 text-sm text-veyvio-muted">
            Best for companies that want honest scope discussion before commercial commitment.
          </p>
        </div>
      </section>

      <RevealSection className="border-b border-veyvio-border bg-veyvio-surface py-16 sm:py-20">
        <div className="section-container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-marketing text-3xl font-bold tracking-tight text-veyvio-deep sm:text-4xl">
              Choose the commercial shape that best fits your operation.
            </h2>
            <p className="mt-4 text-lg text-veyvio-muted">
              We do not publish misleading flat list prices. Instead, we help companies choose the
              right rollout shape and then confirm scope honestly.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {planCards.map((card) => (
              <article
                key={card.title}
                className={`rounded-2xl border p-6 shadow-sm ${
                  card.badge ? "border-veyvio-lime bg-[#f3f9ea]" : "border-veyvio-border bg-white"
                }`}
              >
                {card.badge ? (
                  <span className="inline-flex rounded-full bg-veyvio-deep px-3 py-1 text-xs font-bold text-white">
                    {card.badge}
                  </span>
                ) : null}
                <h2 className="mt-3 font-marketing text-2xl font-bold text-veyvio-deep">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-veyvio-muted">{card.eyebrow}</p>
                <p className="mt-4 text-sm leading-relaxed text-veyvio-muted">{card.body}</p>
                <Link
                  to="/contact"
                  className="btn-primary mt-6 w-full"
                  onClick={() =>
                    trackCta("contact_selected", card.cta, {
                      page: "/pricing",
                      section: `pricing_card_${card.title.toLowerCase().replace(/\s+/g, "_")}`,
                      ctaPosition: "plan_card",
                    })
                  }
                >
                  {card.cta}
                </Link>
                <ul className="mt-5 space-y-3">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-veyvio-muted">
                      <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f4d7] text-[0.65rem] font-black text-veyvio-deep">
                        ✓
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="py-18 sm:py-22">
        <div className="section-container">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#5d35b0] px-8 py-10 text-white sm:px-12 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
            <div>
              <h2 className="font-marketing text-4xl font-bold tracking-tight sm:text-5xl">
                Need a custom plan?
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/82">
                Share your services, depots, rollout goals and operational challenges with us, and
                we will shape a commercial plan that fits the real operation.
              </p>
              <Link
                to="/contact"
                className="btn-primary mt-8"
                onClick={() =>
                  trackCta("contact_selected", "Contact us", {
                    page: "/pricing",
                    section: "pricing_custom_plan",
                    ctaPosition: "primary",
                  })
                }
              >
                Contact us
              </Link>
            </div>
            <div className="mt-8 lg:mt-0">
              <img
                src="/images/hero/yard-readiness.svg"
                alt="Veyvio Yard readiness interface illustration."
                className="w-full rounded-2xl bg-white/10"
              />
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="py-18 sm:py-22">
        <div className="section-container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
              Compare pricing paths
            </p>
            <h2 className="mt-3 font-marketing text-4xl font-bold tracking-tight text-veyvio-deep sm:text-5xl">
              Compare rollout paths and choose the best fit.
            </h2>
            <p className="mt-4 text-lg text-veyvio-muted">
              We compare commercial shape, scope and rollout needs rather than publishing fake flat
              plans that ignore how transport operations really work.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-veyvio-border bg-white">
            <div className="hidden grid-cols-[1.15fr_repeat(4,0.7fr)] border-b border-veyvio-border bg-white px-6 py-4 text-sm font-semibold text-veyvio-deep md:grid">
              <span />
              <span>Starting scope</span>
              <span className="bg-[#eef8ec] px-2 py-1 rounded">Core operations</span>
              <span>Connected rollout</span>
              <span>Custom programme</span>
            </div>
            {comparisonRows.map(([title, starting, core, connected, custom], index) => (
              <div
                key={title}
                className={`grid gap-3 border-t border-veyvio-border px-6 py-5 first:border-t-0 md:grid-cols-[1.15fr_repeat(4,0.7fr)] md:items-start ${
                  index % 2 === 1 ? "bg-veyvio-surface/45" : "bg-white"
                }`}
              >
                <div>
                  <p className="text-base font-bold text-veyvio-deep">{title}</p>
                </div>
                <p className="text-sm leading-relaxed text-veyvio-muted">{starting}</p>
                <p className="bg-[#eef8ec] px-2 py-1 text-sm leading-relaxed text-veyvio-muted">{core}</p>
                <p className="text-sm leading-relaxed text-veyvio-muted">{connected}</p>
                <p className="text-sm leading-relaxed text-veyvio-muted">{custom}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="py-18 sm:py-22">
        <div className="section-container grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
              Procurement and trust
            </p>
            <h2 className="mt-3 font-marketing text-3xl font-bold tracking-tight text-veyvio-deep sm:text-4xl">
              Give buyers what they need to review pricing responsibly.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-veyvio-muted">
              Pricing discussions often sit alongside hosting, support, privacy and operational
              readiness questions. Veyvio should make that review easier, not blur it.
            </p>
          </div>

          <div className="grid gap-4">
            <article className="rounded-2xl border border-veyvio-border bg-veyvio-surface p-6">
              <h3 className="font-marketing text-xl font-bold text-veyvio-deep">Trust information</h3>
              <p className="mt-3 text-sm leading-relaxed text-veyvio-muted">
                Hosting region currently stated as {openDecisions.dataHostingRegion.value}. Trust,
                privacy and security review should be part of the commercial conversation where
                relevant.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/trust" className="btn-secondary">
                  Visit the Trust Centre
                </Link>
                <Link to="/legal/privacy" className="btn-secondary">
                  Privacy notice
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-veyvio-border bg-white p-6">
              <h3 className="font-marketing text-xl font-bold text-veyvio-deep">Procurement note</h3>
              <p className="mt-3 text-sm leading-relaxed text-veyvio-muted">
                This page is designed to support structured pricing conversations, not to publish a
                misleading fixed list while packaging is still evolving.
              </p>
            </article>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="border-t border-veyvio-border bg-white py-18 sm:py-22">
        <div className="section-container">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-teal">
              Pricing FAQ
            </p>
            <h2 className="mt-3 font-marketing text-3xl font-bold tracking-tight text-veyvio-deep sm:text-4xl">
              Answer the questions buyers usually ask before requesting a quote.
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map((item) => (
              <details key={item.question} className="rounded-2xl border border-veyvio-border bg-white p-6">
                <summary className="cursor-pointer list-none font-marketing text-xl font-bold text-veyvio-deep">
                  {item.question}
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-veyvio-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="pb-20 pt-10 sm:pb-24">
        <div className="section-container rounded-[2rem] bg-[linear-gradient(135deg,#173e48_0%,#4a8fa3_100%)] px-8 py-12 text-white sm:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veyvio-lime">
                Next step
              </p>
              <h2 className="mt-3 font-marketing text-3xl font-bold tracking-tight sm:text-4xl">
                Talk through your operation, then we will shape the right commercial scope.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/80">
                Start with the workflows you need to change, the modules you think matter, and the
                level of rollout support you expect. We will keep the conversation practical.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to="/contact"
                className="btn-primary"
                onClick={() =>
                  trackCta("contact_selected", "Request pricing review", {
                    page: "/pricing",
                    section: "pricing_final_cta",
                    ctaPosition: "primary",
                  })
                }
              >
                Request pricing review
              </Link>
              <Link
                to="/demo"
                className="btn-secondary border-white/25 bg-transparent text-white hover:bg-white/10"
                onClick={() =>
                  trackCta("demo_cta_selected", "Book a demo", {
                    page: "/pricing",
                    section: "pricing_final_cta",
                    ctaPosition: "secondary",
                  })
                }
              >
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </RevealSection>
    </>
  );
}
