#!/usr/bin/env node
/**
 * Launcher: large VEYVIO / YARD wordmark (fills adaptive safe zone).
 * Splash: wordmark at ~44% screen width.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "scripts", "icons");
const PUBLIC_ICONS = path.join(ROOT, "public", "icons");
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

async function renderSvg(svgPath, width, height, options = {}) {
  const svg = await readFile(svgPath);
  let pipeline = sharp(svg, { density: 300 }).resize(width, height, {
    fit: "fill",
    background: options.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (options.opaque) {
    pipeline = pipeline.flatten({ background: MIDNIGHT });
  }
  return pipeline.png().toBuffer();
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

  await mkdir(PUBLIC_ICONS, { recursive: true });
  await writePng(full1024, path.join(PUBLIC_ICONS, "icon-1024.png"));
  await writePng(full1024, path.join(PUBLIC_ICONS, "icon-512.png"));
  await writePng(
    await sharp(full1024).resize(192, 192).png().toBuffer(),
    path.join(PUBLIC_ICONS, "icon-192.png"),
  );
  await writePng(foreground1024, path.join(PUBLIC_ICONS, "icon-foreground-1024.png"));
  await writePng(full1024, path.join(PUBLIC_ICONS, "maskable-icon-512.png"));

  const appleTouch = await sharp(full1024).resize(180, 180).png().toBuffer();
  await writePng(appleTouch, path.join(ROOT, "public", "apple-touch-icon.png"));
  await writePng(await sharp(full1024).resize(32, 32).png().toBuffer(), path.join(ROOT, "public", "favicon-32x32.png"));
  await writePng(await sharp(full1024).resize(16, 16).png().toBuffer(), path.join(ROOT, "public", "favicon-16x16.png"));

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

  console.log("Brand icons rendered:");
  console.log("  Launcher: large VEYVIO / YARD (1024 icon-wordmark.svg, white on midnight)");
  console.log("  Splash: wordmark at 44% screen width");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
