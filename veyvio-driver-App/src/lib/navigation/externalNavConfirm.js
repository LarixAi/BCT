/**
 * Imperative "leave the app?" confirmation before handing off to an external
 * maps app (Google Maps, Waze, Apple Maps). Same pub-sub pattern as
 * use-toast.jsx so it can be called from plain service files, not just
 * components — <NavigationConfirmDialog /> (mounted once in App.jsx) is the
 * only thing that renders it.
 */
import { useState, useEffect } from "react";

const listeners = [];
let memoryState = { open: false, title: "", description: "", confirmLabel: "", resolve: null };

function setState(next) {
  memoryState = { ...memoryState, ...next };
  listeners.forEach((listener) => listener(memoryState));
}

/**
 * @returns {Promise<boolean>} true if the driver chose to open the external app.
 */
export function confirmExternalNavigation({
  title = "Open external navigation?",
  description = "You'll leave Veyvio Driver. Tap the Veyvio button (or your app switcher) to come back to your trip.",
  confirmLabel = "Open Maps",
} = {}) {
  return new Promise((resolve) => {
    setState({ open: true, title, description, confirmLabel, resolve });
  });
}

function resolveAndClose(result) {
  memoryState.resolve?.(result);
  setState({ open: false, resolve: null });
}

export function respondToExternalNavigationPrompt(confirmed) {
  resolveAndClose(confirmed);
}

export function useExternalNavConfirmState() {
  const [state, set] = useState(memoryState);

  useEffect(() => {
    listeners.push(set);
    return () => {
      const index = listeners.indexOf(set);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return state;
}
