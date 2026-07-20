import type { CapacitorConfig } from '@capacitor/cli';

// The mobile app ships the entire frontend as bundled assets under
// dist/capacitor/. It never redirects to the hosted lovable.app site — it
// only makes outbound HTTPS calls to Supabase and the AI gateway when the
// device is online.
const config: CapacitorConfig = {
  appId: 'app.lovable.slpassistant',
  appName: 'SLP Assist AI',
  webDir: 'dist/capacitor',
  server: {
    androidScheme: 'https',
    // Optional live-reload override for local development only.
    url: process.env.CAP_SERVER_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    // captureInput must be false — when true, native Android intercepts
    // touch events destined for the WebView which can strand the user
    // inside the AAC search field with an unresponsive UI.
    captureInput: false,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    Keyboard: {
      // `native` lets Android resize the window normally (adjustResize) and
      // avoids the layout-thrash + fixed-nav clipping that `body` triggers
      // on some devices when the software keyboard is shown for a long
      // stretch (as in the AAC keyboard screen).
      resize: 'native',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      // Do NOT draw the WebView behind the status bar. This keeps the system
      // clock, battery, Wi-Fi and notification icons visible above the app UI.
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#5b21b6',
    },
  },
};

export default config;
