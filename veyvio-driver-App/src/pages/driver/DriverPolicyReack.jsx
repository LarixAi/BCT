import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import DriverPolicyAcceptRow from "@/components/driver/policies/DriverPolicyAcceptRow";
import DriverPolicyViewer from "@/components/driver/policies/DriverPolicyViewer";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import { op } from "@/lib/driver-operational-theme";
import { acceptPolicyReacknowledgements, getOutdatedPoliciesForDriver } from "@/services/onboarding.service";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";

function PolicyChecklist({ policies, viewed, accepted, onRead, onAccept }) {
  return (
    <section>
      <DriverSectionTitle>Policies to accept</DriverSectionTitle>
      <div className={`${op.listCard} divide-y divide-border`}>
        {policies.map((policy) => (
          <DriverPolicyAcceptRow
            key={policy.policyKey}
            policy={policy}
            viewed={viewed}
            accepted={accepted}
            onRead={onRead}
            onAccept={onAccept}
          />
        ))}
      </div>
    </section>
  );
}

export default function DriverPolicyReack({ driver, organisationId, onComplete, blocking = false }) {
  const [policies, setPolicies] = useState([]);
  const [viewed, setViewed] = useState(() => new Set());
  const [accepted, setAccepted] = useState(() => new Set());
  const [openPolicyKey, setOpenPolicyKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    void getOutdatedPoliciesForDriver(driver).then((outdated) => {
      setPolicies(outdated);
      setLoading(false);
      if (blocking && outdated.length === 0) {
        onComplete?.();
      }
    });
  }, [driver, blocking, onComplete]);

  const markViewed = (key) => {
    setViewed((prev) => new Set(prev).add(key));
  };

  const toggleAccept = (key, checked) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const allAccepted = policies.length > 0 && policies.every((p) => accepted.has(p.policyKey));

  const handleSubmit = async () => {
    if (!allAccepted) return;
    setSubmitting(true);
    setError(null);
    try {
      await acceptPolicyReacknowledgements(
        driver.id,
        organisationId,
        policies.map((p) => p.policyKey),
      );
      onComplete?.();
    } catch (e) {
      setError(e?.message || friendlyOnboardingError(e, "save"));
    } finally {
      setSubmitting(false);
    }
  };

  const infoCard = (
    <div className="driver-auth-card p-4 text-sm leading-relaxed text-muted-foreground">
      Open and read each policy using the <strong className="font-medium text-foreground">Read</strong> button. You
      can accept a policy only after you have read it.
    </div>
  );

  const submitButton = blocking ? (
    <DriverAuthPrimaryButton type="button" disabled={!allAccepted || submitting} onClick={() => void handleSubmit()}>
      {submitting ? "Saving…" : "Confirm policies"}
    </DriverAuthPrimaryButton>
  ) : (
    <button
      type="button"
      className={`flex h-11 w-full items-center justify-center gap-2 ${op.primaryBtn}`}
      disabled={!allAccepted || submitting}
      onClick={() => void handleSubmit()}
    >
      <Shield className="h-4 w-4" aria-hidden />
      {submitting ? "Saving…" : "Confirm policies"}
    </button>
  );

  const checklist = (
    <>
      <PolicyChecklist
        policies={policies}
        viewed={viewed}
        accepted={accepted}
        onRead={setOpenPolicyKey}
        onAccept={toggleAccept}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {submitButton}
    </>
  );

  const viewer =
    openPolicyKey != null ? (
      <DriverPolicyViewer
        policyKey={openPolicyKey}
        onClose={() => setOpenPolicyKey(null)}
        onMarkRead={markViewed}
      />
    ) : null;

  if (!loading && policies.length === 0) {
    const emptyBody = (
      <div className="driver-auth-card p-4 text-sm leading-relaxed text-muted-foreground">
        All required policies are up to date. You can return to the app.
      </div>
    );

    if (blocking) {
      return (
        <DriverMobileAuthLayout title="Policy update" subtitle="No policy updates required">
          {emptyBody}
        </DriverMobileAuthLayout>
      );
    }

    return (
      <div className={op.pageBg}>
        <DriverOperationalHeader title="Policies" subtitle="No policy updates required" backTo="/profile" />
        <div className="px-4 pb-8">{emptyBody}</div>
      </div>
    );
  }

  if (loading) {
    if (blocking) {
      return (
        <DriverMobileAuthLayout title="Policy update" subtitle="Loading policy updates…">
          <DriverPageLoader label="Loading policies…" />
        </DriverMobileAuthLayout>
      );
    }

    return (
      <div className={op.pageBg}>
        <DriverOperationalHeader title="Policies" subtitle="Loading policy updates…" backTo="/profile" />
        <DriverPageLoader label="Loading policies…" />
      </div>
    );
  }

  if (blocking) {
    return (
      <>
        <DriverMobileAuthLayout
          title="Policy update"
          subtitle="Acknowledge updated policies to receive jobs"
          footer="You must read and accept all policies before continuing to the driver app."
        >
          {infoCard}
          <div className="mt-6 space-y-6">{checklist}</div>
        </DriverMobileAuthLayout>
        {viewer}
      </>
    );
  }

  return (
    <>
      <div className={op.pageBg}>
        <DriverOperationalHeader
          title="Policy update"
          subtitle="Acknowledge updated policies to receive jobs"
          backTo="/profile"
        />

        <div className="space-y-6 px-4 pb-8">
          {infoCard}
          {checklist}
        </div>
      </div>
      {viewer}
    </>
  );
}
