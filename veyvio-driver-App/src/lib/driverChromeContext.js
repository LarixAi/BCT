import { createContext, useContext } from "react";

export const DriverChromeContext = createContext({
  hideBottomNav: false,
  setHideBottomNav: () => {},
});

export function useDriverChrome() {
  return useContext(DriverChromeContext);
}
