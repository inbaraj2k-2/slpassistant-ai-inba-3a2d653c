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

  // Let the tapped HTML element own focus; never force focus on the WebView.
  initialFocus: false,

  android: {
    allowMixedContent: false,
    // Keep Chromium/WebView as the owner of DOM focus and Android InputConnection.
    captureInput: false,
    // Keep edge-to-edge inset handling enabled for Android 15/16.
    adjustMarginsForEdgeToEdge: 'auto',
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    Keyboard: {
      // Match AndroidManifest.xml's windowSoftInputMode="adjustResize".
      // Capacitor delegates keyboard resizing to Android while Chromium retains
      // the focused DOM input and its InputConnection through IME transitions.
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
