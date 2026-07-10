#!/usr/bin/env node
/**
 * Prepares the Capacitor `webDir` (.output/public) for `cap sync`.
 *
 * The app is an SSR TanStack Start build, so `vite build` does not emit a
 * static `index.html`. Capacitor requires one inside `webDir` or `cap sync`
 * fails with "The web assets directory (./.output/public) must contain an index.html file".
 *
 * We generate a minimal shell that immediately loads the hosted app URL so
 * the Android wrapper keeps working against the deployed backend/SSR routes.
 * No UI or business logic is affected — the React app itself is unchanged.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const webDir = resolve(process.cwd(), '.output', 'public');
mkdirSync(webDir, { recursive: true });

const appUrl =
  process.env.CAP_APP_URL?.trim() ||
  'https://slpassistant-ai-inba.lovable.app';

const indexPath = resolve(webDir, 'index.html');
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>SLP Assist AI</title>
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/favicon.ico" />
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </head>
  <body>
    <noscript>
      <p>Open <a href="${appUrl}">${appUrl}</a> to continue.</p>
    </noscript>
  </body>
</html>
`;

writeFileSync(indexPath, html, 'utf8');
console.log(`[prepare-capacitor-web] wrote ${indexPath}`);
