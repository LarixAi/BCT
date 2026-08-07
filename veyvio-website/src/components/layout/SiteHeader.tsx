import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { trackCta } from "@/lib/analytics";
import { openDecisions } from "@/lib/open-decisions";
import { mainNav } from "@/lib/site-config";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(menuOpen, menuRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur transition-[box-shadow] ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div
        className={`section-container grid grid-cols-[auto_1fr_auto] items-center gap-4 ${
          scrolled ? "py-3" : "py-4"
        }`}
      >
        <Link
          to="/"
          className="font-marketing text-xl font-extrabold tracking-tight text-veyvio-deep lowercase"
        >
          veyvio
        </Link>

        <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Primary">
          {mainNav.map((item) => (
            <div key={item.label} className="group relative">
              <Link to={item.href} className="btn-ghost px-3">
                {item.label}
              </Link>
              {item.children ? (
                <div className="invisible absolute left-1/2 top-full z-50 min-w-56 -translate-x-1/2 rounded-xl border border-veyvio-border bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          to={child.href}
                          className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm text-veyvio-muted hover:bg-veyvio-surface hover:text-veyvio-deep"
                        >
                          <span>{child.label}</span>
                          {child.status ? (
                            <span className="shrink-0 rounded-full bg-[#e8f4d7] px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-veyvio-deep">
                              {child.status}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-3 lg:flex">
          <a
            href={openDecisions.signInUrl.value}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-veyvio-deep hover:text-veyvio-teal"
          >
            Sign in
          </a>
          <Link
            to="/demo"
            className="btn-primary min-w-0 px-5"
            onClick={() => trackCta("demo_cta_selected", "Book a demo", { ctaPosition: "header" })}
          >
            Book a demo
          </Link>
        </div>

        <button
          type="button"
          className="col-start-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-veyvio-border px-3 text-sm font-semibold text-veyvio-deep lg:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          ref={menuRef}
          className="fixed inset-0 top-[var(--header-offset,4.5rem)] z-40 overflow-y-auto bg-white p-4 lg:hidden"
          style={{ "--header-offset": scrolled ? "4.5rem" : "5rem" } as CSSProperties}
        >
          <nav aria-label="Mobile primary">
            <ul className="space-y-2">
              {mainNav.map((item) => (
                <li key={item.label} className="rounded-xl border border-veyvio-border">
                  <Link
                    to={item.href}
                    className="block px-4 py-3 font-semibold text-veyvio-deep"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <ul className="border-t border-veyvio-border px-2 pb-2">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            to={child.href}
                            className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm text-veyvio-muted"
                            onClick={() => setMenuOpen(false)}
                          >
                            <span>{child.label}</span>
                            {child.status ? (
                              <span className="shrink-0 rounded-full bg-[#e8f4d7] px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-veyvio-deep">
                                {child.status}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={openDecisions.signInUrl.value}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </a>
            <Link to="/demo" className="btn-primary" onClick={() => setMenuOpen(false)}>
              Book a demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
