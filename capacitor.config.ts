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
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    Keyboard: { resize: 'body' },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#5b21b6',
    },
  },
};

export default config;
