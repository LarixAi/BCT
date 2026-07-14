import { Link, useRouterState } from "@tanstack/react-router";
import { isActiveDutyRoute } from "@/domain/driver/nav-routes";

/**
 * Duty context strip under the app chrome — not a second bottom tab bar.
 * Keeps Home reachable via main BottomNav while on a trip/duty.
 */
export function DutySubnav({ dutyId }: { dutyId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isActiveDutyRoute(pathname)) return null;

  const base = `/duties/${dutyId}`;
  const items = [
    { label: "Hub", to: base, active: pathname === base || pathname === `${base}/` },
    {
      label: "Journey",
      to: `${base}/journey/active`,
      active: pathname.includes("/journey/active"),
    },
    { label: "Route", to: `${base}/run`, active: pathname.includes("/run") },
    {
      label: "Passengers",
      to: `${base}/passengers`,
      active: pathname.includes("/passengers"),
    },
    { label: "Vehicle", to: `${base}/vehicle`, active: pathname.includes("/vehicle") },
    { label: "Help", to: `${base}/help`, active: pathname.includes("/help") },
  ] as const;

  return (
    <nav
      aria-label="Duty sections"
      className="border-b border-white/10 bg-accent/95 text-white"
    >
      <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              item.active
                ? "bg-link text-white"
                : "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <Link
          to="/"
          className="ml-auto shrink-0 rounded-full border border-driver-sky/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-driver-sky"
        >
          Home
        </Link>
      </div>
    </nav>
  );
}
