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
    let cancelled = false;
    let nativeHandle: { remove: () => Promise<void> } | null = null;

    const onOnline = () => {
      if (!cancelled) setOnline(true);
    };
    const onOffline = () => {
      if (!cancelled) setOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const setupNativeListener = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const { Network } = await import("@capacitor/network");
        if (cancelled) return;

        const status = await Network.getStatus();
        if (cancelled) return;
        setOnline(status.connected);

        const handle = await Network.addListener("networkStatusChange", (status) => {
          if (!cancelled) setOnline(status.connected);
        });

        if (cancelled) {
          await handle.remove().catch(() => undefined);
          return;
        }

        nativeHandle = handle;
      } catch {
        // Capacitor Network is unavailable; web listeners remain active.
      }
    };

    void setupNativeListener();

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);

      const handle = nativeHandle;
      nativeHandle = null;
      if (handle) void handle.remove().catch(() => undefined);
    };
  }, []);

  return online;
}
