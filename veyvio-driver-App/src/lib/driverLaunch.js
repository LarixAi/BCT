const WELCOME_KEY = "veyvio.driver.welcome.v2";

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

/** Clears the “welcome seen” flag (dev / reinstall testing). */
export function resetDriverWelcomeSeen() {
  try {
    localStorage.removeItem(WELCOME_KEY);
    localStorage.removeItem("ridova.driver.welcome.v1");
  } catch {
    /* ignore */
  }
}
