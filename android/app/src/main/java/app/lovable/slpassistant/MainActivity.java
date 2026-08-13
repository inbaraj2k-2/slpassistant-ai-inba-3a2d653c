package app.lovable.slpassistant;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Let Chromium own the input connection. We only make sure the WebView
    // container can take touch focus normally — no manual requestFocus() and
    // no manual showSoftInput(), because poking the IME on the container view
    // raises the keyboard without an editable DOM node attached, so typed
    // characters never reach the focused <input>.
    final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null) {
      webView.setFocusable(true);
      webView.setFocusableInTouchMode(true);
    }
  }
}
