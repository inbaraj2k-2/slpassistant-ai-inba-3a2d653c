#!/usr/bin/env node
/**
 * Builds the standalone Capacitor SPA bundle into dist/capacitor/.
 *
 * The output is a fully static web app (index.html + hashed JS/CSS + public
 * assets) that Capacitor packages inside the APK/AAB. No hosted-URL redirect,
 * no SSR runtime — the app launches directly from local files.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const outDir = resolve(root, "dist/capacitor");

console.log("[build-capacitor] Building Capacitor SPA bundle...");
execSync("bunx vite build -c vite.capacitor.config.ts", {
  stdio: "inherit",
  cwd: root,
});

// Copy public/ assets (icons, manifest, kb-snapshot.json, etc.) into the
// bundle so they resolve at /manifest.webmanifest, /kb-snapshot.json, etc.
const publicDir = resolve(root, "public");
if (existsSync(publicDir)) {
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(publicDir)) {
    const src = join(publicDir, entry);
    const dest = join(outDir, entry);
    if (statSync(src).isDirectory()) {
      cpSync(src, dest, { recursive: true });
    } else {
      cpSync(src, dest);
    }
  }
  console.log(`[build-capacitor] Copied public/ assets into ${outDir}`);
}

const indexPath = join(outDir, "index.html");
if (!existsSync(indexPath)) {
  console.error(`[build-capacitor] Expected ${indexPath} to exist after build.`);
  process.exit(1);
}
console.log(`[build-capacitor] Done. Bundle ready at ${outDir}`);
