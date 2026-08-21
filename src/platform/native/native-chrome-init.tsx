import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SystemBarType, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

function isExternalHttpUrl(href: string): boolean {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Configures status bar / splash and keeps the WebView on packaged app origins.
 * External http(s) links open outside the app instead of replacing the Yard shell.
 */
export function NativeChromeInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        await SystemBars.setStyle({
          style: SystemBarsStyle.Dark,
          bar: SystemBarType.StatusBar,
        });
      } catch {
        // SystemBars unavailable on older web runtimes — safe to ignore.
      }
      try {
        await SplashScreen.hide();
      } catch {
        // Splash may already be hidden.
      }
    })();

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href || !isExternalHttpUrl(href)) return;
      event.preventDefault();
      event.stopPropagation();
      // System browser / Custom Tabs — do not navigate the Capacitor WebView.
      window.open(href, "_blank", "noopener,noreferrer");
    };

    document.addEventListener("click", onClickCapture, true);

    let backListener: { remove: () => Promise<void> } | undefined;
    void CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
        return;
      }
      void CapApp.minimizeApp();
    }).then(handle => {
      backListener = handle;
    });

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      void backListener?.remove();
    };
  }, []);

  return null;
}
