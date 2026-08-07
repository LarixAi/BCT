import { Link } from "react-router-dom";
import { openCookiePreferences } from "./CookieConsent";
import { footerColumns } from "@/lib/site-config";
import { openDecisions } from "@/lib/open-decisions";

const productAppLinks = [
  { label: "Veyvio Command", href: "/platform/command" },
  { label: "Veyvio Driver", href: "/platform/driver" },
  { label: "Veyvio Yard", href: "/platform/yard" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-veyvio-border bg-veyvio-deep text-white">
      <div className="section-container py-16">
        <div className="mb-10 rounded-2xl border border-white/15 bg-white/5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
            Veyvio applications
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Staff users sign in through their organisation&apos;s Veyvio application.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {productAppLinks.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                to={link.href}
                className="inline-flex min-h-10 items-center rounded-full border border-white/20 px-4 text-sm font-medium text-white/90 transition hover:border-white/40 hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={openDecisions.signInUrl.value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center rounded-full border border-white/20 px-4 text-sm font-medium text-white/90 transition hover:border-white/40 hover:bg-white/10"
            >
              Sign in to Command
            </a>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link
                      to={link.href}
                      className="text-sm text-white/85 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-8 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {openDecisions.legalCompanyName.value}. All rights reserved.
            {openDecisions.legalCompanyName.status === "provisional" ? " (legal name provisional)" : ""}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/legal/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link to="/legal/product-privacy" className="hover:text-white">
              App privacy
            </Link>
            <Link to="/legal/terms" className="hover:text-white">
              Terms
            </Link>
            <Link to="/support" className="hover:text-white">
              Support
            </Link>
            <Link to="/legal/cookies" className="hover:text-white">
              Cookies
            </Link>
            <Link to="/legal/accessibility-statement" className="hover:text-white">
              Accessibility
            </Link>
            <button type="button" className="hover:text-white" onClick={openCookiePreferences}>
              Cookie preferences
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
