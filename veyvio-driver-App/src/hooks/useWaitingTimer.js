import { useState, useEffect } from "react";

/** Count-up timer from arrival_time — returns "m:ss". */
export function useWaitingTimer(sinceIso) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sinceIso) {
      setElapsed(0);
      return;
    }
    const start = new Date(sinceIso).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sinceIso]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
