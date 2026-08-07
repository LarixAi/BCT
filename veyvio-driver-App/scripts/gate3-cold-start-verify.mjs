#!/usr/bin/env node
/**
 * Gate 3 / Gate 1 — cold-start should not restore /documents after biometric unlock.
 * Force-stops app, relaunches, waits for WebView; reports initial URL hint from logcat.
 *
 *   node scripts/gate3-cold-start-verify.mjs
 */
import { spawnSync } from "node:child_process";

const PKG = "uk.veyvio.driver";

function adb(...args) {
  return spawnSync("adb", args, { encoding: "utf8" });
}

function hasDevice() {
  const out = adb("devices");
  return (out.stdout || "")
    .split("\n")
    .slice(1)
    .some((line) => /\tdevice$/.test(line.trim()));
}

if (!hasDevice()) {
  console.error("No adb device connected.");
  process.exit(1);
}

console.log("Cold-start verify — app should land on Home after unlock, not /documents\n");

adb("shell", "am", "force-stop", PKG);
adb("logcat", "-c");
adb("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1");
adb("shell", "sleep", "4");

const logs = adb("logcat", "-d", "-t", "120");
const combined = `${logs.stdout || ""}\n${logs.stderr || ""}`;
const documentsHit = /\/documents/i.test(combined);
const homeHit = /\/(?:$|\?)|pathname.*["']\/["']/i.test(combined);

console.log(`Log mentions /documents on launch: ${documentsHit ? "yes (investigate)" : "no"}`);
console.log(`Log hints Home route: ${homeHit ? "yes" : "unclear"}`);
console.log("\nManual: unlock biometrics on device — you should see Home, not Documents.");
console.log("Code path: DriverApp handleBiometricUnlocked navigates to / on cold start.");
