import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Building2,
  FileText,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { buildCompliantDriverMore, buildMockDriverMore } from "@/data/mocks/driver-more";
import { buildAccountPageView } from "@/domain/more/more-settings-view";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { useDeclarationAttentionCount, useMoreStore } from "@/store/more";
import { useDriverStore } from "@/store/driver";
import { cn } from "@/lib/utils";
import type { DriverMorePayload } from "@/types/more";
import type { LucideIcon } from "lucide-react";

type MoreDemo = "normal" | "compliant";

const ICONS: Record<string, LucideIcon> = {
  "Personal information": UserRound,
  "Company and depot": Building2,
  "Licences and documents": FileText,
  "Training and qualifications": GraduationCap,
  "Driver declarations": ShieldCheck,
  Security: LockKeyhole,
  "Privacy and data": ShieldCheck,
};

/**
 * Focused Account page — black header, identity, compliance, security.
 * No bottom navigation (AppShell focusedLight).
 */
export function AccountPage({ demo = "normal" }: { demo?: MoreDemo }) {
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
      buildAccountPageView({
        more: driverMore,
        declarationAttentionCount,
      }),
    [driverMore, declarationAttentionCount],
  );

  return (
    <div className="min-h-dvh bg-[#F4F4F4] text-foreground">
      <header
        className={cn(
          "grid h-[92px] grid-cols-[54px_1fr_54px] items-end bg-[#080808] px-3 pb-4 text-white",
          stripActive ? "pt-3" : "pt-safe",
        )}
      >
        <Link
          to="/more"
          search={{ demo: "normal" }}
          aria-label="Back to More"
          className="grid size-[46px] place-items-center rounded-full text-[32px] leading-none"
        >
          ‹
        </Link>
        <h1 className="text-center text-[21px] font-bold">Account</h1>
        <span />
      </header>

      <main>
        <Link
          to="/more/profile"
          className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3.5 border-b-8 border-[#F4F4F4] bg-white px-5 py-[22px]"
        >
          <span className="grid size-[62px] place-items-center rounded-full bg-accent text-xl font-extrabold text-white">
            {view.initials}
          </span>
          <span className="min-w-0">
            <strong className="block text-[19px] font-bold">{view.displayName}</strong>
            <small className="mt-1 block text-xs text-muted">{view.driverIdLabel}</small>
          </span>
          <span className="text-3xl font-light text-[#9CA3AF]" aria-hidden>
            ›
          </span>
        </Link>

        {view.groups.map((group) => (
          <nav
            key={group.id}
            className="mb-2 divide-y divide-[#ECECEC] border-y border-[#E5E5E5] bg-white"
          >
            {group.items.map((item) => {
              const Icon = ICONS[item.label] ?? UserRound;
              return (
                <Link
                  key={item.href + item.label}
                  to={item.href}
                  className="grid min-h-[76px] w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left active:bg-[#FAFBFC]"
                >
                  <span className="grid size-[42px] place-items-center rounded-full bg-[#F4F4F4] text-accent">
                    <Icon className="size-[22px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[15px] font-semibold">{item.label}</strong>
                    <small className="mt-1 block text-xs text-muted">{item.description}</small>
                  </span>
                  <span className="flex items-center gap-2">
                    {item.status ? (
                      <small
                        className={cn(
                          "text-[11px] font-extrabold",
                          item.warning ? "text-warn" : "text-ok",
                        )}
                      >
                        {item.status}
                      </small>
                    ) : null}
                    <span className="text-3xl font-light text-[#9CA3AF]" aria-hidden>
                      ›
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        ))}

        <p className="bg-white px-5 py-3.5 text-xs leading-relaxed text-muted">{view.note}</p>
      </main>
    </div>
  );
}
