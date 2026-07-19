let lastPlayedAt = 0;

/**
 * Short alert tone for operational notifications (distinct from looping job-offer alert).
 * Debounced so push + realtime do not double-play.
 */
export function playNotificationSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 1500) return;
  lastPlayedAt = now;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const start = () => {
      const tones = [
        { freq: 740, start: 0, duration: 0.1 },
        { freq: 988, start: 0.14, duration: 0.14 },
      ];

      tones.forEach(({ freq, start: offset, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + offset + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + duration);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + duration + 0.05);
      });

      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 500);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(start).catch(() => {});
      return;
    }

    start();
  } catch {
    /* Audio not available */
  }
}
