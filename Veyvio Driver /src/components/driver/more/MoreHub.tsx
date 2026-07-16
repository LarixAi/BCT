import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BookOpen,
  CircleHelp,
  FileText,
  GraduationCap,
  Info,
  MessageSquare,
  RefreshCw,
  Scale,
  Settings2,
  UserRound,
} from "lucide-react";
import { buildCompliantDriverMore, buildMockDriverMore } from "@/data/mocks/driver-more";
import { buildMoreHubView } from "@/domain/more/more-settings-view";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { useDeclarationAttentionCount, useMoreStore } from "@/store/more";
import { useDriverStore } from "@/store/driver";
import { SignOutSection } from "./SignOutSection";
import { cn } from "@/lib/utils";
import type { DriverMorePayload } from "@/types/more";
import type { LucideIcon } from "lucide-react";

type MoreDemo = "normal" | "compliant";

const ROW_ICONS: Record<string, LucideIcon> = {
  Account: UserRound,
  "Driver declarations": BookOpen,
  Training: GraduationCap,
  "App settings": Settings2,
  "Offline data and sync": RefreshCw,
  "Contact Operations": MessageSquare,
  "Help centre": CircleHelp,
  "Privacy and legal": Scale,
};

export function MoreHubPage({ demo = "normal" }: { demo?: MoreDemo }) {
  const storeMore = useMoreStore(
    (state: { driverMore: DriverMorePayload }) => state.driverMore,
  );
  const declarationAttentionCount = useDeclarationAttentionCount();
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const stripActive = shouldShowVehicleCheckRequiredStrip(homeSummary);

  const driverMore = useMemo(() => {
    if (demo === "compliant") return buildCompliantDriverMore();
    return storeMore ?? buildMockDriverMore();
  }, [demo, storeMore]);

  const view = useMemo(
    () =>
      buildMoreHubView({
        more: driverMore,
        declarationAttentionCount,
        appVersion: "0.1.0",
      }),
    [driverMore, declarationAttentionCount],
  );

  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-[#F3F4F6] text-foreground">
      <header
        className={cn(
          "border-b border-border bg-white px-5 pb-5",
          stripActive ? "pt-5" : "pt-[max(1.25rem,env(safe-area-inset-top,0px))]",
        )}
      >        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-[34px] font-extrabold tracking-[-0.045em]">More</h1>
          <Link
            to="/more/support"
            aria-label="Help"
            className="grid size-12 place-items-center rounded-full bg-[#F3F4F6] text-accent"
          >
            <CircleHelp className="size-6" strokeWidth={2} />
          </Link>
        </div>

        <Link
          to="/more/account"
          search={{ demo: "normal" }}
          className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-[15px] text-left"
        >
          <span className="grid size-[72px] place-items-center rounded-full bg-accent text-[22px] font-extrabold text-white">
            {view.initials}
          </span>
          <span className="min-w-0">
            <h2 className="font-display text-[23px] font-extrabold tracking-tight">
              {view.displayName}
            </h2>
            <p className="mt-1.5 text-[13px] leading-snug text-muted">
              {view.subtitle}
              <br />
              {view.companyLine}
            </p>
          </span>
          <span className="text-3xl font-light text-[#9CA3AF]" aria-hidden>
            ›
          </span>
        </Link>

        <div className="mt-[22px] grid grid-cols-3 gap-2.5">
          {view.quickActions.map((action) => {
            const Icon =
              action.id === "documents"
                ? FileText
                : action.id === "sync"
                  ? RefreshCw
                  : MessageSquare;
            return (
              <Link
                key={action.id}
                to={action.href}
                className="min-h-[100px] rounded-2xl bg-[#F3F4F6] p-[13px_10px] text-left"
              >
                <span className="mb-2.5 grid size-[38px] place-items-center rounded-full bg-white text-link">
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <strong className="block text-[13px] font-bold">{action.label}</strong>
                <span
                  className={cn(
                    "mt-1 block text-[11px] leading-tight text-muted",
                    action.tone === "warn" && "text-warn",
                    action.tone === "ok" && "text-ok",
                  )}
                >
                  {action.detail}
                </span>
              </Link>
            );
          })}
        </div>
      </header>

      <div className="px-0 pb-8 pt-[18px]">
        {view.sections.map((section) => (
          <section key={section.id} className="mb-4">
            <p className="mb-2 px-5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
              {section.title}
            </p>
            <nav className="divide-y divide-border border-y border-border bg-white">
              {section.items.map((item) => {
                const Icon = ROW_ICONS[item.label] ?? Info;
                const valueIsText = typeof item.badge === "string";
                return (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    className="grid min-h-[72px] w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 px-5 py-3 text-left active:bg-[#FAFBFC]"
                  >
                    <span className="grid size-[42px] place-items-center rounded-full bg-[#F3F4F6] text-accent">
                      <Icon className="size-[21px]" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-[15px] font-bold">{item.label}</strong>
                      {item.description ? (
                        <small className="mt-1 block text-xs leading-snug text-muted">
                          {item.description}
                        </small>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {typeof item.badge === "number" && item.badge > 0 ? (
                        <span className="grid min-w-[23px] place-items-center rounded-full bg-[#FFF1DB] px-1.5 py-0.5 text-[11px] font-extrabold text-warn">
                          {item.badge}
                        </span>
                      ) : null}
                      {valueIsText ? <span>{item.badge}</span> : null}
                      <span className="text-3xl font-light text-[#9CA3AF]" aria-hidden>
                        ›
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}

        <div className="px-5">
          <SignOutSection variant="hub" />
          <p className="mt-3.5 text-center text-[11px] text-[#9CA3AF]">{view.versionLabel}</p>
        </div>
      </div>
    </div>
  );
}
