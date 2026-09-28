import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.lovable.slpassistant',
  appName: 'SLP Assist AI',
  webDir: 'dist/capacitor',

  ...(liveReloadUrl
    ? {
        server: {
          androidScheme: 'https' as const,
          url: liveReloadUrl,
          cleartext: false,
        },
      }
    : {}),

  // Do not force native WebView focus before an HTML input is tapped.
  initialFocus: false,

  android: {
    allowMixedContent: false,
    // Chromium/WebView must remain the owner of DOM focus and the Android
    // InputConnection. Do not replace the standard WebView IME path.
    captureInput: false,
    // Android 15/16 edge-to-edge requires the WebView boundary to account for
    // native insets. This avoids stale hit-test regions after IME transitions.
    adjustMarginsForEdgeToEdge: 'auto',
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    Keyboard: {
      // Let Chromium's visual viewport/DOM handle the keyboard instead of
      // asking the Capacitor Keyboard plugin to resize the WebView on IME
      // show/hide. This avoids post-IME layout mutations that can leave stale
      // WebView hit-test regions and an unresponsive page.
      resize: 'none',
      resizeOnFullScreen: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#5b21b6',
    },
  },
};

export default config;
