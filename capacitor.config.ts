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
    // Use Chromium's standard WebView InputConnection. Capacitor's alternate
    // input-capture path must not intercept Android IME text before it reaches
    // the DOM.
    captureInput: false,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#5b21b6',
    },
    Keyboard: {
      // Android owns resizing through Activity.adjustResize. Do not ask the
      // plugin to apply a second WebView/body resize strategy.
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false,
    },
  },
};

export default config;
