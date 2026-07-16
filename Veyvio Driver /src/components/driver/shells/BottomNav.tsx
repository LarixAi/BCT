import { Link, useRouterState } from "@tanstack/react-router";
import { useUnreadMessageCount } from "@/store/messages";
import { DRIVER_NAVIGATION_ITEMS } from "@/domain/driver/navigation-items";
import {
  getDriverPrimaryTab,
  shouldShowDriverBottomNav,
} from "@/domain/driver/navigation-policy";
import { cn } from "@/lib/utils";

/**
 * Five-tab Driver hub navigation.
 * Visibility is hub-only — see `shouldShowDriverBottomNav`.
 *
 * `docked` — sit in normal document flow (workspace hubs already flex a
 * reserved row). Default is fixed overlay for padded list/home shells.
 */
export function BottomNav({ docked = false }: { docked?: boolean } = {}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const unreadMessages = useUnreadMessageCount();

  if (!shouldShowDriverBottomNav(pathname)) {
    return null;
  }

  const activeTab = getDriverPrimaryTab(pathname);

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        docked
          ? "relative z-50 shrink-0"
          : "fixed inset-x-0 bottom-0 z-50",
        "border-t border-border/80 bg-white/95",
        "shadow-[0_-10px_30px_rgba(11,21,38,0.07)] backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5",
          "pb-[max(env(safe-area-inset-bottom),0.65rem)]",
        )}
      >
        {DRIVER_NAVIGATION_ITEMS.map((item) => {
          const active = activeTab === item.id;
          const badge = item.id === "messages" ? unreadMessages : 0;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[60px] min-w-0 flex-col",
                "items-center justify-center gap-1 rounded-xl px-1",
                "text-[11px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-link focus-visible:ring-offset-2",
                active ? "text-link" : "text-muted hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-xl",
                  "transition-colors",
                  active && "bg-driver-blue-soft",
                )}
              >
                <Icon className="size-[22px]" aria-hidden />
                {badge > 0 ? (
                  <span
                    className={cn(
                      "absolute -right-2 -top-1 grid min-w-5",
                      "h-5 place-items-center rounded-full",
                      "border-2 border-white bg-link px-1",
                      "text-[10px] font-extrabold text-white",
                    )}
                    aria-label={`${badge} unread messages`}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated use BottomNav — same component */
export const DriverBottomNav = BottomNav;
