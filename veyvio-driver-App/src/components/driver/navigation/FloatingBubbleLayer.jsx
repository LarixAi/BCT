import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useNavigate } from "react-router-dom";
import {
  addFloatingBubbleTapListener,
  hideFloatingBubble,
  isFloatingBubbleSupported,
  showFloatingBubbleForSession,
} from "@/lib/navigation/floatingBubble";
import { loadExternalNavSession } from "@/lib/navigation/externalNavSession";
import { bringDriverAppToForeground } from "@/lib/navigation/returnToDriverApp";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";

/** Handles Android floating bubble tap → return to active job. */
export default function FloatingBubbleLayer() {
  const navigate = useNavigate();
  const { screen } = useDriverSupabaseAuth();

  useEffect(() => {
    if (screen !== "app" || !isFloatingBubbleSupported()) return undefined;

    let listenerHandle = null;
    let appStateHandle = null;

    void addFloatingBubbleTapListener(async (event) => {
      const session = loadExternalNavSession();
      const jobRoute = event?.jobRoute ?? session?.jobRoute;
      const jobId = event?.jobId ?? session?.jobId;

      await hideFloatingBubble();
      await bringDriverAppToForeground();

      if (jobRoute) {
        navigate(jobRoute, { replace: false });
      } else if (jobId) {
        navigate(`/job/${jobId}`, { replace: false });
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    void App.getState().then(({ isActive }) => {
      if (isActive) {
        void hideFloatingBubble();
      }
    });

    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void hideFloatingBubble();
        return;
      }
      const session = loadExternalNavSession();
      if (session?.jobId) {
        void showFloatingBubbleForSession(session);
      }
    }).then((handle) => {
      appStateHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
      void appStateHandle?.remove();
    };
  }, [screen, navigate]);

  return null;
}
