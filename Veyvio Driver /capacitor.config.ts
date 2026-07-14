import type { CapacitorConfig } from "@capacitor/cli";

const devServerUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "uk.veyvio.driver",
  appName: "Veyvio Driver",
  webDir: "dist/client/client",
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: true,
        androidScheme: "http",
      }
    : {
        androidScheme: "https",
        cleartext: true,
      },
  android: {
    allowMixedContent: true,
  },
  app: {
    deepLinkingEnabled: true,
  },
  plugins: {
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
