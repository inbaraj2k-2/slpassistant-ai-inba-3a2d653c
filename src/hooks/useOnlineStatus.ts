import { useEffect, useState } from "react";

/**
 * Reports online/offline status for the app.
 *
 * - On Capacitor native (Android/iOS): uses @capacitor/network, which
 *   reports the actual device connectivity (Wi-Fi / cellular / none).
 * - On web: uses navigator.onLine + online/offline events.
 *
 * Defaults to true during SSR to avoid a false "offline" flash.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });

  useEffect(() => {
    let cleanupNative: (() => void) | undefined;
    let cancelled = false;

    // Try Capacitor Network plugin first (works when installed as an APK).
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        if (cancelled) return;
        setOnline(status.connected);
        const handle = await Network.addListener("networkStatusChange", (s) => {
          setOnline(s.connected);
        });
        cleanupNative = () => {
          handle.remove().catch(() => {});
        };
      } catch {
        // Plugin not available in this runtime (browser) — fall through to web listeners.
      }
    })();

    // Web fallback (also active in native as a safety net).
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      cleanupNative?.();
    };
  }, []);

  return online;
}
