package app.lovable.slpassistant;

import com.getcapacitor.BridgeActivity;

/**
 * Keep the Android activity as a plain Capacitor BridgeActivity.
 * Chromium/WebView owns the DOM focus and Android IME InputConnection.
 */
public class MainActivity extends BridgeActivity {}
