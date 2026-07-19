export const DRIVER_HOME = "/driver";

export const DRIVER_TAB_IDS = ["home", "earnings", "inbox", "menu"];

/** One-shot state when returning to the driver shell. */
export function driverHomeState(tab = "menu", { returnToMap = false } = {}) {
  const activeTab = DRIVER_TAB_IDS.includes(tab) ? tab : "menu";
  return returnToMap ? { activeTab: "home", returnToMap: true } : { activeTab };
}

export function navigateToDriverHome(navigate, tab = "menu", { replace = false, returnToMap = false } = {}) {
  navigate(DRIVER_HOME, {
    replace,
    state: driverHomeState(tab, { returnToMap }),
  });
}

/** Passed through vehicle → documents → document detail so back always exits cleanly. */
export function vehicleNavState(fromTab = "menu") {
  return { fromTab: DRIVER_TAB_IDS.includes(fromTab) ? fromTab : "menu" };
}

export function readVehicleFromTab(location) {
  const tab = location.state?.fromTab;
  return DRIVER_TAB_IDS.includes(tab) ? tab : "menu";
}
