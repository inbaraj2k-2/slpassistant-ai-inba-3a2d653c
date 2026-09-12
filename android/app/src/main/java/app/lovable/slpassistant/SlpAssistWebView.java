package app.lovable.slpassistant;

import android.content.Context;
import android.util.AttributeSet;
import android.view.inputmethod.BaseInputConnection;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;

import com.getcapacitor.CapacitorWebView;

/**
 * Native IME compatibility layer for the Capacitor WebView.
 *
 * Capacitor 8.4.1's captureInput path creates BaseInputConnection with
 * fallbackMode=false.  For this app/device combination that leaves Gboard
 * able to focus the WebView input while text never reaches Chromium/DOM.
 * Android's BaseInputConnection fallback mode translates committed IME text
 * into normal key events for the WebView instead.
 *
 * The rest of CapacitorWebView remains unchanged, including its key-event
 * handling and WebView lifecycle.
 */
public class SlpAssistWebView extends CapacitorWebView {

  private BaseInputConnection fallbackInputConnection;

  public SlpAssistWebView(Context context, AttributeSet attrs) {
    super(context, attrs);
  }

  @Override
  public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
    if (fallbackInputConnection == null) {
      fallbackInputConnection = new BaseInputConnection(this, true);
    }
    return fallbackInputConnection;
  }
}
