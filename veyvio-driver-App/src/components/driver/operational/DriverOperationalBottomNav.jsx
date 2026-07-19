import { NavLink, useLocation } from "react-router-dom";
import { ClipboardCheck, Home, MessageSquare, MoreHorizontal, Route } from "lucide-react";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { op } from "@/lib/driver-operational-theme";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { useDriverUnreadNotificationCount } from "@/hooks/useDriverUnreadNotificationCount";

const tabs = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/jobs", label: "Trips", Icon: Route },
  { to: "/check", label: "Checks", Icon: ClipboardCheck, matchPrefix: "/check" },
  {
    to: "/messages",
    label: "Messages",
    Icon: MessageSquare,
    showUnreadBadge: true,
    matchPrefixes: ["/messages", "/notifications", "/threads", "/contact"],
  },
  { to: "/more", label: "More", Icon: MoreHorizontal },
];

function tabIsActive(pathname, { to, end, matchPrefix, matchPrefixes }) {
  if (matchPrefixes?.length) {
    return matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  if (matchPrefix) {
    return pathname === to || pathname.startsWith(`${matchPrefix}/`);
  }
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function TabContent({ label, Icon, active, badge }) {
  return (
    <>
      <div className="relative">
        <Icon className={`w-6 h-6 ${active ? op.limeAccent : op.textMuted}`} strokeWidth={active ? 2.25 : 2} />
        {badge ? (
          <span
            className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e5003c] text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-card"
            aria-label={`${badge} unread alerts`}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-medium ${active ? op.limeAccent : op.textMuted}`}>{label}</span>
      {active ? <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--ridova-lime)]" aria-hidden="true" /> : null}
    </>
  );
}

export default function DriverOperationalBottomNav() {
  const { pathname } = useLocation();
  const { session } = useDriverSupabaseAuth();
  const unread = useDriverUnreadNotificationCount(session?.userId);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-30 ${op.navBar}`}
      style={{ paddingBottom: DRIVER_SAFE_BOTTOM }}
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around px-1 pt-1.5 pb-1">
        {tabs.map((tab) => {
          const badge = tab.showUnreadBadge && unread > 0 ? unread : null;
          const active = tabIsActive(pathname, tab);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 rounded-xl transition-colors"
            >
              <TabContent label={tab.label} Icon={tab.Icon} active={active} badge={badge} />
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
