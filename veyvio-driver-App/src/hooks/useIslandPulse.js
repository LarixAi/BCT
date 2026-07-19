import { useState, useCallback } from "react";

/**
 * Triggers a short blue pulse on the Dynamic Island (e.g. job payment received).
 */
export function useIslandPulse() {
  const [islandPulse, setIslandPulse] = useState(null);

  const triggerIslandPulse = useCallback((payload = {}) => {
    setIslandPulse({ ...payload, id: Date.now() });
  }, []);

  const clearIslandPulse = useCallback(() => {
    setIslandPulse(null);
  }, []);

  return { islandPulse, triggerIslandPulse, clearIslandPulse };
}
