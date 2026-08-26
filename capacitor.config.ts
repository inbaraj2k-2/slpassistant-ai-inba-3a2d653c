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
    // The tested device can show the IME and accepts native EditText text, but
    // WebView's normal InputConnection path delivers no DOM beforeinput/input
    // events. Use Capacitor's supported alternate InputConnection so IME text
    // is captured by the WebView instead of relying on that failing path.
    captureInput: true,
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
