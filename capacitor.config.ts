import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.slpassistant',
  appName: 'SLP Assist AI',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https',
    // For live-reload during dev, set CAP_SERVER_URL env var to your preview URL
    url: process.env.CAP_SERVER_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    Keyboard: {
      resize: 'body',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#5b21b6',
    },
  },
};

export default config;
