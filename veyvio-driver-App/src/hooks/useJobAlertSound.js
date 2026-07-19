/**
 * useJobAlertSound — continuous looping alert while a job offer is active.
 * Uses a single persistent AudioContext with a scheduled repeating pattern.
 * Stops immediately and cleanly when isOffered becomes false.
 */
import { useEffect, useRef } from "react";

export function useJobAlertSound(isOffered) {
  const ctxRef = useRef(null);
  const intervalRef = useRef(null);

  const playBeep = (ctx) => {
    try {
      const tones = [
        { freq: 880,  start: 0,    duration: 0.12 },
        { freq: 1100, start: 0.18, duration: 0.12 },
      ];
      tones.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + start + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      });
    } catch (e) {
      // Silently ignore if AudioContext is closed/suspended
    }
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOffered) {
      stop();
      return;
    }

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      // Resume context if suspended (mobile browsers require user gesture)
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      // Play immediately, then every 2.5s
      playBeep(ctx);
      intervalRef.current = setInterval(() => playBeep(ctx), 2500);
    } catch (e) {
      // AudioContext not available
    }

    return () => stop();
  }, [isOffered]);
}