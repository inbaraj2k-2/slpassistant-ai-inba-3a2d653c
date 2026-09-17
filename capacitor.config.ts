import type { CapacitorConfig } from '@capacitor/cli';

// The mobile app ships the entire frontend as bundled assets under
// dist/capacitor/. It only uses CAP_SERVER_URL for explicit live reload;
// production builds without it use the bundled assets and never redirect
// to a hosted Lovable site.
const server = process.env.CAP_SERVER_URL
  ? {
      androidScheme: 'https' as const,
      url: process.env.CAP_SERVER_URL,
      cleartext: false,
    }
  : undefined;

const config: CapacitorConfig = {
  appId: 'app.lovable.slpassistant',
  appName: 'SLP Assist AI',
  webDir: 'dist/capacitor',
  ...(server ? { server } : {}),
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
      resize: 'native',
    },
  },
};

export default config;
