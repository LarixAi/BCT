import { X } from "lucide-react";
import { getDriverPolicyContent } from "@/lib/driver-policy-content";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";
import { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";

export default function DriverPolicyViewer({ policyKey, onClose, onMarkRead }) {
  const content = getDriverPolicyContent(policyKey);

  if (!content) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Policy content is not available.</p>
          <button type="button" onClick={onClose} className="driver-auth-link mt-4 text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        className="shrink-0 border-b border-border bg-card px-4 pb-3"
        style={{ paddingTop: DRIVER_SCREEN_TOP }}
      >
        <div className="mx-auto flex w-full max-w-lg items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[#5B8C9B]">
              Policy · v{content.version}
            </p>
            <h2 className="font-display text-lg font-bold leading-tight text-[#0B0E14]">{content.title}</h2>
            {content.readMinutes ? (
              <p className="mt-1 text-xs text-muted-foreground">About {content.readMinutes} min read</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close policy"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-lg px-4 py-6">
          {content.summary ? (
            <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">{content.summary}</p>
          ) : null}

          <div className="space-y-6">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="font-display text-base font-semibold text-foreground">{section.heading}</h3>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </div>

      <footer className="shrink-0 border-t border-border bg-card px-4 py-4">
        <div className="mx-auto w-full max-w-lg">
          <DriverAuthPrimaryButton
            type="button"
            onClick={() => {
              onMarkRead?.(policyKey);
              onClose?.();
            }}
          >
            I have read this policy
          </DriverAuthPrimaryButton>
        </div>
      </footer>
    </div>
  );
}
