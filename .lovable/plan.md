
# Convert SLP Assist AI into a real offline Android app

Goal: the APK/AAB must ship the entire frontend inside the app, launch without any hosted redirect, and only reach the network for AI analysis (and Supabase sync when online). Games, Knowledge Base, Saved Reports and other local UI must run fully offline.

## Current state

- `capacitor.config.ts` points `webDir` at `.output/public` (the SSR build).
- `scripts/prepare-capacitor-web.mjs` writes a fake `index.html` that immediately redirects to `https://slpassistant-ai-inba.lovable.app`. That is what makes the installed app "open the website".
- All routing is TanStack Start with SSR + server functions (`createServerFn` + Supabase auth middleware).
- AI calls, DB reads, and auth all go through server functions today.

None of that survives inside an APK — a Capacitor WebView has no Node/Workers runtime.

## Approach

Ship a separate **client-only SPA bundle** for Capacitor while keeping the existing SSR web app untouched for browser/desktop users.

### 1. New Capacitor-only SPA build

- Add `vite.capacitor.config.ts` that builds a plain React SPA (no TanStack Start SSR plugin) into `dist/capacitor/`.
- Entry `src/capacitor-main.tsx` mounts the same route tree using `createRouter` in a **memory-history / client-only** mode (no SSR, no loaders that require server functions).
- Emit a real static `index.html` referencing the hashed JS/CSS bundles — no redirect script.

### 2. Replace server functions with direct Supabase calls in the mobile bundle

- Introduce a thin `src/lib/data-access.ts` layer used by routes for reads/writes.
- Web build: keeps calling existing `createServerFn` wrappers.
- Capacitor build: swapped via Vite alias to a version that calls `supabase` (browser client) directly with the user's session. AI analysis calls the Lovable AI Gateway directly using a per-user session token from Supabase Edge Function (`analyze-case`) — no server functions available.
- Move the AI prompt/normalisation helpers into a shared module usable from both.

Trade-off: AI analysis on mobile must go through an existing/new Supabase Edge Function endpoint (`/functions/v1/analyze-case`) because we can't hide `LOVABLE_API_KEY` in the APK. Keep the current server-function path for web.

### 3. Offline data for Games / Knowledge Base

- Games already read from `src/lib/games-data.ts` — pure JSON, works offline.
- Knowledge Base and disorder catalog currently query Supabase. Add a build step `scripts/snapshot-clinical-data.mjs` that exports disorders/assessments/materials/therapy_goals/clinical_sources to `src/generated/clinical-snapshot.json` at build time.
- Data access layer: try Supabase when online, fall back to the bundled snapshot when offline. Saved Reports read from a local IndexedDB cache (`idb-keyval`) populated whenever the app is online; writes queue locally and sync when back online.

### 4. Network detection + AI gating

- Add `src/hooks/useOnlineStatus.ts` using `@capacitor/network` on native and `navigator.onLine` + `online`/`offline` events on web.
- New-case page: when offline, disable the "Analyze" button, show inline banner "Internet required for AI analysis". Everything else on the page stays interactive.
- Add a small offline indicator in `AppShell`.

### 5. Capacitor wiring

- `capacitor.config.ts`: `webDir: 'dist/capacitor'`, remove `server.url` env override (no live-reload to hosted site by default), keep `androidScheme: 'https'`.
- Install `@capacitor/network`.
- Replace `scripts/prepare-capacitor-web.mjs` with `scripts/build-capacitor.mjs` that runs `vite build -c vite.capacitor.config.ts` and copies `public/manifest.webmanifest`, icons, etc. into `dist/capacitor/`.
- Update `package.json` scripts: `build:capacitor`, `cap:sync` runs `build:capacitor && cap sync android`.

### 6. GitHub Actions

- `.github/workflows/build-aab.yml`:
  - `bun run build` (web SSR, unchanged) — keep for parity.
  - `bun run build:capacitor` (new SPA bundle).
  - `bunx cap sync android`.
  - `./gradlew bundleRelease` — already wired to `android/key.properties` + `slpassistai-release.jks`, produces signed AAB artifact suitable for Play Internal Testing.

### 7. Auth on device

- Google OAuth via Supabase works in the WebView using the existing publishable key; redirect URL uses `capacitor://localhost` scheme registered as a Supabase allowed redirect. Guest mode continues to work.
- (Documented: user must add `capacitor://localhost` to Supabase Auth redirect URLs — I'll surface this after implementation.)

## Deliverables

- New `vite.capacitor.config.ts`, `src/capacitor-main.tsx`, `src/lib/data-access.ts` + Vite alias.
- Bundled clinical snapshot + Games/KB routes reading from it when offline.
- `useOnlineStatus` hook + AI gating UI on `new-case`.
- Updated `capacitor.config.ts`, `package.json` scripts, removed hosted-redirect shell.
- Updated CI producing a signed AAB from the bundled SPA.

## Out of scope

- No changes to Gemini prompt, JSON schema, ranking, PDF logic, or existing web SSR routes.
- No native plugins beyond `@capacitor/network`.
- No Play Store listing assets — only the signed AAB.

## Confirm before I build

This is a large refactor (new build pipeline + data-access abstraction + snapshotting clinical data). Two questions before I start:

1. **AI on mobile**: OK to route mobile AI calls through a Supabase Edge Function so `LOVABLE_API_KEY` stays server-side? (Required — we can't ship the key in the APK.)
2. **Auth on mobile**: OK to require adding `capacitor://localhost` to Supabase Auth allowed redirects (one-time setting) so Google sign-in works inside the app? Guest mode works regardless.
