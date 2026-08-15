package app.lovable.slpassistant;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Minimal IME-safe Capacitor activity.
 *
 * Keep the pre-existing non-edge-to-edge window fitting behavior for the
 * WebView on Android versions where edge-to-edge is not platform-enforced.
 * Android 15+ enforces edge-to-edge when targeting API 35+, so those devices
 * still receive the platform behavior and must be handled through insets.
 *
 * Chromium/WebView owns the IME InputConnection for HTML inputs. No manual
 * focus, IME invocation, WebView touch interception, or custom inset listener
 * is installed here.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
