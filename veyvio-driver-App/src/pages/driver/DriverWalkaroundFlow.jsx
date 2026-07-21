import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import {
  CHECK_TYPES,
  declarationForCheckType,
  discardWalkaroundDraft,
  flushPendingWalkaroundSubmissions,
  getPendingSyncCount,
  loadWalkaroundSession,
  persistWalkaroundDraft,
  previewWalkaroundSessionFromBootstrap,
  submitWalkaroundCheck,
  uploadWalkaroundPhoto,
} from "@/services/vehicle-check.service";
import { signOnDutyAfterVehicleCheck } from "@/services/command-driver-ops.service";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { getSectionLabel } from "@/lib/walkaround-template-engine";
import { getEndOfDutySectionLabel } from "@/lib/end-of-duty-template-engine";
import { isChecklistFullyAnswered, normalizeChecklistProgress } from "@/lib/walkaround-progress";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import WalkaroundStepper from "@/components/driver/walkaround/WalkaroundStepper";
import WalkaroundFailSheet from "@/components/driver/walkaround/WalkaroundFailSheet";
import WalkaroundAdvisorySheet from "@/components/driver/walkaround/WalkaroundAdvisorySheet";
import WalkaroundResultScreen from "@/components/driver/walkaround/WalkaroundResultScreen";
import WalkaroundReviewScreen from "@/components/driver/walkaround/WalkaroundReviewScreen";
import WalkaroundVehicleConfirm from "@/components/driver/walkaround/WalkaroundVehicleConfirm";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { useDriverChrome } from "@/lib/driverChromeContext";
import { compressImageToDataUrl } from "@/lib/walkaround-image";
import { Loader2, MinusCircle, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";

function applyDraftToFlow(data, setters) {
  const checklistItems = data.checklist?.items ?? [];
  if (!data.draft?.answers) {
    setters.setOdometer(String(data.vehicle?.odometer ?? ""));
    return { goReview: false };
  }

  const normalized = normalizeChecklistProgress(
    checklistItems,
    data.draft.answers,
    data.draft.currentIndex ?? 0,
  );
  setters.setAnswers(data.draft.answers);
  setters.setOdometer(String(data.draft.odometer ?? data.vehicle?.odometer ?? ""));
  setters.setFuelLevel(data.draft.fuelLevel ?? "");
  setters.setCurrentIndex(normalized.currentIndex);
  setters.setCheckType(data.draft.checkType ?? CHECK_TYPES.daily.id);
  if (data.draft.startedAt) setters.setStartedAt(data.draft.startedAt);
  if (data.draft.vehicleConfirmed === true || data.draft.startedAt) {
    setters.setVehicleConfirmed(true);
  } else if (data.draft.vehicleConfirmed === false) {
    setters.setVehicleConfirmed(false);
  }
  setters.setSyncHint("Draft restored from this device");
  return { goReview: Boolean(normalized.allComplete || data.draft.allItemsAnswered) };
}

export default function DriverWalkaroundFlow({ driver }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const queryCheckType = searchParams.get("checkType");
  const { setHideBottomNav } = useDriverChrome();
  const { session: authSession, bootstrap, refresh: refreshAuth } = useDriverSupabaseAuth();
  const [checkType, setCheckType] = useState(() => {
    if (queryCheckType && Object.values(CHECK_TYPES).some((t) => t.id === queryCheckType)) {
      return queryCheckType;
    }
    return CHECK_TYPES.daily.id;
  });
  const preview = previewWalkaroundSessionFromBootstrap(driver, bootstrap, { checkType });
  const [step, setStep] = useState(() => (preview?.ok ? "confirm" : "loading"));
  const [session, setSession] = useState(() => preview);
  const [error, setError] = useState("");
  const [vehicleConfirmed, setVehicleConfirmed] = useState(false);
  const [odometer, setOdometer] = useState(() => String(preview?.vehicle?.odometer ?? ""));
  const [odometerPhotoFile, setOdometerPhotoFile] = useState(null);
  const [odometerPhotoPreview, setOdometerPhotoPreview] = useState(null);
  const [odometerPhotoDataUrl, setOdometerPhotoDataUrl] = useState(null);
  const [fuelLevel, setFuelLevel] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [failItem, setFailItem] = useState(null);
  const [advisoryItem, setAdvisoryItem] = useState(null);
  const [additionalDefect, setAdditionalDefect] = useState("");
  const [declarationSigned, setDeclarationSigned] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [gps, setGps] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [syncHint, setSyncHint] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);

  const flowInProgressRef = useRef(false);
  const submittedRef = useRef(false);
  const suppressAutoReviewRef = useRef(false);

  useEffect(() => {
    void flushPendingWalkaroundSubmissions(driver);
    setPendingSync(getPendingSyncCount(driver.id));
  }, [driver]);

  useEffect(() => {
    setHideBottomNav(true);
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  useEffect(() => {
    let cancelled = false;
    const setters = {
      setAnswers,
      setOdometer,
      setFuelLevel,
      setCurrentIndex,
      setCheckType,
      setStartedAt,
      setVehicleConfirmed,
      setSyncHint,
    };

    // Paint from bootstrap cache while network enrichment runs.
    if (!submittedRef.current && !flowInProgressRef.current) {
      const instant = previewWalkaroundSessionFromBootstrap(driver, bootstrap, { checkType });
      if (instant?.ok) {
        setSession(instant);
        const { goReview } = applyDraftToFlow(instant, setters);
        if (goReview) {
          flowInProgressRef.current = true;
          suppressAutoReviewRef.current = false;
          setStep("review");
        } else {
          setStep("confirm");
        }
      } else {
        setStep((current) =>
          current === "review" || current === "checklist" || current === "result"
            ? current
            : "loading",
        );
      }
    }

    void (async () => {
      setError("");
      try {
        const data = await loadWalkaroundSession(driver, { checkType, bootstrap });
        if (cancelled) return;

        if (!data.ok) {
          setSession(data);
          if (!submittedRef.current && !flowInProgressRef.current) {
            setError(data.message);
            setStep("confirm");
          }
          return;
        }

        setSession(data);

        if (submittedRef.current || flowInProgressRef.current) {
          return;
        }

        const { goReview } = applyDraftToFlow(data, setters);
        if (goReview) {
          flowInProgressRef.current = true;
          suppressAutoReviewRef.current = false;
          setStep("review");
          return;
        }

        setStep("confirm");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load walkaround check.";
        setSession((prev) => prev?.ok ? prev : { ok: false, message, options: [] });
        setError(message);
        setStep("confirm");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrap, checkType, driver]);

  const isEndOfDutyCheck =
    checkType === CHECK_TYPES.end_of_duty.id || checkType === CHECK_TYPES.post_journey.id;

  const sectionLabel = (sectionKey) =>
    isEndOfDutyCheck ? getEndOfDutySectionLabel(sectionKey) : getSectionLabel(sectionKey);

  const flowTitle = isEndOfDutyCheck ? "End of duty closeout" : "Walkaround check";

  const items = session?.checklist?.items ?? [];
  const currentItem = items[currentIndex];
  const displayStep = items.length ? Math.min(currentIndex + 1, items.length) : 0;

  useEffect(() => {
    if (step !== "checklist" || items.length === 0) return;
    if (suppressAutoReviewRef.current) return;
    if (isChecklistFullyAnswered(items, answers)) {
      setStep("review");
      return;
    }
    const normalized = normalizeChecklistProgress(items, answers, currentIndex);
    if (normalized.allComplete) {
      setStep("review");
      return;
    }
    if (normalized.currentIndex !== currentIndex) {
      setCurrentIndex(normalized.currentIndex);
    }
  }, [step, items, answers, currentIndex]);

  const openReview = () => {
    suppressAutoReviewRef.current = false;
    setStep("review");
  };

  const editAnswersFromReview = () => {
    suppressAutoReviewRef.current = true;
    const normalized = normalizeChecklistProgress(items, answers, items.length - 1);
    setCurrentIndex(normalized.currentIndex);
    setStep("checklist");
  };

  const backFromReview = () => {
    editAnswersFromReview();
  };

  const persistDraft = (patch = {}) => {
    if (!session?.vehicle?.id) return;
    const draft = {
      answers: patch.answers ?? answers,
      odometer: patch.odometer ?? odometer,
      fuelLevel: patch.fuelLevel ?? fuelLevel,
      currentIndex: patch.currentIndex ?? currentIndex,
      checkType,
      startedAt,
      vehicleConfirmed: patch.vehicleConfirmed ?? vehicleConfirmed,
    };
    persistWalkaroundDraft(driver, session.vehicle.id, draft);
    setSyncHint("Saved on this device");
  };

  const advanceAfterAnswer = (nextAnswers) => {
    const normalized = normalizeChecklistProgress(items, nextAnswers, currentIndex + 1);
    if (normalized.allComplete || isChecklistFullyAnswered(items, nextAnswers)) {
      persistDraft({ answers: nextAnswers, currentIndex: items.length - 1 });
      openReview();
      return;
    }
    setCurrentIndex(normalized.currentIndex);
    persistDraft({ answers: nextAnswers, currentIndex: normalized.currentIndex });
  };

  const captureGps = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    } catch {
      /* optional */
    }
  };

  const setOdometerPhoto = async (file) => {
    if (odometerPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(odometerPhotoPreview);
    }
    if (!file) {
      setOdometerPhotoFile(null);
      setOdometerPhotoPreview(null);
      setOdometerPhotoDataUrl(null);
      return;
    }
    setOdometerPhotoFile(file);
    setOdometerPhotoPreview(URL.createObjectURL(file));
    try {
      const dataUrl = await compressImageToDataUrl(file, 1280, 0.72);
      setOdometerPhotoDataUrl(dataUrl);
    } catch {
      setOdometerPhotoDataUrl(null);
    }
  };

  const ensureOdometerPhoto = async () => {
    if (odometerPhotoDataUrl) return odometerPhotoDataUrl;
    if (!odometerPhotoFile) return null;
    const dataUrl = await compressImageToDataUrl(odometerPhotoFile, 1280, 0.72);
    setOdometerPhotoDataUrl(dataUrl);
    return dataUrl;
  };

  const beginChecklist = async () => {
    if (!vehicleConfirmed) {
      setError("Confirm this is your vehicle.");
      return;
    }
    if (!odometer || Number(odometer) <= 0) {
      setError("Enter the current odometer reading.");
      return;
    }
    const odoPhoto = await ensureOdometerPhoto();
    if (!odoPhoto) {
      setError("Photograph the odometer so Admin and Yard can verify the reading.");
      return;
    }
    setError("");
    flowInProgressRef.current = true;
    submittedRef.current = false;

    if (isChecklistFullyAnswered(items, answers)) {
      if (!startedAt) setStartedAt(new Date().toISOString());
      openReview();
      persistDraft();
      return;
    }

    suppressAutoReviewRef.current = false;

    const normalized = normalizeChecklistProgress(items, answers, currentIndex);
    setCurrentIndex(normalized.currentIndex);

    if (!startedAt) setStartedAt(new Date().toISOString());
    await captureGps();
    setStep("checklist");
    persistDraft({ currentIndex: normalized.currentIndex });
  };

  const setPass = (item) => {
    const next = { ...answers, [item.id]: { status: "pass" } };
    setAnswers(next);
    advanceAfterAnswer(next);
  };

  const setNa = (item) => {
    const next = { ...answers, [item.id]: { status: "na" } };
    setAnswers(next);
    advanceAfterAnswer(next);
  };

  const saveAdvisory = async (item, data) => {
    let photoPath = null;
    let photoDataUrl = null;
    if (data.photoFile && session?.vehicle?.id) {
      const uploaded = await uploadWalkaroundPhoto({
        driver,
        vehicleId: session.vehicle.id,
        itemId: `${item.id}_advisory`,
        file: data.photoFile,
      });
      if (!uploaded.ok) {
        setError(uploaded.message);
        return;
      }
      photoPath = uploaded.path;
      try {
        photoDataUrl = await compressImageToDataUrl(data.photoFile, 1280, 0.72);
      } catch {
        photoDataUrl = null;
      }
    }

    const next = {
      ...answers,
      [item.id]: {
        status: "advisory",
        note: data.note,
        photoPath,
        photoDataUrl,
        isAdvisory: true,
      },
    };
    setAnswers(next);
    setAdvisoryItem(null);
    advanceAfterAnswer(next);
  };

  const saveFail = async (item, failData) => {
    let photoPath = failData.photoPath ?? null;
    let photoDataUrl = null;
    if (failData.photoFile && session?.vehicle?.id) {
      const uploaded = await uploadWalkaroundPhoto({
        driver,
        vehicleId: session.vehicle.id,
        itemId: item.id,
        file: failData.photoFile,
      });
      if (!uploaded.ok) {
        setError(uploaded.message);
        return;
      }
      photoPath = uploaded.path;
      try {
        photoDataUrl = await compressImageToDataUrl(failData.photoFile, 1280, 0.72);
      } catch {
        photoDataUrl = null;
      }
    }

    const next = {
      ...answers,
      [item.id]: {
        status: "fail",
        note: failData.note,
        canContinue: failData.canContinue,
        photoPath,
        photoDataUrl,
        zone: failData.zone ?? null,
        damageType: failData.damageType ?? null,
        isBodyworkDamage: Boolean(failData.isBodyworkDamage),
      },
    };
    setAnswers(next);
    setFailItem(null);
    advanceAfterAnswer(next);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const odoPhoto = await ensureOdometerPhoto();
      if (!odoPhoto) {
        setError("Photograph the odometer before submitting.");
        setSaving(false);
        setStep("confirm");
        return;
      }
      if (odometerPhotoFile && session?.vehicle?.id) {
        await uploadWalkaroundPhoto({
          driver,
          vehicleId: session.vehicle.id,
          itemId: "odometer",
          file: odometerPhotoFile,
        });
      }
      const result = await submitWalkaroundCheck({
        driver,
        vehicle: session?.vehicle,
        job: session?.job,
        profile: session?.profile,
        checklist: session?.checklist,
        answers,
        checkType,
        odometerReading: odometer,
        odometerPhotoDataUrl: odoPhoto,
        fuelLevel,
        vehicleConfirmed,
        declarationSigned,
        additionalDefectNote: additionalDefect,
        gps,
        startedAt,
        driverSignatureDataUrl: signatureDataUrl,
      });

      if (!result.ok) {
        setError(result.message ?? "Failed to submit walkaround check.");
        return;
      }

      let signedOn = null;
      // Daily / pre-use check completion signs the driver on for the published duty.
      if (checkType === CHECK_TYPES.daily.id || checkType === "driver_pre_use") {
        const depotId = authSession?.activeDepotId ?? authSession?.depots?.[0]?.id ?? null;
        signedOn = await signOnDutyAfterVehicleCheck({
          dutyId: session?.job?.id ?? null,
          depotId,
        }).catch(() => null);
        if (signedOn?.ok && !signedOn.skipped) {
          await refreshAuth?.().catch(() => null);
        }
      }

      flowInProgressRef.current = false;
      submittedRef.current = true;
      setSubmitResult({
        ...result,
        autoSignedOn: Boolean(signedOn?.ok && signedOn?.autoSignedOn),
        alreadySignedOn: Boolean(signedOn?.alreadySignedOn),
        signOnMessage: signedOn?.ok
          ? signedOn.alreadySignedOn
            ? "Already signed on for duty."
            : signedOn.skipped
              ? null
              : "Signed on for duty — Home and Admin now show you on duty."
          : signedOn?.message ?? null,
      });
      setStep("result");
      void flushPendingWalkaroundSubmissions(driver);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting your check.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "loading") {
    return (
      <div className={`${op.pageBg} flex items-center justify-center min-h-[60vh] gap-2 text-muted-foreground`}>
        <Loader2 className="w-5 h-5 animate-spin" /> Loading walkaround…
      </div>
    );
  }

  if (step === "result" && submitResult) {
    return (
      <WalkaroundResultScreen
        result={submitResult}
        profile={session?.profile}
        driverId={driver?.id}
        onHome={() => navigate(returnTo)}
      />
    );
  }

  if (step === "review") {
    return (
      <WalkaroundReviewScreen
        items={items}
        answers={answers}
        vehicleLabel={session?.vehicle?.registration}
        vehicleConfirmed={vehicleConfirmed}
        onVehicleConfirmedChange={(checked) => {
          setVehicleConfirmed(checked);
          persistDraft({ vehicleConfirmed: checked });
        }}
        additionalDefect={additionalDefect}
        onAdditionalDefectChange={setAdditionalDefect}
        declarationSigned={declarationSigned}
        onDeclarationChange={setDeclarationSigned}
        declarationText={declarationForCheckType(checkType)}
        signatureDataUrl={signatureDataUrl}
        onSignatureChange={setSignatureDataUrl}
        error={error}
        saving={saving}
        onBack={backFromReview}
        onEditAnswers={editAnswersFromReview}
        onSubmit={() => void handleSubmit()}
      />
    );
  }

  if (step === "confirm") {
    return (
      <div>
        {!session?.ok ? (
          <div className="px-4 pt-4">
            <CommandBackendNotice
              status="missing"
              title="Vehicle checks are not on Command yet"
              description="Admin cannot receive walkaround submissions until the Command vehicle-check API is added. Acknowledge duties and report defects/incidents from Home in the meantime."
            />
          </div>
        ) : null}
      <WalkaroundVehicleConfirm
        driver={driver}
        session={session}
        error={error || (!session?.ok ? session?.message : "")}
        checkType={checkType}
        checkTypes={session?.checkTypes ?? [CHECK_TYPES.daily]}
        onCheckTypeChange={setCheckType}
        vehicleConfirmed={vehicleConfirmed}
        onVehicleConfirmedChange={setVehicleConfirmed}
        odometer={odometer}
        onOdometerChange={(v) => {
          setOdometer(v);
          persistDraft({ odometer: v });
        }}
        odometerPhotoPreview={odometerPhotoPreview}
        onOdometerPhotoChange={(file) => void setOdometerPhoto(file)}
        fuelLevel={fuelLevel}
        onFuelLevelChange={setFuelLevel}
        syncHint={syncHint}
        pendingSync={pendingSync}
        onDiscardDraft={() => {
          if (session?.vehicle?.id) discardWalkaroundDraft(driver, session.vehicle.id);
          setAnswers({});
          setCurrentIndex(0);
          setStartedAt(null);
          setSyncHint(null);
          setStep("confirm");
          flowInProgressRef.current = false;
        }}
        draftComplete={session?.draft?.allItemsAnswered || isChecklistFullyAnswered(session?.checklist?.items ?? [], answers)}
        onContinueReview={() => {
          if (!vehicleConfirmed) {
            setError("Confirm this is your vehicle.");
            return;
          }
          if (!odometer || Number(odometer) <= 0) {
            setError("Enter the current odometer reading.");
            return;
          }
          if (!odometerPhotoDataUrl && !odometerPhotoFile) {
            setError("Photograph the odometer so Admin and Yard can verify the reading.");
            return;
          }
          setError("");
          flowInProgressRef.current = true;
          openReview();
        }}
        onStart={() => void beginChecklist()}
        onBack={() => navigate("/")}
      />
      </div>
    );
  }

  return (
    <div className={`${op.pageBg} ${op.text} flex min-h-dvh flex-col`}>
      <DriverOperationalHeader
        title={flowTitle}
        subtitle={`${session?.vehicle?.registration ?? "—"} · Item ${displayStep} of ${items.length}`}
        backTo="/"
      />

      <WalkaroundStepper activeStep="checklist" />

      <div className="shrink-0 px-4 py-2 border-b border-border bg-card">
        <p className="text-xs font-medium text-muted-foreground">
          {currentItem ? sectionLabel(currentItem.sectionKey) : "Review ready"}
          {syncHint ? <span className="ml-2 text-blue-700">· {syncHint}</span> : null}
        </p>
      </div>

      {currentItem ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="text-xs font-semibold text-[#1eaeae]">{sectionLabel(currentItem.sectionKey)}</p>
          <h2 className="text-xl font-bold mt-2 text-foreground leading-snug">{currentItem.questionTitle}</h2>
          {currentItem.isBodyworkDamage ? (
            <p className="mt-2 rounded-xl border border-[#1eaeae]/30 bg-[#1eaeae]/10 px-3 py-2 text-xs font-medium text-foreground">
              If you find damage, photograph it — Yard and Admin both receive the report.
            </p>
          ) : null}
          {currentItem.defaultSeverity === "critical" ? (
            <p className="mt-2 text-xs font-semibold text-red-600">Critical safety item</p>
          ) : null}
          {currentItem.guidance?.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
              {currentItem.guidance.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 text-sm text-muted-foreground space-y-3">
          <p>All checklist items answered — continue to review and submit.</p>
          <button
            type="button"
            onClick={openReview}
            className="w-full h-11 rounded-full font-semibold bg-[#8ec63f] text-white"
          >
            Continue to review
          </button>
        </div>
      )}

      <div
        className="shrink-0 border-t border-border bg-card p-4 space-y-2"
        style={{ paddingBottom: `calc(16px + ${DRIVER_SAFE_BOTTOM})` }}
      >
        {isChecklistFullyAnswered(items, answers) ? (
          <button
            type="button"
            onClick={openReview}
            className="w-full min-h-[48px] rounded-full font-semibold bg-[#8ec63f] text-white"
          >
            Continue to review & submit
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => currentItem && setPass(currentItem)}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-emerald-600 font-semibold text-white"
            >
              <CheckCircle2 className="h-5 w-5" />
              {currentItem?.isBodyworkDamage ? "No bodywork damage" : "Pass"}
            </button>
            <button
              type="button"
              onClick={() => currentItem && setAdvisoryItem(currentItem)}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-amber-500 font-semibold text-white"
            >
              <AlertTriangle className="h-5 w-5" />
              Advisory
            </button>
            <button
              type="button"
              onClick={() => currentItem && setFailItem(currentItem)}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-red-500 font-semibold text-white"
            >
              <XCircle className="h-5 w-5" />
              {currentItem?.isBodyworkDamage ? "Yes — damage found" : "Fail"}
            </button>
            <button
              type="button"
              onClick={() => currentItem && setNa(currentItem)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-border font-semibold text-foreground"
            >
              <MinusCircle className="h-5 w-5" /> Not applicable
            </button>
          </>
        )}
      </div>

      {failItem ? (
        <WalkaroundFailSheet
          item={failItem}
          profile={session?.profile}
          onCancel={() => setFailItem(null)}
          onSave={(data) => void saveFail(failItem, data)}
        />
      ) : null}
      {advisoryItem ? (
        <WalkaroundAdvisorySheet
          item={advisoryItem}
          onCancel={() => setAdvisoryItem(null)}
          onSave={(data) => void saveAdvisory(advisoryItem, data)}
        />
      ) : null}
    </div>
  );
}

