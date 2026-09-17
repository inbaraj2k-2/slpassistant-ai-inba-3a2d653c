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

  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#5b21b6',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
