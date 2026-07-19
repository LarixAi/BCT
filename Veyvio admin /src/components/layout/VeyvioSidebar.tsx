import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Building2,
  Bus,
  CalendarDays,
  CalendarOff,
  ChevronDown,
  Clock,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileBarChart,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  PoundSterling,
  Repeat2,
  Route,
  School,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  User,
  UserCog,
  Users,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  applySidebarBadges,
  type SidebarBadgeMap,
} from "@/lib/navigation/build-sidebar-badges";
import { useSidebarNavBadges } from "./useSidebarNavBadges";

export type SidebarItem = {
  label: string;
  href?: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number | string;
  badgeTone?: "neutral" | "info" | "success" | "warning" | "danger";
  children?: Array<{
    label: string;
    href: string;
    badge?: number | string;
  }>;
};

type SidebarSection = {
  label?: string;
  items: SidebarItem[];
};

/** Static nav shell — badge counts come from live API data via useSidebarNavBadges. */
const sectionDefs: SidebarSection[] = [
  {
    label: "Command",
    items: [
      { label: "Control Centre", href: "/", icon: LayoutDashboard },
      { label: "Live Operations", href: "/live-operations", icon: Gauge },
      { label: "Exceptions", href: "/exceptions", icon: AlertTriangle },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Bookings", href: "/bookings", icon: CalendarDays },
      { label: "Dispatch", href: "/dispatch", icon: Route },
      { label: "Runs", href: "/runs", icon: Route },
      {
        label: "Trips",
        icon: Route,
        children: [
          { label: "All trips", href: "/trips" },
          { label: "Active", href: "/trips?status=active" },
          { label: "Completed", href: "/trips?status=completed" },
          { label: "Cancelled", href: "/trips?status=cancelled" },
        ],
      },
      { label: "Schedule", href: "/schedule", icon: CalendarDays },
      { label: "Recurring Transport", href: "/recurring-transport", icon: Repeat2 },
    ],
  },
  {
    label: "People & Fleet",
    items: [
      { label: "Drivers", href: "/drivers", icon: User },
      { label: "Staff", href: "/staff", icon: Users },
      { label: "Attendance", href: "/attendance", icon: Clock },
      { label: "Time Off", href: "/time-off", icon: CalendarOff },
      { label: "Vehicles", href: "/vehicles", icon: Bus },
      { label: "Depots", href: "/depots", icon: Building2 },
      { label: "Yard Operations", href: "/yard", icon: Warehouse },
      { label: "Maintenance", href: "/maintenance", icon: Wrench },
      { label: "Fleet Resources", href: "/fleet-resources", icon: Fuel },
    ],
  },
  {
    label: "Safety & Compliance",
    items: [
      { label: "Vehicle Checks", href: "/vehicle-checks", icon: ClipboardCheck },
      { label: "Vehicle Reports", href: "/vehicle-reports", icon: FileText },
      { label: "Defects", href: "/defects", icon: AlertTriangle },
      { label: "Inspections", href: "/inspections", icon: BookOpenCheck },
      { label: "Incidents", href: "/incidents", icon: Siren },
      { label: "Compliance Rules", href: "/compliance-rules", icon: ShieldCheck },
    ],
  },
  {
    label: "Customers & Commercial",
    items: [
      { label: "Customers", href: "/customers", icon: Building2 },
      { label: "Passengers", href: "/passengers", icon: Users },
      { label: "Schools", href: "/schools", icon: School },
      { label: "Contracts", href: "/contracts", icon: FileText },
      { label: "Pricing", href: "/pricing", icon: PoundSterling },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Messages", href: "/messages", icon: MessageSquare },
      { label: "Announcements", href: "/announcements", icon: Megaphone },
      { label: "Templates", href: "/templates", icon: FileText },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Reports", href: "/reports", icon: FileBarChart },
      { label: "Performance", href: "/performance", icon: Gauge },
      { label: "Audit Log", href: "/audit", icon: FileText },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Company Settings", href: "/settings/company", icon: Settings },
      { label: "Users and Roles", href: "/settings/users", icon: UserCog },
      { label: "Integrations", href: "/settings/integrations", icon: Plug },
    ],
  },
];

function withLiveBadges(badges: SidebarBadgeMap): SidebarSection[] {
  return sectionDefs.map((section) => ({
    ...section,
    items: applySidebarBadges(section.items, badges),
  }));
}

const badgeClass: Record<NonNullable<SidebarItem["badgeTone"]>, string> = {
  neutral: "bg-white/10 text-white/80",
  info: "bg-command-500/20 text-command-100",
  success: "bg-ready/20 text-ready",
  warning: "bg-attention/20 text-attention",
  danger: "bg-critical/20 text-critical",
};

function sectionKey(section: SidebarSection, index: number) {
  return section.label ?? `section-${index}`;
}

