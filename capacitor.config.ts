import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uk.veyvio.yard",
  appName: "Veyvio Yard",
  webDir: "dist/client/client",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
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
