#!/usr/bin/env node
import { networkInterfaces } from "node:os";

function localIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

const ip = localIp();
const port = process.env.PHONE_DEV_PORT ?? "8081";
const base = `http://${ip}:${port}`;

console.log("");
console.log("Veyvio Driver — open on your phone (same Wi‑Fi):");
console.log("");
console.log(`  ${base}/sign-in`);
console.log(`  ${base}/splash`);
console.log("");
console.log("Native Android live reload:");
console.log("");
console.log(`  CAPACITOR_SERVER_URL=${base} npx cap run android`);
console.log("");
