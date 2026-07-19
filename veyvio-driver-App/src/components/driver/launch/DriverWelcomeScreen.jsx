import { useState } from "react";
import { RidovaDriverLogo } from "@/components/driver/brand/RidovaDriverLogo";
import { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";
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
    <div className="ridova-launch-screen min-h-dvh" style={{ paddingTop: DRIVER_SCREEN_TOP }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6">
        <header className="ridova-launch-header">
          <RidovaDriverLogo size="sm" className="!h-9 !w-9" />
          <button type="button" className="ridova-launch-skip" onClick={finish}>
            Skip
          </button>
        </header>

        <div className="ridova-launch-body">
          <p className="ridova-launch-eyebrow">
            {slide.eyebrow} · {index + 1} of {SLIDES.length}
          </p>
          <h1 className="ridova-launch-title">{slide.title}</h1>
          <p className="ridova-launch-copy">{slide.body}</p>

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
              onClick={() => {
                if (last) finish();
                else setIndex((i) => i + 1);
              }}
            >
              {last ? "Sign in" : "Continue"}
            </DriverAuthPrimaryButton>

            <p className="mt-4 text-center text-xs text-[#9ca3af]">{APP_DISPLAY_NAME}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
