import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";

/** Standard content padding for tab-root screens (home, jobs list, profile). */
export default function DriverPageContainer({ children, className = "" }) {
  return (
    <div className={`px-4 pb-4 ${className}`} style={{ paddingTop: DRIVER_SCREEN_TOP }}>
      {children}
    </div>
  );
}
