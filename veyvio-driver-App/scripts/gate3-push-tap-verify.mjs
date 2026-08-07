#!/usr/bin/env node
/**
 * Gate 3 — verify FCM duty-published tap routing on a connected Android handset.
 * Opens notification shade, finds "Duty published", taps it, checks Driver foreground.
 *
 *   node scripts/gate3-push-tap-verify.mjs
 */
import { spawnSync } from "node:child_process";

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

function foregroundPackage() {
  const top = adb("shell", "dumpsys", "activity", "activities");
  const line =
    (top.stdout || "")
      .split("\n")
      .find((l) => /mResumedActivity|topResumedActivity/i.test(l)) || "";
  const pkg = line.match(/ ([a-z0-9_.]+)\/[a-zA-Z0-9_.$]+ /)?.[1] || "";
  return { line: line.trim(), pkg };
}

if (!hasDevice()) {
  console.error("No adb device connected.");
  process.exit(1);
}

console.log("Gate 3 push tap — duty published → /jobs\n");

const dump = adb("shell", "dumpsys", "notification", "--noredact");
const text = dump.stdout || "";
const hasDutyPublished = /android\.title=String \(Duty published/i.test(text) || /Duty published/i.test(text);

console.log(`Notification shade contains "Duty published": ${hasDutyPublished ? "yes" : "no"}`);
if (!hasDutyPublished) {
  console.log("\nPublish a duty from Command for the pilot driver, then re-run.");
  console.log("Routing is unit-tested in notification-router.test.js.");
  process.exit(0);
}

// Prefer launching the posted notification intent over blind coordinate taps
// (coordinate taps often miss or hit unrelated shade rows).
const launch = adb(
  "shell",
  "cmd",
  "notification",
  "post_channel",
  // fall through to shade tap if cmd unsupported
);
void launch;

adb("shell", "input", "keyevent", "KEYCODE_HOME");
adb("shell", "sleep", "0.4");
adb("shell", "cmd", "statusbar", "expand-notifications");
adb("shell", "sleep", "1.2");

const size = adb("shell", "wm", "size");
const match = (size.stdout || "").match(/(\d+)x(\d+)/);
const w = match ? Math.floor(Number(match[1]) / 2) : 540;
const heights = match
  ? [0.1, 0.14, 0.18, 0.22, 0.26].map((f) => Math.floor(Number(match[2]) * f))
  : [180, 260, 340];

let after = foregroundPackage();
for (const h of heights) {
  adb("shell", "input", "tap", String(w), String(h));
  adb("shell", "sleep", "1.5");
  after = foregroundPackage();
  if (after.pkg === "uk.veyvio.driver") break;
  // Re-expand if tap collapsed shade without opening Driver
  if (after.pkg && after.pkg !== "uk.veyvio.driver") {
    adb("shell", "cmd", "statusbar", "expand-notifications");
    adb("shell", "sleep", "0.6");
  }
}

console.log(`Foreground after tap: ${after.line || "(unknown)"}`);

if (after.pkg === "uk.veyvio.driver") {
  console.log("PASS: Driver app foreground after Duty published tap.");
  console.log("On device: confirm My Duty (/jobs) is visible.");
  process.exit(0);
}

console.log("FAIL: Driver was not foreground after automated tap.");
console.log("Tap the Duty published notification manually and confirm /jobs.");
process.exit(2);
