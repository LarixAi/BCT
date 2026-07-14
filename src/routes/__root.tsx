import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NativeChromeInit } from "../platform/native/native-chrome-init";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted">Route unknown</div>
        <h1 className="mt-2 text-4xl font-extrabold font-display">Not on the yard.</h1>
        <p className="mt-2 text-sm text-muted">This screen doesn't exist in Veyvio Yard.</p>
        <a href="/" className="mt-6 inline-flex rounded-sm bg-accent px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">Back to Home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-vor">Fault</div>
        <h1 className="mt-2 text-2xl font-extrabold font-display">This screen didn't load.</h1>
        <p className="mt-2 text-sm text-muted">Retry, or return to the home board.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-sm bg-accent px-4 py-2 text-xs font-bold uppercase tracking-widest text-white"
          >Retry</button>
          <a href="/" className="rounded-sm border border-border bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Veyvio Yard — Depot Operations" },
      { name: "description", content: "Veyvio Yard is the depot operating system for UK passenger transport: vehicle movements, yard checks, defects and VOR triage." },
      { name: "author", content: "Veyvio" },
      { property: "og:title", content: "Veyvio Yard — Depot Operations" },
      { property: "og:description", content: "Move smarter. Operate safer. The depot operating system for UK passenger transport." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icons/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B1526" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Veyvio Yard" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { rel: "icon", href: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Manrope:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <NativeChromeInit />
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
