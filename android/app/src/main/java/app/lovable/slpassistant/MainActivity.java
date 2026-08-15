package app.lovable.slpassistant;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

/**
 * Minimal IME-safe Capacitor activity.
 *
 * Chromium/WebView owns the IME InputConnection for HTML inputs. No manual
 * focus, IME invocation, WebView touch interception, or custom inset listener
 * is installed here.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    EdgeToEdge.enable(this);
  }
}
