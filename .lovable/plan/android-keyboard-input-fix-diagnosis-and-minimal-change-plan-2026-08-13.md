# Android keyboard/input fix — diagnosis and minimal change plan

## What the review covered

Reconciled the prior keyboard-related requests (v1.0.17 / versionCode 18 "keyboard not opening" fix, the earlier AAC freeze work, `captureInput: false`, `resize: 'native'`, Sentry instrumentation) against current HEAD, restricted to:

- `android/app/src/main/java/app/lovable/slpassistant/MainActivity.java`
- `android/app/src/main/AndroidManifest.xml`
- `capacitor.config.ts`
- `android/app/build.gradle` + `android/variables.gradle`

Current stack: Capacitor 8.4.1, compileSdk/targetSdk 36, minSdk 24, versionCode 18 / versionName 1.0.17.

## Why the keyboard opens but characters don't appear

The current `MainActivity.enableWebViewInput()` does two things that conflict with how Android connects the IME to an HTML input:

1. On every `ACTION_DOWN` where the WebView doesn't already have focus, it calls `webView.requestFocus()`. That moves Android focus to the **WebView container view**, not to the DOM element being tapped. Chromium then has to rebuild its input connection, and the tap that would have focused the `<input>` is processed after the focus change — so the DOM element ends up unfocused (or loses its editing session immediately after gaining it).
2. It calls `imm.showSoftInput(webView, SHOW_IMPLICIT)` directly on the container view. This raises the IME even when Chromium has **no editable DOM node** attached to the input connection. Result: the keyboard is visible, key events are delivered to a stale/empty input connection, and nothing renders in the field.

This is exactly the reported symptom pattern: keyboard appears on New Case → Name and on the AAC search field, but typed characters never show and `onChange` never fires. It affects every text field app-wide (both a plain route form and the AAC search input), which points at the native layer, not React code.

Also `webView.requestFocus()` in `onCreate` runs before the page has loaded, which is harmless but pointless.

Secondary, non-blocking notes (not the cause, but worth aligning while we're here):

- `capacitor.config.ts` already has `captureInput: false` and `Keyboard.resize: 'native'`, which is the correct combination for Capacitor 8 + `adjustResize`. Keep both.
- `AndroidManifest.xml` already has `android:windowSoftInputMode="adjustResize"` and does not force `stateHidden`. Correct — no change needed.
- `SmartKeyboard.tsx` re-focuses the search input on keyboard-hide only when it was already the active element. That is safe once the native focus stealing is removed; no change proposed.

## The minimal safe fix

Remove the native focus/IME hijacking entirely and let Chromium own the input connection, which is the supported behavior in Capacitor 8's `WebView`:

**`MainActivity.java`** — delete `enableWebViewInput()` and its `onTouch` listener, plus the now-unused imports (`MotionEvent`, `InputMethodManager`, `Context`, `WebView`). Keep only:

- `webView.setFocusable(true)` and `setFocusableInTouchMode(true)` (idempotent, allows the container to receive touch focus normally).
- No `requestFocus()`, no `showSoftInput()`, no touch listener.

Reduced to that, `MainActivity` is a plain `BridgeActivity` with a small post-bridge focus-flag tweak.

**No changes** to `AndroidManifest.xml` (already correct) or `capacitor.config.ts` (already correct).

**`android/app/build.gradle`** — bump `versionCode` 18 → 19 and `versionName` 1.0.17 → 1.0.18 so the next build is installable over the current one and the fix is traceable.

## Verification

1. Debug APK via the existing `Build Debug Android APK` workflow.
2. On device: New Case → Name (type, verify characters render and Save accepts), AAC search field (type, verify instant results), Profile display-name field, Login/Signup fields.
3. Confirm hardware Back still dismisses the IME (handled in `src/main-capacitor.tsx`, unchanged) and the AAC screen stays responsive.
4. Only after that passes, produce the signed release AAB.

## Files touched

| File | Change |
| --- | --- |
| `android/app/src/main/java/app/lovable/slpassistant/MainActivity.java` | Remove touch listener + manual `showSoftInput`/`requestFocus`; keep focusable flags |
| `android/app/build.gradle` | versionCode 19, versionName 1.0.18 |

No UI, feature, web, or backend code changes.
