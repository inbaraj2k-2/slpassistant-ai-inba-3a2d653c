package app.lovable.slpassistant;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Plain Capacitor BridgeActivity + minimal, IME-safe window insets handling.
 *
 * Chromium/WebView must own the IME InputConnection for HTML inputs. We never
 * call requestFocus(), showSoftInput(), or install touch listeners here; those
 * operations make the keyboard visible while leaving the DOM input without an
 * active input connection (typed characters go nowhere).
 *
 * The only native work done here is window insets:
 *  - Android 15+ (targetSdk 35/36) forces edge-to-edge, which makes the
 *    decor view stop fitting system windows. Combined with adjustResize the
 *    WebView can be repeatedly resized/re-laid-out when the IME animates in,
 *    which invalidates Chromium's InputConnection mid-typing.
 *  - We restore legacy "decor fits system windows" behaviour and apply only
 *    stable system-bar insets as padding to the content root. IME insets are
 *    deliberately NOT applied as padding: the Activity's adjustResize already
 *    resizes the window once, and double-applying keyboard insets is what
 *    produces the focus -> keyboard -> resize -> blur loop.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Opt back into classic (non edge-to-edge) window fitting so the IME
    // resize is handled once by the framework, not by per-frame inset math.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

    final View content = findViewById(android.R.id.content);
    if (content != null) {
      ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
        // Stable system bars only. Never pad for WindowInsetsCompat.Type.ime().
        Insets bars = insets.getInsets(
            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
        return insets;
      });
      ViewCompat.requestApplyInsets(content);
    }
  }
}
