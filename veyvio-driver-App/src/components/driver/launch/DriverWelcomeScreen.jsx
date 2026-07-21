import { useState } from "react";
import { RidovaDriverLogo } from "@/components/driver/brand/RidovaDriverLogo";
import { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { DRIVER_SAFE_BOTTOM, DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";
import { markDriverWelcomeSeen } from "@/lib/driverLaunch";

const SLIDES = [
  {
    eyebrow: "Jobs",
    title: "Run today's work from one place",
    body: "Accept offers, navigate stops, and close out trips without switching apps.",
  },
  {
    eyebrow: "Checks",
    title: "Start duty the right way",
    body: "Complete walkaround checks and log defects before you head out.",
  },
  {
    eyebrow: "Compliance",
    title: "Stay ready for the road",
    body: "Working time, documents, and policy acknowledgements kept up to date.",
  },
];

export default function DriverWelcomeScreen({ onComplete }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  function finish() {
    markDriverWelcomeSeen();
    onComplete?.();
  }

  return (
    <div
      className="ridova-launch-screen ridova-launch-screen--welcome"
      style={{
        paddingTop: `calc(${DRIVER_SAFE_TOP} + 8px)`,
        paddingBottom: `calc(${DRIVER_SAFE_BOTTOM} + 12px)`,
      }}
    >
      <div className="ridova-launch-shell">
        <header className="ridova-launch-header">
          <RidovaDriverLogo size="sm" className="ridova-launch-logo" />
          <button type="button" className="ridova-launch-skip" onClick={finish}>
            Skip
          </button>
        </header>

        <div className="ridova-launch-body">
          <div className="ridova-launch-copy-block">
            <p className="ridova-launch-eyebrow">
              {slide.eyebrow} · {index + 1} of {SLIDES.length}
            </p>
            <h1 className="ridova-launch-title">{slide.title}</h1>
            <p className="ridova-launch-copy">{slide.body}</p>
          </div>

          <div className="ridova-launch-footer">
            <div className="ridova-launch-dots" aria-hidden>
              {SLIDES.map((item, i) => (
                <span
                  key={item.title}
                  className={`ridova-launch-dot ${i === index ? "ridova-launch-dot--active" : ""}`}
                />
              ))}
            </div>

            <DriverAuthPrimaryButton
              type="button"
              className="ridova-launch-cta"
              onClick={() => {
                if (last) finish();
                else setIndex((i) => i + 1);
              }}
            >
              {last ? "Sign in" : "Continue"}
            </DriverAuthPrimaryButton>

            <p className="ridova-launch-brand">{APP_DISPLAY_NAME}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
