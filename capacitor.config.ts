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

  // Let the HTML element own focus from the first tap. Capacitor's default
  // initial WebView focus is unnecessary for this form-heavy app and can leave
  // the native WebView container focused while the IME is already visible.
  initialFocus: false,

  android: {
    allowMixedContent: false,
    // Keep Chromium/WebView as the owner of the DOM InputConnection.
    captureInput: false,
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
