import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronRight, LocateFixed, ShieldCheck, User } from "lucide-react";
import type { DriverHomeSummary } from "@/types/home";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { buildCleanHomeView, statusStripClass } from "@/domain/home/clean-home-view";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { DeviceReadinessBanner } from "@/features/driver-focus/DeviceReadinessBanner";
import { AppOperationalBanners } from "@/components/driver/shells/AppOperationalBanners";
import { IncidentHomePanel } from "@/components/driver/home/IncidentHomePanel";
import { JourneyMap } from "@/components/driver/journey/JourneyMap";
import { JourneyMapPlaceholder } from "@/components/driver/journey/JourneyMapPlaceholder";
import { useUnreadMessageCount } from "@/store/messages";
import { useDriverStore } from "@/store/driver";
import { cn } from "@/lib/utils";

export function CleanHomeScreen({ summary }: { summary: DriverHomeSummary }) {
  const view = buildCleanHomeView(summary);
  const unread = useUnreadMessageCount();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const dutyId =
    summary.activeTrip?.dutyId ?? summary.nextTrip?.dutyId ?? summary.duty.dutyId;
  const vehicleCheckStripGlobal = shouldShowVehicleCheckRequiredStrip(summary);

  useEffect(() => {
    if (dutyId) void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-[#F4F6F8] text-foreground">
      {/* Status strip — AppShell owns the vehicle-check strip so it persists site-wide */}
      {!vehicleCheckStripGlobal ? (
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 px-5 text-left text-white",
            "min-h-[3.5rem] pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]",
            statusStripClass(view.tone),
          )}
          onClick={() => {
            /* Glanceable status — detail lives on duty */
          }}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="size-2.5 shrink-0 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.2)]" />
            <span className="truncate text-sm font-bold tracking-tight">{view.statusLabel}</span>
          </span>
          <ChevronRight className="size-7 shrink-0 opacity-90" strokeWidth={1.5} />
        </button>
      ) : null}

      {/* 2. Brand + utilities + operational headline (prototype top-area) */}
      <section className="bg-white px-5 pb-5 pt-4">
        <div className="mb-6 flex items-center justify-between gap-3">
          <BrandWordmark
            size="chrome"
            layout="stacked"
            theme="on-light"
            align="left"
            className="min-w-0"
          />
          <div className="flex shrink-0 gap-2.5">
            <Link
              to="/more/support"
              aria-label="Safety and Operations"
              className="grid size-12 place-items-center rounded-full bg-[#F2F4F7] text-accent"
            >
              <ShieldCheck className="size-6" strokeWidth={2} />
            </Link>
            <Link
              to="/more"
              aria-label="Profile and settings"
              className="relative grid size-12 place-items-center rounded-full bg-[#F2F4F7] text-accent"
            >
              <User className="size-6" strokeWidth={2} />
              {summary.driver.unreadNotifications > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-full border-2 border-white bg-link px-1 text-[10px] font-extrabold text-white">
                  {summary.driver.unreadNotifications > 9
                    ? "9+"
                    : summary.driver.unreadNotifications}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <h1 className="font-display text-[clamp(2rem,7vw,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-accent">
          {view.headline}
        </h1>
        <p className="mt-2.5 text-base leading-snug text-muted">{view.subhead}</p>
      </section>

      {/* Exceptions after the hero — never above the status strip */}
      <div className="space-y-3 px-5 pt-4 empty:hidden">
        <AppOperationalBanners flush />
        <DeviceReadinessBanner />
      </div>

      <section className="space-y-5 px-5 pb-6 pt-4">
        {/* Real Leaflet route preview — same stack as in-trip nav */}
        <div
          className="relative h-[min(52vw,290px)] overflow-hidden rounded-[22px] border border-border/70 bg-[#E9EEF4] shadow-[inset_0_0_0_1px_rgba(16,24,40,0.06)]"
          aria-label={view.mapLabel}
        >
          {dutyId ? (
            <JourneyMap
              dutyId={dutyId}
              preview
              hideStatusOverlay
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <JourneyMapPlaceholder className="absolute inset-0 h-full w-full" />
          )}
          {dutyId ? (
            <Link
              to="/trips"
              search={{ demo: "normal", dutyId }}
              className="absolute inset-0 z-[450]"
              aria-label={`${view.mapLabel} — open duties`}
            />
          ) : null}
          <div className="pointer-events-none absolute left-3.5 top-3.5 z-[500] inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2.5 text-[13px] font-bold shadow-md">
            <span className="size-2 rounded-full bg-ok" />
            {view.mapLabel}
          </div>
          {dutyId ? (
            <Link
              to="/trips"
              search={{ demo: "normal", dutyId }}
              aria-label="Open duties workspace"
              className="absolute bottom-3.5 right-3.5 z-[500] grid size-11 place-items-center rounded-2xl bg-white text-link shadow-md"
            >
              <LocateFixed className="size-5" />
            </Link>
          ) : null}
        </div>

        {/* One primary action */}
        <article className="rounded-[22px] border border-border bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.13em] text-link">
            {view.eyebrow}
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-tight">
            {view.primaryTitle}
          </h2>
          <p className="mt-2 text-sm leading-snug text-muted">{view.primaryCopy}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border-t border-border pt-3">
              <span className="block text-xs text-muted">{view.meta1.label}</span>
              <span className="mt-1 block text-sm font-bold">{view.meta1.value}</span>
            </div>
            <div className="border-t border-border pt-3">
              <span className="block text-xs text-muted">{view.meta2.label}</span>
              <span className="mt-1 block text-sm font-bold tabular-nums">{view.meta2.value}</span>
            </div>
          </div>
          {view.primaryHref ? (
            view.primaryHref.startsWith("/trips") ? (
              <Link
                to="/trips"
                search={{
                  demo: "normal",
                  dutyId: new URLSearchParams(view.primaryHref.split("?")[1] ?? "").get("dutyId") ?? undefined,
                }}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-accent text-sm font-extrabold uppercase tracking-widest text-white"
              >
                {view.primaryButton}
              </Link>
            ) : (
              <Link
                to={view.primaryHref}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-accent text-sm font-extrabold uppercase tracking-widest text-white"
              >
                {view.primaryButton}
              </Link>
            )
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-accent/50 text-sm font-extrabold uppercase tracking-widest text-white"
            >
              {view.primaryButton}
            </button>
          )}
        </article>

        {/* Incomplete incidents only — report actions stay available under Today */}
        <IncidentHomePanel variant="home-exceptions" />

        {/* Flat overview */}
        <div>
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
            Today
          </p>
          <div className="overflow-hidden border-t border-border bg-white">
            <OverviewRow
              to="/checks"
              title="Vehicle readiness"
              subtitle={view.vehicleSubtitle}
              tone={view.vehicleTone}
              icon="shield"
            />
            <OverviewRow
              to="/messages"
              title="Messages"
              subtitle={
                unread > 0
                  ? `${unread} unread from Operations`
                  : "No unread messages"
              }
              value={unread > 0 ? String(unread) : undefined}
              icon="message"
            />
            <OverviewRow
              to={summary.requiredActions[0]?.href ?? (dutyId ? `/duties/${dutyId}` : "/trips")}
              title="Required actions"
              subtitle={view.actionsSubtitle}
              value={view.actionsCount > 0 ? String(view.actionsCount) : "0"}
              tone={view.actionsTone}
              icon="alert"
            />
            <OverviewRow
              to="/trips"
              title="Today’s schedule"
              subtitle={view.scheduleSubtitle}
              icon="calendar"
            />
            <OverviewRow
              to="/incidents/report"
              title="Report incident"
              subtitle="When safe — ops stays notified"
              tone="warn"
              icon="alert"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewRow({
  to,
  title,
  subtitle,
  value,
  tone = "neutral",
  icon,
}: {
  to: string;
  title: string;
  subtitle: string;
  value?: string;
  tone?: "ready" | "warn" | "neutral";
  icon: "shield" | "message" | "alert" | "calendar";
}) {
  return (
    <Link
      to={to}
      className="grid min-h-[78px] w-full grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-transparent px-1 py-3.5 text-left active:bg-[#FAFBFC]"
    >
      <span
        className={cn(
          "grid size-[42px] place-items-center rounded-full",
          tone === "ready" && "bg-[#ECFDF3] text-ok",
          tone === "warn" && "bg-[#FFF7ED] text-warn",
          tone === "neutral" && "bg-driver-blue-soft text-link",
        )}
      >
        {icon === "shield" && <ShieldCheck className="size-5" />}
        {icon === "message" && (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 5h16v11H8l-4 4V5Z" />
          </svg>
        )}
        {icon === "alert" && (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3 2.8 20h18.4L12 3Z" />
            <path d="M12 9v5M12 17.5h.01" />
          </svg>
        )}
        {icon === "calendar" && (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <p className="text-[15px] font-bold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{subtitle}</p>
      </span>
      <span className="flex items-center gap-1 text-[13px] text-muted">
        {value ?? null}
        <ChevronRight className="size-5 text-[#98A2B3]" strokeWidth={1.5} />
      </span>
    </Link>
  );
}
