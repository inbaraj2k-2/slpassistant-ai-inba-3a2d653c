// Global, Android/Capacitor-only keyboard viewport helper.
//
// Purpose: when the software keyboard appears, keep the CURRENTLY focused
// <input>/<textarea> visible without ever touching focus. We deliberately do
// NOT call blur(), focus(), or scroll the WebView container.
//
// For the current Android keyboard diagnostic/fix test, the post-IME
// keyboardDidShow viewport manipulation is disabled so Chromium's native
// InputConnection and DOM input lifecycle are not interrupted.
//
// Web behaviour is unchanged: this is a no-op outside a native Capacitor shell.

let installed = false;

function isNative(): boolean {
  if (typeof window === "undefined") return false;

  const cap = (
    window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
      };
    }
  ).Capacitor;

  return !!cap?.isNativePlatform?.();
}

function scrollActiveInputIntoView() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return;

  const tag = el.tagName;
  const editable =
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    el.isContentEditable;

  if (!editable) return;

  try {
    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });
  } catch {
    /* no-op */
  }
}

export function installKeyboardViewportHandling() {
  if (installed || !isNative()) return;

  installed = true;

  // Intentionally disabled for the Android keyboard diagnostic.
  // Do not add keyboardDidShow, requestAnimationFrame, focus, blur,
  // Keyboard.show(), Keyboard.hide(), or scrollIntoView() here.
}
