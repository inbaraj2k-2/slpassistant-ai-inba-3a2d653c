package app.lovable.slpassistant;

import com.getcapacitor.BridgeActivity;

/**
 * Keep the Android activity as a plain Capacitor BridgeActivity.
 *
 * Chromium/WebView must own the IME InputConnection for HTML inputs. Do not
 * force focus on the WebView container, install touch listeners, or call
 * InputMethodManager.showSoftInput() from here; those operations can make the
 * keyboard visible while leaving the DOM input without the active connection.
 */
public class MainActivity extends BridgeActivity {}
