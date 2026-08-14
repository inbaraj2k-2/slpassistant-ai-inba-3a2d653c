// Global, Android/Capacitor-only keyboard viewport helper.
//
// Purpose: when the software keyboard appears, keep the CURRENTLY focused
// <input>/<textarea> visible without ever touching focus. We deliberately do
// NOT call blur(), focus(), or scroll the WebView container — stealing or
// re-asserting focus during the IME animation is exactly what breaks
// Chromium's InputConnection (keyboard opens, typed characters never land).
//
// Web behaviour is unchanged: this is a no-op outside a native Capacitor shell.

let installed = false;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

function scrollActiveInputIntoView() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return;
  const tag = el.tagName;
  const editable = tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  if (!editable) return;
  try {
    // "nearest" + instant avoids layout thrash and never moves focus.
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  } catch {
    /* no-op */
  }
}

export function installKeyboardViewportHandling() {
  if (installed || !isNative()) return;
  installed = true;

  void (async () => {
    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      // Only react AFTER the IME finished animating, so we never interfere
      // with the input connection being established.
      await Keyboard.addListener("keyboardDidShow", () => {
        requestAnimationFrame(scrollActiveInputIntoView);
      });
    } catch {
      /* plugin unavailable — nothing to do */
    }
  })();
}
