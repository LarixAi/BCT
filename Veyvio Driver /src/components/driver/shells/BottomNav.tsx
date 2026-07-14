import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, ClipboardCheck, MessageSquare, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import {
  isChecksNavActive,
  isHomeRoute,
  isMessagesNavActive,
  isJourneyWizardRoute,
  isMoreNavActive,
  isNavRoute,
  isTripsNavActive,
} from "@/domain/driver/nav-routes";
import { useUnreadMessageCount } from "@/store/messages";

/**
 * Always the same five destinations — never strand the driver on a duty-only bottom bar.
 * Duty hub / passengers / vehicle live in DutySubnav under the chrome header.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadMessages = useUnreadMessageCount();

  if (isJourneyWizardRoute(pathname) || isNavRoute(pathname)) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-accent text-white"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1.5">
        <NavTab to="/" label="Home" icon={<Home className="size-5" />} active={isHomeRoute(pathname)} />
        <NavTab
          to="/trips"
          label="Trips"
          icon={<Map className="size-5" />}
          active={isTripsNavActive(pathname)}
        />
        <NavTab
          to="/checks"
          label="Checks"
          icon={<ClipboardCheck className="size-5" />}
          active={isChecksNavActive(pathname)}
        />
        <NavTab
          to="/messages"
          label="Messages"
          icon={<MessageSquare className="size-5" />}
          active={isMessagesNavActive(pathname)}
          badge={unreadMessages}
        />
        <NavTab
          to="/more"
          label="More"
          icon={<MoreHorizontal className="size-5" />}
          active={isMoreNavActive(pathname)}
        />
      </div>
    </nav>
  );
}

function NavTab({
  to,
  label,
  icon,
  active,
  badge = 0,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`relative flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
        active ? "bg-link/20 text-link" : "text-white/60 hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute left-1/2 top-0.5 h-1 w-5 -translate-x-1/2 rounded-full bg-link" aria-hidden />
      ) : null}
      <span className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-ok px-1 text-[8px] font-bold text-accent">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}
