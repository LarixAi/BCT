import { useEffect, useState } from "react";
import { Bus, Radio } from "lucide-react";
import DriverActionCard from "@/components/driver/operational/DriverActionCard";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import { op } from "@/lib/driver-operational-theme";
import { evaluateContractTransportReadiness } from "@/services/driver-contract-transport.service";
import { evaluatePcoDispatchReadiness, loadPcoComplianceStatus } from "@/services/driver-phv.service";

function statusSubtitle({ ready, pending, detail }) {
  if (ready) return "Ready";
  if (pending) return "Awaiting review";
  return detail;
}

export default function SettingsWorkSetupCards({ driver, onSelectTab }) {
  const [loading, setLoading] = useState(true);
  const [phv, setPhv] = useState(null);
  const [pco, setPco] = useState(null);
  const [pcoReady, setPcoReady] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      evaluateContractTransportReadiness(driver),
      loadPcoComplianceStatus().catch(() => null),
      evaluatePcoDispatchReadiness(driver).catch(() => null),
    ]).then(([phvReady, pcoStatus, pcoDispatch]) => {
      if (cancelled) return;
      setPhv(phvReady);
      setPco(pcoStatus);
      setPcoReady(pcoDispatch);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [driver]);

  if (loading) {
    return (
      <section>
        <DriverSectionTitle>Work setup</DriverSectionTitle>
        <DriverPageLoader label="Checking work setup…" />
      </section>
    );
  }

  const pcoSubmission = pco?.submission;
  const pcoPending = pcoSubmission?.status === "submitted";
  const pcoIsReady = Boolean(pcoReady?.ready);

  const cards = [
    {
      id: "phv",
      icon: Bus,
      title: "PHV routes",
      subtitle: statusSubtitle({
        ready: phv?.ready,
        pending: false,
        detail: phv?.blockers?.[0] ?? "School, airport & scheduled fleet work",
      }),
    },
    {
      id: "pco",
      icon: Radio,
      title: "PCO trips",
      subtitle: statusSubtitle({
        ready: pcoIsReady,
        pending: pcoPending,
        detail: pco?.missing_items?.[0] ?? "Private hire with your own vehicle",
      }),
    },
  ];

  return (
    <section>
      <DriverSectionTitle>Work setup</DriverSectionTitle>
      <div className={op.listCard}>
        {cards.map((card) => (
          <DriverActionCard
            key={card.id}
            icon={card.icon}
            title={card.title}
            subtitle={card.subtitle}
            inList
            compact
            onClick={() => onSelectTab(card.id)}
          />
        ))}
      </div>
    </section>
  );
}
