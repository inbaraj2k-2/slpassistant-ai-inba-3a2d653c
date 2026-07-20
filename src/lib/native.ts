// Small helpers around Capacitor plugins. All functions are safe to call in
// the web build — they no-op or fall back to the Web APIs when the native
// runtime is not present.

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error - Capacitor is injected at runtime on native platforms.
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export async function speakText(text: string) {
  if (!text) return;
  if (isNative()) {
    try {
      const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
      try {
        await TextToSpeech.stop();
      } catch {
        /* no-op */
      }
      await TextToSpeech.speak({
        text,
        lang: "en-US",
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        category: "playback",
      });
      return;
    } catch (err) {
      console.warn("[native] TTS failed, falling back to Web Speech", err);
    }
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
}

export interface AppVersionInfo {
  versionName: string;
  versionCode: string;
}

let cachedVersion: AppVersionInfo | null = null;

export async function getAppVersion(): Promise<AppVersionInfo> {
  if (cachedVersion) return cachedVersion;
  if (isNative()) {
    try {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      cachedVersion = {
        versionName: info.version,
        versionCode: String(info.build),
      };
      return cachedVersion;
    } catch (err) {
      console.warn("[native] getInfo failed", err);
    }
  }
  cachedVersion = { versionName: "web", versionCode: "" };
  return cachedVersion;
}

/**
 * Download a signed URL to the device.
 * - On native Android: writes the file into the Documents directory and
 *   returns a user-facing path for a toast.
 * - On web: triggers a normal browser download via an anchor element.
 */
export async function downloadToDevice(url: string, fileName: string): Promise<string> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const safeName = fileName.replace(/[/\\?%*:|"<>]/g, "_");
    await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return `Documents/${safeName}`;
  }
  // Web: force a normal download via an anchor tag.
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return fileName;
}

/**
 * Open a signed URL for viewing. On native we prefer the in-app Chrome
 * Custom Tab (Capacitor Browser) so the user is not thrown out into an
 * external browser; on web we open a new tab.
 */
export async function openInAppBrowser(url: string) {
  if (isNative()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch (err) {
      console.warn("[native] Browser.open failed", err);
    }
  }
  window.open(url, "_blank", "noopener");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[],
    );
  }
  return btoa(binary);
}
