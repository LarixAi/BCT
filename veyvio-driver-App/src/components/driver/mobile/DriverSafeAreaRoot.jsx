import { useDriverSafeAreaInsets } from "@/hooks/useDriverSafeAreaInsets";

/** Mount once at the driver app root so every route gets --driver-safe-top / --driver-safe-bottom. */
export default function DriverSafeAreaRoot({ children }) {
  useDriverSafeAreaInsets();
  return children;
}
