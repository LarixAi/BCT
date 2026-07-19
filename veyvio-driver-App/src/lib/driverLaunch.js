const WELCOME_KEY = "ridova.driver.welcome.v1";

/** Capacitor iOS/Android — splash/welcome on native installs only. */
export const APP_DELIVERY = "installable";

export const SPLASH_DURATION_MS = 1800;

export function hasSeenDriverWelcome() {
  try {
    return localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDriverWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}
