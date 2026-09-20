# Android build (Capacitor)

This project is wrapped with Capacitor so you can generate an Android APK / AAB
without touching the existing web app or business logic.

## Prerequisites (local machine)

- Node 20+, Bun or npm
- Android Studio (latest) with:
  - Android SDK Platform 34+
  - Android SDK Build-Tools
  - A JDK 17 (bundled with Android Studio)

## One-time setup

```bash
bun install
bun run cap:add:android      # creates ./android (only run once)
```

`./android` is a native Gradle project. Commit it if you want reproducible
native builds; otherwise re-run `cap:add:android` on a fresh checkout.

## Build & run cycle

Every time the web code changes:

```bash
bun run build:capacitor      # builds the local SPA into dist/capacitor/
bun run cap:sync             # rebuilds and syncs Android assets
bun run cap:open:android     # opens Android Studio
```

`cap:sync` verifies that `android/app/src/main/assets/public/index.html` is
the bundled local React SPA and rejects hosted redirects before Android Studio
builds an APK.

Then in Android Studio: **Build > Build Bundle(s) / APK(s)** to produce an APK
or AAB. For a signed release use **Build > Generate Signed Bundle / APK**.

## Live reload against the preview (optional)

```bash
CAP_SERVER_URL="https://<your-preview-url>" bun run cap:sync
bun run cap:open:android
```

Unset `CAP_SERVER_URL` and re-sync before shipping a release build.

## Notes

- `webDir` is `dist/capacitor`. Android release builds must use
  `build:capacitor` followed by `cap:sync`; they never use `.output/public`
  or a hosted-URL redirect.
- The web app is unchanged; the configured Capacitor plugins are available
  for native application features.
- SSR / server functions require network access; make sure the deployed
  backend (Lovable Cloud) is reachable from the device.
