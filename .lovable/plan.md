# Android input freeze: diagnosis and minimal fix

## What I found (from the current code only)

Tapping the Name field works at the input level — Gboard opens, so the HTML input really does get focus and a working input connection. What fails is everything *after* that: the screen stops updating and typed characters never land. That points at the screen being torn down and rebuilt when the keyboard appears, not at the text field itself.

### Primary cause: the screen is destroyed every time the keyboard opens

`android/app/src/main/AndroidManifest.xml` declares:

```text
android:configChanges="orientation|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
```

`keyboard` and `keyboardHidden` are missing. Those two are in the stock Capacitor manifest for exactly this reason: when they are absent, Android treats "soft keyboard shown/hidden" as an unhandled configuration change and recreates the whole activity. Recreating the activity recreates the web view, which reloads the app from scratch and throws away all React state — including the half-typed name. Visible result: keyboard is up, caret is frozen on a stale frame, taps do nothing, committed text disappears.

This matches every reported symptom, affects *every* text field in the app equally (Name, Profile display name, search boxes), and is independent of any React component — consistent with the fact that per-input fixes never helped.

### Secondary cause: the app never leaves the splash-screen window theme

`android/app/src/main/res/values/styles.xml`:

```text
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="android:background">@drawable/splash</item>
</style>
```

This is the theme the activity keeps for its whole lifetime (`AndroidManifest.xml`), yet there is no splash-screen plugin installed and no `postSplashScreenTheme`, so nothing ever hands the window over to a normal app theme. The window therefore keeps splash-screen window behaviour and a full-screen splash background behind the web view, which makes stale/blank frames much more likely while the window is being resized for the keyboard.

### Things I checked and cleared

- No native keyboard/IME service, no `MainActivity` focus or `showSoftInput` code — `MainActivity.java` is a plain `BridgeActivity`. Nothing hijacks focus natively.
- `captureInput` is absent in `capacitor.config.ts` (correct) and `adjustResize` is present.
- No global `focus()`, `blur()`, touch, resize, or visual-viewport listeners anywhere in `src/` (only a sidebar keyboard shortcut and a calendar focus call). Crash reporting in `src/lib/sentry.ts` is off the interaction path.
- `src/styles.css` explicitly keeps `user-select: text` and `touch-action: auto` on inputs; no transform/blur/containment traps.
- The Name field (`src/routes/_authenticated/new-case.tsx`) is a plain controlled input inside a memoised component — no remount-per-keystroke pattern.

### Two smaller issues worth fixing in the same pass

- `index.capacitor.html` loads the Plus Jakarta Sans font from Google over the network as a render-blocking stylesheet. In an offline/slow-network APK this delays first paint and adds a second freeze-looking symptom at startup.
- `android/app/src/main/res/layout/activity_main.xml` contains an unused, id-less `WebView`. Capacitor 8 does not use this layout; it is dead weight that only invites confusion.

### Honest limitation

This sandbox has no Java, Android SDK, or `adb`, so I cannot run the app on a device to capture logcat. The diagnosis above rests on current source evidence and known Android activity/config behaviour, and the fix is confirmable on your phone in one build (type in Name; the field should keep text and stay responsive).

## Proposed fix (minimal, no architecture change)

1. `android/app/src/main/AndroidManifest.xml` — add `keyboard|keyboardHidden` to `android:configChanges` so the keyboard opening no longer recreates the screen. Leave `adjustResize` and everything else untouched.
2. `android/app/src/main/res/values/styles.xml` — re-point `AppTheme.NoActionBarLaunch` at `AppTheme.NoActionBar` so the app runs under a normal app theme instead of a permanent splash theme.
3. `android/app/src/main/res/layout/activity_main.xml` — delete this unused layout.
4. `index.capacitor.html` — make the web font non-blocking (load it without blocking first paint) so the app renders instantly offline; visual design unchanged.
5. `android/app/build.gradle` — bump to `versionCode 24` / `versionName 1.0.23` so the test build is unmistakably newer.

Nothing in React, auth, AAC, clinical logic, database, AI, reports, or the `captureInput`/`adjustResize` configuration changes. APK and AAB workflows stay separate and untouched.

## Validation I will run

Capacitor SPA build, TypeScript check, `cap sync android`, manifest/XML sanity checks. I will not claim an APK or AAB exists — GitHub Actions must perform the real Android build, then the fix must be confirmed on your phone.
