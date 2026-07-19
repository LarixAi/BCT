import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { isNavigationVoiceEnabled } from "@/lib/navigation/navigationVoicePrefs";

const SPEECH_RATE = 0.95;
const SPEECH_LANG = "en-GB";
let webVoicesPrimed = false;
let speakChain = Promise.resolve();

function normalizeInstruction(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function primeWebSpeechVoices() {
  if (webVoicesPrimed || typeof window === "undefined" || !window.speechSynthesis) return;
  webVoicesPrimed = true;

  const load = () => {
    try {
      window.speechSynthesis.getVoices();
    } catch {
      /* ignore */
    }
  };

  load();
  if (typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", load, { once: true });
  }
}

function pickWebVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("en-gb")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ??
    voices[0] ??
    null
  );
}

function speakWithWebSpeech(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }

  primeWebSpeechVoices();

  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG;
      utterance.rate = SPEECH_RATE;
      const voice = pickWebVoice();
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}

async function speakWithNativeTts(text) {
  try {
    await TextToSpeech.stop();
    await TextToSpeech.speak({
      text,
      lang: SPEECH_LANG,
      rate: SPEECH_RATE,
      pitch: 1,
      volume: 1,
      category: "playback",
    });
    return true;
  } catch (err) {
    console.warn("[navigationVoice] native TTS failed:", err);
    return speakWithWebSpeech(text);
  }
}

/**
 * Speak a turn-by-turn instruction. Uses native TTS on phone, Web Speech in browser.
 * @returns {Promise<boolean>} whether speech was attempted
 */
export async function speakNavigationInstruction(text, { force = false } = {}) {
  const instruction = normalizeInstruction(text);
  if (!instruction) return false;
  if (!force && !isNavigationVoiceEnabled()) return false;

  speakChain = speakChain.then(async () => {
    if (Capacitor.isNativePlatform()) {
      return speakWithNativeTts(instruction);
    }
    return speakWithWebSpeech(instruction);
  });

  return speakChain;
}

export async function stopNavigationVoice() {
  speakChain = Promise.resolve();

  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
    } catch {
      /* ignore */
    }
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/** Warm up TTS after a user gesture so the first instruction is not skipped on Android. */
export async function primeNavigationVoice() {
  if (!isNavigationVoiceEnabled()) return;
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.speak({ text: " ", lang: SPEECH_LANG, rate: 1, volume: 0.01 });
      await TextToSpeech.stop();
    } catch {
      /* ignore */
    }
    return;
  }
  primeWebSpeechVoices();
}

export function formatDistanceForSpeech(metres) {
  const m = Number(metres);
  if (!Number.isFinite(m) || m <= 0) return null;
  if (m >= 1000) {
    const km = m / 1000;
    const label = km >= 10 ? `${Math.round(km)} kilometres` : `${km.toFixed(1)} kilometres`;
    return `In ${label}`;
  }
  const rounded = Math.max(50, Math.round(m / 50) * 50);
  return `In ${rounded} metres`;
}

/**
 * Phase 6 — distance prompt thresholds. Pure helper imported here so the
 * runner can stay lean. See `voicePromptThresholds.js` for tunables and the
 * speed-aware lookahead logic.
 */
import { computeThresholdsForSpeed } from "@/lib/navigation/voicePromptThresholds";

/**
 * Returns a spoken prompt when crossing distance thresholds toward the current step.
 * Each threshold fires once per step index.
 *
 * @param {object}  args
 * @param {number}  args.distanceMetres
 * @param {string}  args.instruction
 * @param {number}  args.stepIndex
 * @param {object}  args.spokenThresholdsRef  React ref of `{ [stepKey]: Set<threshold> }`.
 * @param {number}  [args.speedMps]           Phase 6 — vehicle speed for lookahead.
 */
export function buildDistanceAheadPrompt({
  distanceMetres,
  instruction,
  stepIndex,
  spokenThresholdsRef,
  speedMps = null,
}) {
  if (!instruction || distanceMetres == null || !Number.isFinite(distanceMetres)) return null;

  const key = String(stepIndex ?? 0);
  if (!spokenThresholdsRef.current[key]) {
    spokenThresholdsRef.current[key] = new Set();
  }
  const spoken = spokenThresholdsRef.current[key];

  const thresholds = computeThresholdsForSpeed(speedMps);

  for (const threshold of thresholds) {
    if (distanceMetres <= threshold && !spoken.has(threshold)) {
      spoken.add(threshold);
      const prefix = formatDistanceForSpeech(distanceMetres);
      return prefix ? `${prefix}, ${instruction}` : instruction;
    }
  }

  return null;
}

// Re-exported for callers that pull from the runner module.
export { computeThresholdsForSpeed };
