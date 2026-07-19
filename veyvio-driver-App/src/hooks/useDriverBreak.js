import { useState, useCallback, useEffect } from "react";
import { readDriverBreak, writeDriverBreak } from "@/lib/driverBreak";

/**
 * Break mode: driver stays online but pauses trip offers (client-side until backend field exists).
 */
export function useDriverBreak(driverId) {
  const [onBreak, setOnBreak] = useState(() => readDriverBreak(driverId));

  useEffect(() => {
    setOnBreak(readDriverBreak(driverId));
  }, [driverId]);

  const setBreak = useCallback((next) => {
    setOnBreak(next);
    writeDriverBreak(driverId, next);
  }, [driverId]);

  const toggleBreak = useCallback(() => {
    setOnBreak((prev) => {
      const next = !prev;
      writeDriverBreak(driverId, next);
      return next;
    });
  }, [driverId]);

  const clearBreak = useCallback(() => {
    setBreak(false);
  }, [setBreak]);

  return { onBreak, toggleBreak, clearBreak, setBreak };
}
