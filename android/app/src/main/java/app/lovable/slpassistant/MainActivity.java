package app.lovable.slpassistant;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Minimal IME-safe Capacitor activity.
 *
 * Chromium/WebView must own the IME InputConnection for HTML inputs.
 * Do not force WebView focus, invoke the IME manually, or intercept WebView
 * touch/insets callbacks here.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
