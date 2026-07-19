export const CUSTOMER_HOME = "/book";

export const CUSTOMER_TAB_IDS = ["home", "trips", "account"];

export function customerHomeState(tab = "home") {
  return { activeTab: CUSTOMER_TAB_IDS.includes(tab) ? tab : "home" };
}

export function navigateToCustomerHome(navigate, tab = "home", { replace = false } = {}) {
  navigate(CUSTOMER_HOME, { replace, state: customerHomeState(tab) });
}
