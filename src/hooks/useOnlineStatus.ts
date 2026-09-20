import { useEffect, useState } from "react";

type Subscriber = (online: boolean) => void;

type NativeHandle = { remove: () => Promise<void> };

let cachedOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const subscribers = new Set<Subscriber>();
let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;
let nativeHandle: NativeHandle | null = null;
let webListenersInstalled = false;

function publish(online: boolean) {
  if (cachedOnline === online) return;
  cachedOnline = online;
  for (const subscriber of subscribers) subscriber(online);
}

function installWebListeners() {
  if (webListenersInstalled || typeof window === "undefined") return;
  webListenersInstalled = true;
  window.addEventListener("online", () => publish(true));
  window.addEventListener("offline", () => publish(false));
}

async function bootstrap() {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        publish(status.connected);
        nativeHandle = await Network.addListener("networkStatusChange", (status) => {
          publish(status.connected);
        });
        bootstrapped = true;
        return;
      }
    } catch {
      // Fall through to browser connectivity events.
    }

    installWebListeners();
    bootstrapped = true;
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(cachedOnline);

  useEffect(() => {
    subscribers.add(setOnline);
    setOnline(cachedOnline);
    void bootstrap();

    return () => {
      // The native Network listener intentionally remains app-lifetime.
      // Only this component's React subscriber is removed on unmount.
      subscribers.delete(setOnline);
    };
  }, []);

  return online;
}
