#!/usr/bin/env node
/**
 * Guards the Android release pipeline against stale or hosted web assets.
 * This runs after `cap sync android` and verifies the exact files Gradle will
 * package under android/app/src/main/assets/public.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const assetDir = resolve(root, "android", "app", "src", "main", "assets");
const indexPath = resolve(assetDir, "public", "index.html");
const configPath = resolve(assetDir, "capacitor.config.json");

function fail(message) {
  console.error(`[verify-capacitor-assets] ${message}`);
  process.exit(1);
}

let indexHtml;
let config;
try {
  indexHtml = readFileSync(indexPath, "utf8");
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  fail(`unable to read synced Capacitor assets: ${error.message}`);
}

if (/lovable\.app|window\.location\.(replace|assign)|http-equiv=["']refresh/i.test(indexHtml)) {
  fail("Android index.html redirects to a hosted URL instead of launching the bundled SPA.");
}

if (!indexHtml.includes('<div id="root"></div>') || !/type=["']module["']/.test(indexHtml)) {
  fail("Android index.html is not the bundled Capacitor React SPA entrypoint.");
}

if (config.android?.captureInput !== false) {
  fail(`expected android.captureInput=false, received ${JSON.stringify(config.android?.captureInput)}.`);
}

if (config.plugins?.Keyboard?.resize !== "none") {
  fail(`expected Keyboard.resize=\"none\", received ${JSON.stringify(config.plugins?.Keyboard?.resize)}.`);
}

console.log("[verify-capacitor-assets] verified local SPA assets, captureInput=false, and Keyboard.resize=none.");
