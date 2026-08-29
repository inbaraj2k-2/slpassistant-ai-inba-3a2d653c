#!/usr/bin/env node
/**
 * Builds the standalone Capacitor SPA bundle into dist/capacitor/.
 *
 * The output is a fully static web app (index.html + hashed JS/CSS + public
 * assets) that Capacitor packages inside the APK/AAB. No hosted-URL redirect,
 * no SSR runtime — the app launches directly from local files.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const outDir = resolve(root, "dist/capacitor");

/**
 * TEMPORARY FORENSIC DIAGNOSTIC ONLY.
 *
 * The Android Gradle project compiles :capacitor-android directly from
 * node_modules/@capacitor/android/capacitor (see android/capacitor.settings.gradle).
 * This deterministic step verifies the lockfile's exact 8.4.1 package integrity
 * record and the installed package version, then instruments only
 * CapacitorWebView.onCreateInputConnection(). It deliberately fails closed if the
 * expected source shape is not present.
 */
function instrumentCapacitorInputConnection() {
  const expectedVersion = "8.4.1";
  const expectedIntegrity =
    "sha512-igtDCJ7QQn0P2qHFD9p4KXaa6V1b2PRNt+MxjVwtjTm/BJvqmiazOJq6rPjwFSZnfHm6iFoZk8TfzHd44pyBGw==";
  const lockPath = join(root, "bun.lock");
  const packagePath = join(root, "node_modules/@capacitor/android/package.json");
  const sourcePath = join(
    root,
    "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/CapacitorWebView.java",
  );

  if (!existsSync(lockPath) || !existsSync(packagePath) || !existsSync(sourcePath)) {
    throw new Error(
      "[SLP_INPUT_CONNECTION_DIAG] Required Capacitor 8.4.1 lock/package/source file is missing; refusing to instrument.",
    );
  }

  const lock = readFileSync(lockPath, "utf8");
  const lockEntry =
    /"@capacitor\/android":\s*\["@capacitor\/android@8\.4\.1",[\s\S]*?"sha512-igtDCJ7QQn0P2qHFD9p4KXaa6V1b2PRNt\+MxjVwtjTm\/BJvqmiazOJq6rPjwFSZnfHm6iFoZk8TfzHd44pyBGw=="\]/.test(
      lock,
    );
  if (!lockEntry) {
    throw new Error(
      "[SLP_INPUT_CONNECTION_DIAG] bun.lock does not prove the expected @capacitor/android@8.4.1 integrity; refusing to instrument.",
    );
  }

  const installedPackage = JSON.parse(readFileSync(packagePath, "utf8"));
  if (installedPackage.version !== expectedVersion) {
    throw new Error(
      "[SLP_INPUT_CONNECTION_DIAG] Installed @capacitor/android is " +
        installedPackage.version +
        ", expected " +
        expectedVersion +
        "; refusing to instrument.",
    );
  }

  let source = readFileSync(sourcePath, "utf8");
  if (source.includes("SLP_INPUT_CONNECTION_DIAG_BEGIN")) {
    console.log("[SLP_INPUT_CONNECTION_DIAG] Exact 8.4.1 source is already instrumented.");
    return;
  }

  const requiredAnchors = [
    "@Override",
    "public InputConnection onCreateInputConnection(EditorInfo outAttrs)",
    "CapConfig config;",
    "config.isInputCaptured()",
    "if (captureInput)",
    "new BaseInputConnection(this, false)",
    "return super.onCreateInputConnection(outAttrs)",
  ];
  for (const anchor of requiredAnchors) {
    if (!source.includes(anchor)) {
      throw new Error(
        "[SLP_INPUT_CONNECTION_DIAG] CapacitorWebView.java is missing required 8.4.1 InputConnection anchor: " +
          anchor +
          "; refusing to instrument.",
      );
    }
  }

  // Match only the known Capacitor 8.4.1 onCreateInputConnection implementation.
  // Whitespace may vary, but every semantic branch and return path is required.
  const inputConnectionMethodPattern =
    /    @Override\s+public InputConnection onCreateInputConnection\(EditorInfo outAttrs\) \{\s+CapConfig config;\s+if \(bridge != null\) \{\s+config = bridge\.getConfig\(\);\s+\} else \{\s+config = CapConfig\.loadDefault\(getContext\(\)\);\s+\}\s+boolean captureInput = config\.isInputCaptured\(\);\s+if \(captureInput\) \{\s+if \(capInputConnection == null\) \{\s+capInputConnection = new BaseInputConnection\(this, false\);\s+\}\s+return capInputConnection;\s+\}\s+return super\.onCreateInputConnection\(outAttrs\);\s+\}/;

  if (!inputConnectionMethodPattern.test(source)) {
    throw new Error(
      "[SLP_INPUT_CONNECTION_DIAG] CapacitorWebView.java does not contain the expected 8.4.1 onCreateInputConnection implementation; refusing to instrument.",
    );
  }

  source = source.replace(
    "import android.view.inputmethod.InputConnection;",
    "import android.view.inputmethod.InputConnection;\n\nimport android.view.inputmethod.InputConnectionWrapper;\n\nimport android.util.Log;",
  );

  const instrumentedMethod = `    // SLP_INPUT_CONNECTION_DIAG_BEGIN
    // Temporary forensic instrumentation. It preserves the original 8.4.1
    // selection logic and wraps only the exact InputConnection returned.
    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        logInputDiag(
            "onCreateInputConnection ts=" + System.currentTimeMillis() +
            " inputType=" + outAttrs.inputType +
            " imeOptions=" + outAttrs.imeOptions +
            " initialSelStart=" + outAttrs.initialSelStart +
            " initialSelEnd=" + outAttrs.initialSelEnd
        );

        CapConfig config;
        if (bridge != null) {
            config = bridge.getConfig();
        } else {
            config = CapConfig.loadDefault(getContext());
        }

        boolean captureInput = config.isInputCaptured();
        InputConnection original;
        if (captureInput) {
            if (capInputConnection == null) {
                capInputConnection = new BaseInputConnection(this, false);
            }
            original = capInputConnection;
        } else {
            original = super.onCreateInputConnection(outAttrs);
        }

        String originalClass = original == null ? "null" : original.getClass().getName();
        logInputDiag(
            "onCreateInputConnection returnedClass=" + originalClass +
            " captureInput=" + captureInput
        );

        if (original == null) {
            return null;
        }

        InputConnection wrapper = new LoggingInputConnection(original);
        logInputDiag(
            "onCreateInputConnection wrapperClass=" + wrapper.getClass().getName() +
            " delegateClass=" + originalClass
        );
        return wrapper;
    }
    // SLP_INPUT_CONNECTION_DIAG_END`;

  source = source.replace(inputConnectionMethodPattern, instrumentedMethod);

  const classAnchor = `    @Override
    @SuppressWarnings("deprecation")
    public boolean dispatchKeyEvent(KeyEvent event) {`;

  if (!source.includes(classAnchor)) {
    throw new Error(
      "[SLP_INPUT_CONNECTION_DIAG] Expected dispatchKeyEvent anchor is missing; refusing to instrument.",
    );
  }

  const wrapper = `    private static final String INPUT_DIAG_TAG = "SLP_INPUT_CONNECTION_DIAG";

    private static void logInputDiag(String message) {
        Log.d(INPUT_DIAG_TAG, message);
    }

    private static final class LoggingInputConnection extends InputConnectionWrapper {
        private final InputConnection delegate;
        private final String delegateClass;

        LoggingInputConnection(InputConnection delegate) {
            super(delegate, false);
            this.delegate = delegate;
            this.delegateClass = delegate.getClass().getName();
        }

        private void log(String method, String details) {
            logInputDiag(
                "ts=" + System.currentTimeMillis() +
                " method=" + method +
                " delegateClass=" + delegateClass +
                (details.isEmpty() ? "" : " " + details)
            );
        }

        private RuntimeException logAndRethrow(String method, RuntimeException exception) {
            log(method, "exception=" + exception.getClass().getName());
            return exception;
        }

        @Override
        public boolean commitText(CharSequence text, int newCursorPosition) {
            try {
                boolean result = delegate.commitText(text, newCursorPosition);
                log("commitText", "length=" + (text == null ? -1 : text.length()) + " newCursorPosition=" + newCursorPosition + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("commitText", exception);
            }
        }

        @Override
        public boolean setComposingText(CharSequence text, int newCursorPosition) {
            try {
                boolean result = delegate.setComposingText(text, newCursorPosition);
                log("setComposingText", "length=" + (text == null ? -1 : text.length()) + " newCursorPosition=" + newCursorPosition + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("setComposingText", exception);
            }
        }

        @Override
        public boolean setComposingRegion(int start, int end) {
            try {
                boolean result = delegate.setComposingRegion(start, end);
                log("setComposingRegion", "start=" + start + " end=" + end + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("setComposingRegion", exception);
            }
        }

        @Override
        public boolean deleteSurroundingText(int beforeLength, int afterLength) {
            try {
                boolean result = delegate.deleteSurroundingText(beforeLength, afterLength);
                log("deleteSurroundingText", "beforeLength=" + beforeLength + " afterLength=" + afterLength + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("deleteSurroundingText", exception);
            }
        }

        @Override
        public boolean deleteSurroundingTextInCodePoints(int beforeLength, int afterLength) {
            try {
                boolean result = delegate.deleteSurroundingTextInCodePoints(beforeLength, afterLength);
                log("deleteSurroundingTextInCodePoints", "beforeLength=" + beforeLength + " afterLength=" + afterLength + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("deleteSurroundingTextInCodePoints", exception);
            }
        }

        @Override
        public boolean sendKeyEvent(KeyEvent event) {
            try {
                boolean result = delegate.sendKeyEvent(event);
                log("sendKeyEvent", "action=" + event.getAction() + " keyCode=" + event.getKeyCode() + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("sendKeyEvent", exception);
            }
        }

        @Override
        public boolean finishComposingText() {
            try {
                boolean result = delegate.finishComposingText();
                log("finishComposingText", "result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("finishComposingText", exception);
            }
        }

        @Override
        public boolean beginBatchEdit() {
            try {
                boolean result = delegate.beginBatchEdit();
                log("beginBatchEdit", "result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("beginBatchEdit", exception);
            }
        }

        @Override
        public boolean endBatchEdit() {
            try {
                boolean result = delegate.endBatchEdit();
                log("endBatchEdit", "result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("endBatchEdit", exception);
            }
        }

        @Override
        public boolean setSelection(int start, int end) {
            try {
                boolean result = delegate.setSelection(start, end);
                log("setSelection", "start=" + start + " end=" + end + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("setSelection", exception);
            }
        }

        @Override
        public boolean performEditorAction(int editorAction) {
            try {
                boolean result = delegate.performEditorAction(editorAction);
                log("performEditorAction", "editorAction=" + editorAction + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("performEditorAction", exception);
            }
        }

        @Override
        public boolean performContextMenuAction(int id) {
            try {
                boolean result = delegate.performContextMenuAction(id);
                log("performContextMenuAction", "id=" + id + " result=" + result);
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("performContextMenuAction", exception);
            }
        }

        @Override
        public CharSequence getTextBeforeCursor(int length, int flags) {
            try {
                CharSequence result = delegate.getTextBeforeCursor(length, flags);
                log("getTextBeforeCursor", "requestedLength=" + length + " resultLength=" + (result == null ? -1 : result.length()));
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("getTextBeforeCursor", exception);
            }
        }

        @Override
        public CharSequence getTextAfterCursor(int length, int flags) {
            try {
                CharSequence result = delegate.getTextAfterCursor(length, flags);
                log("getTextAfterCursor", "requestedLength=" + length + " resultLength=" + (result == null ? -1 : result.length()));
                return result;
            } catch (RuntimeException exception) {
                throw logAndRethrow("getTextAfterCursor", exception);
            }
        }
    }

`;

  source = source.replace(classAnchor, wrapper + classAnchor);
  writeFileSync(sourcePath, source, "utf8");

  const verification = readFileSync(sourcePath, "utf8");
  if (!verification.includes("SLP_INPUT_CONNECTION_DIAG_BEGIN") || !verification.includes("LoggingInputConnection")) {
    throw new Error("[SLP_INPUT_CONNECTION_DIAG] Post-write verification failed.");
  }

  console.log(
    "[SLP_INPUT_CONNECTION_DIAG] Applied exact Capacitor 8.4.1 InputConnection instrumentation; " +
      "packageIntegrity=" +
      expectedIntegrity,
  );
}

console.log("[build-capacitor] Building Capacitor SPA bundle...");
execSync("bunx vite build -c vite.capacitor.config.ts", {
  stdio: "inherit",
  cwd: root,
});

// Vite emits the entry as index.capacitor.html (matching the input filename).
// Rename to index.html so Capacitor's WebView picks it up as the launcher.
const emittedHtml = join(outDir, "index.capacitor.html");
const finalHtml = join(outDir, "index.html");
if (existsSync(emittedHtml)) {
  renameSync(emittedHtml, finalHtml);
  console.log(`[build-capacitor] Renamed index.capacitor.html -> index.html`);
}

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

instrumentCapacitorInputConnection();

console.log(`[build-capacitor] Done. Bundle ready at ${outDir}`);
