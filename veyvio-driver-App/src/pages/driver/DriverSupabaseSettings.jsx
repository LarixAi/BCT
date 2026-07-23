import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Car, CircleDot, FileText, HelpCircle, Mail, Phone, Volume2 } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPhvContractTab from "@/components/driver/settings/DriverPhvContractTab";
import DriverPcoDocumentsTab from "@/components/driver/settings/DriverPcoDocumentsTab";
import SettingsWorkSetupCards from "@/components/driver/settings/SettingsWorkSetupCards";
import SecurityAndSignInSection from "@/components/driver/settings/SecurityAndSignInSection";
import {
  SettingsContactRow,
  SettingsDetailRows,
  SettingsLinkRow,
  SettingsTabChip,
  SettingsToggle,
} from "@/components/driver/settings/settings-shared";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_OPERATOR_INFO } from "@/lib/driverOperatorInfo";
import { Capacitor } from "@capacitor/core";
import { getPushPermissionStatus } from "@/services/push-registration.service";
import {
  checkOverlayPermission,
  isFloatingBubbleSupported,
  requestOverlayPermission,
} from "@/lib/navigation/floatingBubble";
import {
  isFloatingBubbleEnabled,
  setFloatingBubbleEnabled,
} from "@/lib/navigation/floatingBubblePrefs";
import {
  isAndroidAutoAvailable,
  isAndroidAutoBridgeSupported,
} from "@/lib/navigation/driverAndroidAuto";
import {
  isNavigationVoiceEnabled,
  setNavigationVoiceEnabled,
} from "@/lib/navigation/navigationVoicePrefs";

function resolveTab(searchParams, showPhvTabs) {
  const tab = searchParams.get("tab");
  if (!showPhvTabs) return "account";
  if (tab === "pco" || tab === "phv" || tab === "contract") return tab === "contract" ? "phv" : tab;
  return "account";
}

function tabSubtitle(tab) {
  if (tab === "phv") return "School, airport & scheduled routes";
  if (tab === "pco") return "Private hire — badge, vehicle & compliance";
  return "Account and operator contact";
}

