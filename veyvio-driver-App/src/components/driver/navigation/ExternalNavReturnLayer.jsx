import { useExternalNavReturn } from "@/hooks/useExternalNavReturn";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";

/** Background GPS watcher — returns driver from Google Maps when they reach pickup. */
export default function ExternalNavReturnLayer() {
  const { screen } = useDriverSupabaseAuth();
  const enabled = screen === "app";

  useExternalNavReturn({ enabled });
  return null;
}
