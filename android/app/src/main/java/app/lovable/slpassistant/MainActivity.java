package app.lovable.slpassistant;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Plain Capacitor BridgeActivity + one minimal, IME-safe window change.
 *
 * Chromium/WebView must own the IME InputConnection for HTML inputs. We never
 * call requestFocus(), showSoftInput(), or install touch listeners here; those
 * operations make the keyboard visible while leaving the DOM input without an
 * active input connection (typed characters go nowhere).
 *
 * The only native work done here is window fitting:
 *  - Android 15+ (targetSdk 35/36) forces edge-to-edge, so the decor view stops
 *    fitting system windows. Combined with adjustResize, the WebView can be
 *    resized/re-laid-out repeatedly while the IME animates in, which
 *    invalidates Chromium's InputConnection mid-typing.
 *  - Restoring decorFitsSystemWindows(true) makes the framework resize the
 *    window once for the IME (legacy adjustResize behaviour) and keeps the
 *    WebView size stable while typing. IME insets are never applied as extra
 *    padding on the WebView.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
