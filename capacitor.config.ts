import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Yard native shell — keep parity with Driver:
 * - No server.url (that loads a remote website inside the WebView)
 * - No allowNavigation to production hosts
 * - Packaged assets only (webDir)
 */
const config: CapacitorConfig = {
  appId: "uk.veyvio.yard",
  appName: "Veyvio Yard",
  webDir: "dist/client/client",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    App: {
      appUrlOpen: {
        enabled: true,
      },
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
    },
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#0B1526",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
