// Cross-platform confirmation dialog.
//
// On Android/iOS (Capacitor) we MUST NOT use window.confirm(): the
// synchronous JS dialog steals focus while a pointer gesture is still in
// flight, so the matching pointerup / pointercancel never returns to the
// WebView. The result is the well-known "buttons become unresponsive
// until the app is force-closed" freeze — very reproducible on the AAC
// screen where every delete/menu tap sits inside a live pointer chain.
//
// The Capacitor Dialog plugin runs the confirmation on the native side
// asynchronously, so the WebView touch pipeline is never blocked.

import { isNative } from "./native";

export async function confirmAsync(message: string, title = "Confirm"): Promise<boolean> {
  if (isNative()) {
    try {
      const { Dialog } = await import("@capacitor/dialog");
      const res = await Dialog.confirm({
        title,
        message,
        okButtonTitle: "OK",
        cancelButtonTitle: "Cancel",
      });
      return !!res.value;
    } catch (err) {
      console.warn("[confirm] native Dialog failed, defaulting to allow", err);
      return true;
    }
  }
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}
