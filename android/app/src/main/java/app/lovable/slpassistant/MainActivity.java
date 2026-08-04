package app.lovable.slpassistant;

import android.os.Bundle;
import android.view.MotionEvent;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    enableWebViewInput();
  }

  /**
   * On some Android builds the Capacitor WebView starts without touch focus, so
   * tapping an <input> never raises the soft keyboard. Making the WebView
   * focusable in touch mode and explicitly opening the IME on the first touch
   * restores normal text entry.
   */
  private void enableWebViewInput() {
    final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null) return;

    webView.setFocusable(true);
    webView.setFocusableInTouchMode(true);
    webView.requestFocus();

    webView.setOnTouchListener((v, event) -> {
      if (event.getAction() == MotionEvent.ACTION_DOWN && !v.hasFocus()) {
        v.requestFocus();
        InputMethodManager imm =
            (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
          imm.showSoftInput(v, InputMethodManager.SHOW_IMPLICIT);
        }
      }
      return false; // never consume — the WebView still gets the event
    });
  }
}
