#!/usr/bin/env node
/**
 * Veyvio Driver — launcher + native splash assets.
 * Launcher: white VEYVIO / DRIVER on midnight (#0B1526).
 * Splash: wordmark at ~40% screen width on midnight.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "scripts", "icons");
const ANDROID_RES = path.join(ROOT, "android", "app", "src", "main", "res");

const MIDNIGHT = "#0B1526";
const CANVAS = 1024;

const MIPMAP = {
  "mipmap-mdpi": { launcher: 48, foreground: 108 },
  "mipmap-hdpi": { launcher: 72, foreground: 162 },
  "mipmap-xhdpi": { launcher: 96, foreground: 216 },
  "mipmap-xxhdpi": { launcher: 144, foreground: 324 },
  "mipmap-xxxhdpi": { launcher: 192, foreground: 432 },
};

const SPLASH_SIZES = [
  { w: 480, h: 320, out: "drawable/splash.png" },
  { w: 320, h: 480, out: "drawable-port-mdpi/splash.png" },
  { w: 480, h: 800, out: "drawable-port-hdpi/splash.png" },
  { w: 720, h: 1280, out: "drawable-port-xhdpi/splash.png" },
  { w: 960, h: 1600, out: "drawable-port-xxhdpi/splash.png" },
  { w: 1280, h: 1920, out: "drawable-port-xxxhdpi/splash.png" },
  { w: 480, h: 320, out: "drawable-land-mdpi/splash.png" },
  { w: 800, h: 480, out: "drawable-land-hdpi/splash.png" },
  { w: 1280, h: 720, out: "drawable-land-xhdpi/splash.png" },
  { w: 1600, h: 960, out: "drawable-land-xxhdpi/splash.png" },
  { w: 1920, h: 1280, out: "drawable-land-xxxhdpi/splash.png" },
];

async function renderSvg(svgPath, width, height) {
  const svg = await readFile(svgPath);
  return sharp(svg, { density: 300 })
    .resize(width, height, { fit: "fill", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writePng(buffer, filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

async function solidSplash(width, height) {
  return sharp({
    create: { width, height, channels: 3, background: MIDNIGHT },
  })
    .png()
    .toBuffer();
}

async function compositeSplash(width, height, wordmarkBuffer) {
  const targetLogoWidth = Math.round(width * 0.4);
  const resizedLogo = await sharp(wordmarkBuffer)
    .resize(targetLogoWidth, null, { fit: "inside" })
    .png()
    .toBuffer();

  const background = await solidSplash(width, height);
  return sharp(background)
    .composite([{ input: resizedLogo, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function buildLauncherLayers(iconSvgPath) {
  const wordmark = await renderSvg(iconSvgPath, CANVAS, CANVAS);

  const full1024 = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 3, background: MIDNIGHT },
  })
    .composite([{ input: wordmark, gravity: "centre" }])
    .png()
    .toBuffer();

  const foreground1024 = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: wordmark, gravity: "centre" }])
    .png()
    .toBuffer();

  return { full1024, foreground1024, wordmark };
}

async function main() {
  const iconWordmarkSvg = path.join(ICONS_DIR, "icon-wordmark.svg");
  const splashWordmarkSvg = path.join(ICONS_DIR, "splash-wordmark.svg");

  const { full1024, foreground1024, wordmark: launcherWordmark } =
    await buildLauncherLayers(iconWordmarkSvg);
  const splashWordmark = await renderSvg(splashWordmarkSvg, 800, 320);

  for (const [folder, sizes] of Object.entries(MIPMAP)) {
    const outDir = path.join(ANDROID_RES, folder);
    const launcher = await sharp(full1024).resize(sizes.launcher, sizes.launcher).png().toBuffer();
    const foreground = await sharp(foreground1024)
      .resize(sizes.foreground, sizes.foreground)
      .png()
      .toBuffer();

    await writePng(launcher, path.join(outDir, "ic_launcher.png"));
    await writePng(launcher, path.join(outDir, "ic_launcher_round.png"));
    await writePng(foreground, path.join(outDir, "ic_launcher_foreground.png"));
  }

  const splashIconLogo = await sharp(launcherWordmark)
    .resize(Math.round(432 * 0.56), Math.round(432 * 0.56), { fit: "inside" })
    .png()
    .toBuffer();
  const splashIcon = await sharp({
    create: { width: 432, height: 432, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: splashIconLogo, gravity: "centre" }])
    .png()
    .toBuffer();
  await writePng(splashIcon, path.join(ANDROID_RES, "drawable", "splash_icon.png"));

  for (const { w, h, out } of SPLASH_SIZES) {
    const splash = await compositeSplash(w, h, splashWordmark);
    await writePng(splash, path.join(ANDROID_RES, out));
  }

  console.log("Veyvio Driver brand icons rendered:");
  console.log("  Launcher: VEYVIO / DRIVER (white on #0B1526)");
  console.log("  Splash: Driver Sky sublabel, midnight background");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