function hrefMatches(pathname: string, href?: string) {
  if (!href) return false;
  const [path, query] = href.split("?");
  const [currentPath, currentQuery = ""] = pathname.split("?");
  if (path === "/") return currentPath === "/" && (!query || currentQuery === query);
  if (query) return currentPath === path && currentQuery === query;
  return currentPath === path || currentPath.startsWith(`${path}/`);
}

function sectionContainsPath(section: SidebarSection, pathname: string) {
  return section.items.some(
    (item) =>
      hrefMatches(pathname, item.href) ||
      item.children?.some((child) => hrefMatches(pathname, child.href)),
  );
}

function defaultOpenSections(pathname: string): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  sectionDefs.forEach((section, index) => {
    const key = sectionKey(section, index);
    open[key] = sectionContainsPath(section, pathname) || key === "Command" || key === "Operations";
  });
  return open;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type SidebarProfileAction = "profile" | "settings" | "switch-company" | "sign-out";

export interface VeyvioSidebarProps {
  pathname?: string;
  onNavigate?: (href: string) => void;
  companyName?: string;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  defaultCollapsed?: boolean;
  onProfileAction?: (action: SidebarProfileAction) => void;
}

export function VeyvioSidebar({
  pathname = "/",
  onNavigate,
  companyName = "Veyvio Command",
  userName = "User",
  userRole = "Operator",
  userInitials,
  defaultCollapsed = false,
  onProfileAction,
}: VeyvioSidebarProps) {
  const liveBadges = useSidebarNavBadges();
  const sections = useMemo(() => withLiveBadges(liveBadges), [liveBadges]);

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Trips: true });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    defaultOpenSections(pathname),
  );
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setOpenSections((current) => {
      const next = { ...current };
      sectionDefs.forEach((section, index) => {
        const key = sectionKey(section, index);
        if (sectionContainsPath(section, pathname)) next[key] = true;
      });
      return next;
    });
    setOpenGroups((current) => {
      const next = { ...current };
      sectionDefs.forEach((section) => {
        section.items.forEach((item) => {
          if (item.children?.some((child) => hrefMatches(pathname, child.href))) {
            next[item.label] = true;
          }
        });
      });
      return next;
    });
  }, [pathname]);

  const searchableItems = useMemo(
    () =>
      sectionDefs.flatMap((section) =>
        section.items.flatMap((item) => [
          ...(item.href ? [{ label: item.label, href: item.href, icon: item.icon }] : []),
          ...(item.children ?? []).map((child) => ({ label: child.label, href: child.href, icon: item.icon })),
        ]),
      ),
    [],
  );

  const filteredItems = searchableItems.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const navigate = (href: string) => {
    onNavigate?.(href);
    setMobileOpen(false);
    setSearchOpen(false);
  };

  const derivedInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const initials = userInitials ?? (derivedInitials || "U");

  const isActive = (href?: string) => hrefMatches(pathname, href);

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const sidebar = (
    <aside
      className={cx(
        "relative flex h-full flex-col border-r border-white/10 bg-midnight text-white transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[304px]",
      )}
      aria-label="Primary navigation"
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <button
          type="button"
          onClick={() => {
            if (collapsed) setCollapsed(false);
            else navigate("/");
          }}
          className={cx(
            "flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-command-500",
            collapsed && "mx-auto",
          )}
          aria-label="Veyvio Command home"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-command-500 text-sm font-black text-white">
            V
          </span>
          {!collapsed && (
            <span className="text-left leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">VEYVIO</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-command-500">
                Command
              </span>
            </span>
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-xl p-2 text-white/55 hover:bg-white/10 hover:text-white"
            aria-label="Collapse navigation"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-white/55 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Search anything...</span>
            <kbd className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] text-white/50">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, sectionIndex) => {
          const key = sectionKey(section, sectionIndex);
          const sectionOpen = collapsed || openSections[key] !== false;
          const sectionActive = sectionContainsPath(section, pathname);

          return (
            <div key={key} className={cx(sectionIndex > 0 && "mt-2")}>
              {!collapsed && section.label && (
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className={cx(
                    "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                    sectionActive ? "text-command-500" : "text-white/45 hover:bg-white/5 hover:text-white/75",
                  )}
                  aria-expanded={sectionOpen}
                >
                  <span>{section.label}</span>
                  {sectionOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {(collapsed || sectionOpen) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const groupOpen = Boolean(openGroups[item.label]);
                    const childActive = item.children?.some((child) => isActive(child.href));
                    const active = isActive(item.href) || childActive;

                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          title={collapsed ? item.label : undefined}
                          onClick={() => {
                            if (collapsed) {
                              setCollapsed(false);
                              setOpenSections((current) => ({ ...current, [key]: true }));
                              if (item.children) {
                                setOpenGroups((current) => ({ ...current, [item.label]: true }));
                              } else if (item.href) {
                                navigate(item.href);
                              }
                              return;
                            }

                            if (item.children) {
                              setOpenGroups((current) => ({
                                ...current,
                                [item.label]: !current[item.label],
                              }));
                            } else if (item.href) {
                              navigate(item.href);
                            }
                          }}
                          className={cx(
                            "group flex w-full items-center rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-command-500",
                            collapsed ? "h-11 justify-center" : "min-h-10 gap-3 px-3 py-2",
                            active
                              ? "bg-command-500 text-white"
                              : "text-white/70 hover:bg-white/10 hover:text-white",
                          )}
                          aria-expanded={item.children ? groupOpen : undefined}
                        >
                          <ItemIcon
                            className={cx(
                              "h-[18px] w-[18px] shrink-0",
                              active ? "text-white" : "text-white/45",
                            )}
                            strokeWidth={1.9}
                          />

                          {!collapsed && (
                            <>
                              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                              {item.badge !== undefined && (
                                <span
                                  className={cx(
                                    "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold",
                                    badgeClass[item.badgeTone ?? "neutral"],
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                              {item.children &&
                                (groupOpen ? (
                                  <ChevronDown className="h-4 w-4 text-white/45" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-white/45" />
                                ))}
                            </>
                          )}
                        </button>

                        {!collapsed && item.children && groupOpen && (
                          <div className="ml-[21px] mt-1 border-l border-white/10 pl-3">
                            {item.children.map((child) => (
                              <button
                                type="button"
                                key={child.href}
                                onClick={() => navigate(child.href)}
                                className={cx(
                                  "flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                                  isActive(child.href)
                                    ? "bg-command-500/25 font-medium text-white"
                                    : "text-white/55 hover:bg-white/5 hover:text-white",
                                )}
                              >
                                <span>{child.label}</span>
                                {child.badge !== undefined && (
                                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                                    {child.badge}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          title={collapsed ? "Help" : undefined}
          onClick={() => navigate("/announcements")}
          className={cx(
            "mb-1 flex w-full items-center rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white",
            collapsed ? "h-11 justify-center" : "gap-3 px-3 py-2.5",
          )}
        >
          <CircleHelp className="h-[18px] w-[18px] text-white/45" />
          {!collapsed && <span>Help</span>}
        </button>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className={cx(
              "flex w-full items-center rounded-xl hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-command-500",
              collapsed ? "h-12 justify-center" : "gap-3 px-2 py-2",
            )}
            aria-expanded={profileOpen}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-command-500 text-sm font-semibold text-white">
              {initials}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-white">{userName}</span>
                  <span className="block truncate text-xs text-white/50">{userRole}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-white/45" />
              </>
            )}
          </button>

          {profileOpen && (
            <div
              className={cx(
                "absolute bottom-14 z-50 w-64 rounded-2xl border border-border bg-white p-2 text-ink shadow-xl shadow-midnight/20",
                collapsed ? "left-14" : "left-0",
              )}
            >
              <div className="border-b border-border px-3 py-3">
                <p className="truncate text-sm font-semibold text-ink">{companyName}</p>
                <p className="mt-0.5 text-xs text-muted">Current workspace</p>
              </div>
              <div className="py-1">
                {(
                  [
                    { label: "My profile", icon: User, action: "profile" as const },
                    { label: "Account settings", icon: SlidersHorizontal, action: "settings" as const },
                    { label: "Switch company", icon: Building2, action: "switch-company" as const },
                  ] as const
                ).map((action) => (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() => {
                      setProfileOpen(false);
                      onProfileAction?.(action.action);
                      if (action.action === "profile") navigate("/profile");
                      if (action.action === "settings") navigate("/settings/company");
                      if (action.action === "switch-company") navigate("/select-company");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-page hover:text-ink"
                  >
                    <action.icon className="h-4 w-4 text-muted" />
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onProfileAction?.("sign-out");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-critical hover:bg-critical/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-2 flex h-10 w-full items-center justify-center rounded-xl text-white/55 hover:bg-white/10 hover:text-white"
            aria-label="Expand navigation"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-border bg-midnight p-2.5 text-white shadow-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden h-screen lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-midnight/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[min(304px,88vw)]">
            {sidebar}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-midnight/40 px-4 pt-[10vh]">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-midnight/20">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages, vehicles, drivers and trips..."
                className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-muted"
              />
              <kbd className="rounded-md border border-border px-2 py-1 text-xs text-muted">Esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {(query ? filteredItems : searchableItems.slice(0, 8)).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={`${item.label}-${item.href}`}
                    onClick={() => navigate(item.href)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-page"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-command-50 text-command-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-border-strong" />
                  </button>
                );
              })}

              {query && filteredItems.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-muted">No matching pages found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VeyvioSidebar;
