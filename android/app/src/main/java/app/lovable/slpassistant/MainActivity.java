package app.lovable.slpassistant;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Keep the Capacitor activity minimal so Chromium/WebView owns the Android
 * IME/input connection and window insets without a native override changing
 * its behavior.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }
}
