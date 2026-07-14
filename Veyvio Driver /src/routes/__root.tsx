import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { NativeChromeInit } from "../platform/native/native-chrome-init";
import { DriverFocusProvider } from "../features/driver-focus/DriverFocusProvider";
import { DriverFocusPermissionPrompt } from "../features/driver-focus/DriverFocusPermissionPrompt";
import { TripOverlayShell, TripOverlayLayoutEffect } from "../features/driver-focus/TripOverlayShell";
import { TripDeepLinkHandler } from "../features/driver-focus/TripDeepLinkHandler";
import { VehicleMotionProvider } from "../features/driver-focus/VehicleMotionProvider";
import { DrivingSafetyBanner } from "../features/driver-focus/DrivingSafetyBanner";
import { Toaster } from "sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Veyvio Driver" },
      { name: "description", content: "Veyvio Driver — the driver's digital working environment for UK passenger transport." },
      { name: "theme-color", content: "#0B1526" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <NativeChromeInit />
      <DriverFocusProvider />
      <VehicleMotionProvider />
      <TripDeepLinkHandler />
      <TripOverlayLayoutEffect />
      <DriverFocusPermissionPrompt />
      <DrivingSafetyBanner />
      <TripOverlayShell />
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