export default function DriverSupabaseSettings({ driver }) {
  const { session, bootstrap } = useDriverSupabaseAuth();
  const { supportPhone, officeHours } = DRIVER_OPERATOR_INFO;
  const organisationName =
    session?.organisationName || bootstrap?.operator?.name || DRIVER_OPERATOR_INFO.name;
  const supportEmail =
    bootstrap?.operator?.supportEmail ||
    DRIVER_OPERATOR_INFO.supportEmail;
  const showPhvTabs = Boolean(driver?.canDoPrivateHire);
  const tabs = useMemo(() => {
    const base = [{ id: "account", label: "Account" }];
    if (showPhvTabs) {
      base.push({ id: "phv", label: "PHV routes" }, { id: "pco", label: "PCO trips" });
    }
    return base;
  }, [showPhvTabs]);

  const [pushStatus, setPushStatus] = useState("checking");
  const [bubbleEnabled, setBubbleEnabledState] = useState(isFloatingBubbleEnabled);
  const [overlayGranted, setOverlayGranted] = useState(null);
  const [androidAutoReady, setAndroidAutoReady] = useState(null);
  const [navVoiceEnabled, setNavVoiceEnabledState] = useState(isNavigationVoiceEnabled);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => resolveTab(searchParams, showPhvTabs), [searchParams, showPhvTabs]);

  const selectTab = (id) => {
    if (id === "account") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: id }, { replace: true });
    }
  };

  useEffect(() => {
    void getPushPermissionStatus().then(setPushStatus);
  }, []);

  useEffect(() => {
    if (!isFloatingBubbleSupported()) return;
    void checkOverlayPermission().then(({ granted }) => setOverlayGranted(granted));
  }, [bubbleEnabled]);

  useEffect(() => {
    if (!isAndroidAutoBridgeSupported()) return;
    void isAndroidAutoAvailable().then(setAndroidAutoReady);
  }, []);

  function toggleNavVoice() {
    const next = !navVoiceEnabled;
    setNavVoiceEnabledState(next);
    setNavigationVoiceEnabled(next);
  }

  const bubbleSupported = isFloatingBubbleSupported();
  const bubblePermissionLabel =
    overlayGranted === null
      ? "Checking…"
      : overlayGranted
        ? "Allowed — button can appear over Google Maps"
        : "Not allowed — tap below to open Android settings";

  function toggleBubbleEnabled() {
    const next = !bubbleEnabled;
    setBubbleEnabledState(next);
    setFloatingBubbleEnabled(next);
    if (!next) {
      void import("@/lib/navigation/floatingBubble").then(({ hideFloatingBubble }) => hideFloatingBubble());
    }
  }

  const pushLabel =
    pushStatus === "granted"
      ? "Enabled — you will receive lock-screen alerts"
      : pushStatus === "denied"
        ? "Disabled — enable in Android Settings → Apps → Notifications"
        : pushStatus === "not_configured"
          ? "Not configured yet — Firebase google-services.json required for lock-screen alerts"
          : pushStatus === "unsupported"
            ? "Available on the mobile app only"
            : "Checking…";

  return (
    <div>
      <DriverOperationalHeader
        title="Settings"
        subtitle={tabSubtitle(tab)}
        backTo="/profile/details"
        showAppLabel
      />

      <div className="space-y-6 px-4 pb-8">
        {tabs.length > 1 ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {tabs.map((item) => (
              <SettingsTabChip
                key={item.id}
                label={item.label}
                active={tab === item.id}
                onClick={() => selectTab(item.id)}
              />
            ))}
          </div>
        ) : null}

        {tab === "phv" && showPhvTabs ? (
          <DriverPhvContractTab driver={driver} />
        ) : tab === "pco" && showPhvTabs ? (
          <DriverPcoDocumentsTab driver={driver} />
        ) : (
          <>
            <CommandBackendNotice
              status="ready"
              title={`Signed in to ${organisationName}`}
              description="Profile and documents sync to Command Admin for verification. App preferences below stay on this device."
            />

            {showPhvTabs ? <SettingsWorkSetupCards driver={driver} onSelectTab={selectTab} /> : null}

            <section>
              <DriverSectionTitle>Your details</DriverSectionTitle>
              <SettingsDetailRows
                rows={[
                  { label: "Full name", value: driver.fullName },
                  { label: "Email", value: driver.email },
                  { label: "Phone", value: driver.phone },
                  { label: "Operator", value: organisationName },
                ]}
              />
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                To update contact details, ask your transport manager in Admin — drivers cannot edit these fields here.
              </p>
            </section>

            <section>
              <DriverSectionTitle>Operator contact</DriverSectionTitle>
              <div className="space-y-2">
                {supportPhone ? (
                  <SettingsContactRow
                    href={`tel:${supportPhone.replace(/\s/g, "")}`}
                    icon={Phone}
                    label="Phone"
                    value={supportPhone}
                  />
                ) : null}
                {supportEmail ? (
                  <SettingsContactRow
                    href={`mailto:${supportEmail}`}
                    icon={Mail}
                    label="Email"
                    value={supportEmail}
                  />
                ) : null}
              </div>
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">{officeHours}</p>
            </section>

            <section>
              <DriverSectionTitle>Notifications</DriverSectionTitle>
              <div className={`p-4 ${op.card}`}>
                <div className="flex items-start gap-3 text-sm text-foreground">
                  {pushStatus === "granted" ? (
                    <Bell className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <BellOff className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-[15px]">Push alerts</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{pushLabel}</p>
                    {Capacitor.isNativePlatform() && pushStatus === "denied" ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Job offers, messages and compliance alerts require notification permission.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {bubbleSupported ? (
              <section>
                <DriverSectionTitle>Navigation return button</DriverSectionTitle>
                <div className={`p-4 ${op.card}`}>
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <CircleDot className={`w-5 h-5 mt-0.5 shrink-0 ${op.iconTeal}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[15px]">Floating return button</p>
                      <SettingsToggle
                        checked={bubbleEnabled}
                        onChange={toggleBubbleEnabled}
                        aria-label="Toggle floating return button"
                      />
                    </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Shows a small Veyvio icon over other apps while you navigate in Google Maps.
                        One tap brings you back to your trip.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{bubblePermissionLabel}</p>
                      {bubbleEnabled && !overlayGranted ? (
                        <button
                          type="button"
                          onClick={() =>
                            void requestOverlayPermission().then(({ granted }) => setOverlayGranted(granted))
                          }
                          className={`mt-3 text-xs ${op.linkAccent}`}
                        >
                          Open overlay permission settings
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : Capacitor.getPlatform() === "ios" ? (
              <section>
                <DriverSectionTitle>Navigation return button</DriverSectionTitle>
                <div className={`p-4 ${op.card}`}>
                  <p className="text-sm text-foreground font-semibold">Automatic return on arrival</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    iOS does not allow floating buttons over other apps. Veyvio watches your location in the
                    background and opens automatically when you reach the pickup.
                  </p>
                </div>
              </section>
            ) : null}

            <section>
              <DriverSectionTitle>Navigation voice</DriverSectionTitle>
              <div className={`p-4 ${op.card}`}>
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <Volume2 className={`w-5 h-5 mt-0.5 shrink-0 ${op.iconTeal}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[15px]">Turn-by-turn audio</p>
                      <SettingsToggle
                        checked={navVoiceEnabled}
                        onChange={toggleNavVoice}
                        aria-label="Toggle navigation voice"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Speaks directions on the Jobs map when you start a job and navigate in Veyvio.
                      Tap the speaker icon on the nav bar to mute mid-trip.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      When you open Google Maps, use Maps&apos; own voice guidance — Veyvio stays in the
                      background for return-to-app.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {Capacitor.getPlatform() === "android" ? (
              <section>
                <DriverSectionTitle>Android Auto</DriverSectionTitle>
                <div className={`p-4 ${op.card}`}>
                  <div className="flex items-start gap-3 text-sm text-foreground">
                    <Car className={`w-5 h-5 mt-0.5 shrink-0 ${op.iconTeal}`} />
                    <div>
                      <p className="font-semibold text-[15px]">In-car display (Samsung & Android)</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        When your phone is connected to Android Auto, Veyvio shows your active trip on the car
                        screen. Tap <strong>Navigate</strong> on a job first — trip details sync automatically
                        while Google Maps handles turn-by-turn directions.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {androidAutoReady === null
                          ? "Checking Android Auto support…"
                          : androidAutoReady
                            ? "Android Auto integration is enabled in this build."
                            : "Android Auto is not available on this device."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {Capacitor.getPlatform() === "ios" ? (
              <section>
                <DriverSectionTitle>CarPlay</DriverSectionTitle>
                <div className={`p-4 ${op.card}`}>
                  <p className="text-sm text-foreground font-semibold">In-car display (Phase 2)</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    When Apple approves the CarPlay Transport entitlement, Veyvio shows your active trip on the
                    car screen. Start navigation on your iPhone first — trip details sync to CarPlay automatically.
                  </p>
                </div>
              </section>
            ) : null}

            <SecurityAndSignInSection driver={driver} />

            <section>
              <DriverSectionTitle>More</DriverSectionTitle>
              <div className={op.listCard}>
                <SettingsLinkRow
                  to="/documents"
                  icon={FileText}
                  label="Documents"
                  description="Syncs to Command for Admin review"
                />
                <SettingsLinkRow
                  to="/profile/details"
                  icon={HelpCircle}
                  label="My profile"
                  description="Duty links, credentials and safety"
                />
                <SettingsLinkRow
                  to="/help"
                  icon={HelpCircle}
                  label="Help & support"
                  description="FAQs and operator contact"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
