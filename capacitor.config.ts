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
    // On the affected Android/WebView path, the default Chromium
    // InputConnection opens the system IME but does not deliver committed
    // IME text to the DOM. Capacitor's supported capture path bridges the
    // system IME text back into the focused HTML input without introducing
    // a custom keyboard or native keyboard service.
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#5b21b6',
    },
  },
};

export default config;
