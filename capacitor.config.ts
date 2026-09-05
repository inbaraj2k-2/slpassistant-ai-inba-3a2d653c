import type { CapacitorConfig } from '@capacitor/cli';

// The mobile app ships the entire frontend as bundled assets under
// dist/capacitor/. It never redirects to the hosted lovable.app site — it
// only makes outbound HTTPS calls to Supabase and the AI gateway when online.
const config: CapacitorConfig = {
  appId: 'app.lovable.slpassistant',
  appName: 'SLP Assist AI',
  webDir: 'dist/capacitor',

  server: {
    androidScheme: 'https',
    url: process.env.CAP_SERVER_URL,
    cleartext: false,
  },

  android: {
    allowMixedContent: false,
    // Keep the app WebView on Chromium's standard InputConnection. The
    // system-wide SLP keyboard is a separate native InputMethodService and
    // must never depend on Capacitor's alternate WebView capture path.
    captureInput: false,
    // Android 15/16 edge-to-edge needs native margins applied at the WebView
    // boundary. This prevents system/IME insets from producing stale hit-test
    // regions over the web content.
    adjustMarginsForEdgeToEdge: 'auto',
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    Keyboard: {
      // Do not let the Capacitor Keyboard plugin rewrite the WebView layout
      // when the IME opens. Chromium's visual viewport/DOM handles the
      // keyboard while native WebView keeps its normal touch hit-testing.
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
