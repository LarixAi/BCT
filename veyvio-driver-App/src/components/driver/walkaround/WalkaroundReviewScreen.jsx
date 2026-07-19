import DriverSignaturePad from "@/components/driver/walkaround/DriverSignaturePad";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import WalkaroundStepper from "@/components/driver/walkaround/WalkaroundStepper";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";

function countAnswers(items, answers) {
  let passed = 0;
  let failed = 0;
  let advisory = 0;
  let na = 0;
  for (const item of items) {
    const status = answers[item.id]?.status;
    if (status === "pass") passed += 1;
    else if (status === "fail") failed += 1;
    else if (status === "advisory") advisory += 1;
    else if (status === "na") na += 1;
  }
  return { passed, failed, advisory, na };
}

export default function WalkaroundReviewScreen({
  items = [],
  answers = {},
  vehicleLabel,
  vehicleConfirmed,
  onVehicleConfirmedChange,
  additionalDefect,
  onAdditionalDefectChange,
  declarationSigned,
  onDeclarationChange,
  declarationText,
  signatureDataUrl,
  onSignatureChange,
  error,
  saving,
  onBack,
  onEditAnswers,
  onSubmit,
}) {
  const fails = items.filter((i) => answers[i.id]?.status === "fail");
  const advisories = items.filter((i) => answers[i.id]?.status === "advisory");
  const { passed, failed, advisory, na } = countAnswers(items, answers);
  const canSubmit =
    vehicleConfirmed && declarationSigned && Boolean(signatureDataUrl) && !saving;

  const blockers = [];
  if (!vehicleConfirmed) blockers.push("Confirm this is your vehicle");
  if (!declarationSigned) blockers.push("Tick the driver declaration");
  if (!signatureDataUrl) blockers.push("Add your signature");

  return (
    <div className={`${op.pageBg} flex min-h-dvh flex-col`}>
      <DriverOperationalHeader
        title="Review & submit"
        subtitle={
          vehicleLabel
            ? `${vehicleLabel} · ${passed} pass · ${advisory} advisory · ${failed} fail · ${na} N/A`
            : `${passed} pass · ${advisory} advisory · ${failed} fail · ${na} N/A`
        }
        onBack={onBack}
      />
      <WalkaroundStepper activeStep="review" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {fails.length > 0 ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-900">Failed items ({fails.length})</p>
            <ul className="mt-2 space-y-2 text-sm text-red-900">
              {fails.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.questionTitle}</span>
                  {answers[item.id]?.note ? (
                    <p className="mt-0.5 text-xs opacity-90">{answers[item.id].note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : advisories.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-950">
              Pass with advisory — vehicle can continue, {advisories.length} item
              {advisories.length === 1 ? "" : "s"} need attention
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-900">Nil defect — all items passed or N/A</p>
          </section>
        )}

        {advisories.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="font-semibold text-amber-950">Advisories ({advisories.length})</p>
            <ul className="mt-2 space-y-2 text-sm text-amber-950">
              {advisories.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.questionTitle}</span>
                  {answers[item.id]?.note ? (
                    <p className="mt-0.5 text-xs opacity-90">{answers[item.id].note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <button
          type="button"
          onClick={onEditAnswers}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-[#1eaeae]"
        >
          Edit checklist answers
        </button>

        <label
          className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
            vehicleConfirmed ? "border-emerald-300 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={vehicleConfirmed}
            onChange={(e) => onVehicleConfirmedChange(e.target.checked)}
          />
          <span className="text-sm leading-relaxed text-foreground">
            I confirm {vehicleLabel ? `${vehicleLabel} is` : "this is"} my assigned vehicle for today&apos;s duty.
          </span>
        </label>

        <label className={`block ${op.card} p-4`}>
          <span className="text-sm font-medium text-foreground">Other defect not on checklist?</span>
          <textarea
            className={`mt-2 w-full rounded-xl p-3 text-sm min-h-[72px] ${op.input}`}
            value={additionalDefect}
            onChange={(e) => onAdditionalDefectChange(e.target.value)}
            placeholder="Optional — describe anything not covered above"
          />
        </label>

        <label
          className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
            declarationSigned ? "border-emerald-300 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={declarationSigned}
            onChange={(e) => onDeclarationChange(e.target.checked)}
          />
          <span className="text-sm leading-relaxed text-foreground">{declarationText}</span>
        </label>

        <section className={`${op.card} p-4`}>
          <p className="text-sm font-semibold text-foreground mb-2">Driver signature *</p>
          <DriverSignaturePad onChange={onSignatureChange} />
          {signatureDataUrl ? (
            <p className="text-xs text-emerald-700 mt-2 font-medium">Signature captured</p>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        ) : null}
      </div>

      <div
        className="shrink-0 border-t border-border bg-card p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: `calc(16px + ${DRIVER_SAFE_BOTTOM})` }}
      >
        {!canSubmit && blockers.length > 0 ? (
          <p className="mb-2 text-xs text-muted-foreground text-center">
            To submit: {blockers.join(" · ")}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canSubmit}
          className={`w-full h-12 rounded-full font-semibold disabled:opacity-40 ${op.primaryBtn}`}
          onClick={onSubmit}
        >
          {saving ? "Submitting…" : "Submit walkaround check"}
        </button>
      </div>
    </div>
  );
}
