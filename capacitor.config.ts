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
    // Chromium/WebView owns DOM focus and the Android InputConnection.
    captureInput: false,
    // Do not dynamically change the WebView's native margins when the IME
    // changes the window. On Android 15/16 this can leave Chromium's native
    // hit-test surface out of sync with the visible WebView after an input
    // receives focus. The app uses normal WebView/DOM layout instead.
    adjustMarginsForEdgeToEdge: 'disable',
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    Keyboard: {
      // Do not let the Capacitor Keyboard plugin rewrite the WebView layout
      // when the IME opens. Chromium's native visual viewport remains the
      // source of truth for DOM input interaction.
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
