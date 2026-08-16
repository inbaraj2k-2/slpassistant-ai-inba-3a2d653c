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
    captureInput: false,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    Keyboard: {
      resize: 'native',
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
