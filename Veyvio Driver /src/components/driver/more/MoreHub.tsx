import { buildCompliantDriverMore, buildMockDriverMore } from "@/data/mocks/driver-more";
import { useMoreStore } from "@/store/more";
import { useMemo } from "react";
import { DriverIdentityCard } from "./DriverIdentityCard";
import { ComplianceAttentionCard } from "./ComplianceAttentionCard";
import { MoreSection, MoreRow } from "./MoreLayout";
import { SignOutSection } from "./SignOutSection";
import { buildMoreMenuSections } from "@/domain/more/more-helpers";
import { useDeclarationAttentionCount } from "@/store/more";

type MoreDemo = "normal" | "compliant";

export function MoreHubPage({ demo = "normal" }: { demo?: MoreDemo }) {
  const storeMore = useMoreStore((s) => s.driverMore);

  const driverMore = useMemo(() => {
    if (demo === "compliant") return buildCompliantDriverMore();
    return storeMore;
  }, [demo, storeMore]);

  const declarationAttentionCount = useDeclarationAttentionCount();

  const sections = buildMoreMenuSections(
    driverMore.complianceAlerts.length,
    declarationAttentionCount,
  );

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">More</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">More</h1>
        <p className="mt-0.5 text-sm text-muted">{driverMore.identity.companyName}</p>
      </header>

      <DriverIdentityCard identity={driverMore.identity} />
      <ComplianceAttentionCard alerts={driverMore.complianceAlerts} />

      {sections.map((section) => (
        <MoreSection key={section.id} title={section.title}>
          {section.items.map((item) => (
            <MoreRow key={item.href + item.label} label={item.label} href={item.href} badge={item.badge} />
          ))}
        </MoreSection>
      ))}

      <SignOutSection />
    </div>
  );
}
