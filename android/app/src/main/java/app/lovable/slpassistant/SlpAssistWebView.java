package app.lovable.slpassistant;

import android.content.Context;
import android.util.AttributeSet;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;

import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.CapacitorWebView;

/**
 * Android 16 IME compatibility layer for the Capacitor WebView.
 *
 * Android/Chromium owns the real WebView InputConnection. We deliberately do
 * not replace it with BaseInputConnection: doing so bypasses Chromium's IME
 * adapter and was already proven ineffective for this app.
 *
 * On Android 16, the WebView can remain focused while the IME transition leaves
 * the framework/Chromium input connection in a stale state. Chromium itself
 * uses InputMethodManager.restartInput() when its editable input state changes.
 * We mirror that lifecycle boundary when the IME becomes visible so Android
 * asks the WebView for a fresh Chromium InputConnection.
 */
public class SlpAssistWebView extends CapacitorWebView {

  private boolean imeVisible;

  public SlpAssistWebView(Context context, AttributeSet attrs) {
    super(context, attrs);
  }

  @Override
  public WindowInsets onApplyWindowInsets(WindowInsets insets) {
    WindowInsets result = super.onApplyWindowInsets(insets);

    if (android.os.Build.VERSION.SDK_INT >= 30) {
      WindowInsetsCompat compat = WindowInsetsCompat.toWindowInsetsCompat(result, this);
      boolean nowVisible = compat.isVisible(WindowInsetsCompat.Type.ime());

      if (nowVisible != imeVisible) {
        imeVisible = nowVisible;
        if (nowVisible && isAttachedToWindow()) {
          postDelayed(() -> {
            if (!isAttachedToWindow() || !hasWindowFocus()) {
              return;
            }
            InputMethodManager imm =
                (InputMethodManager) getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
              imm.restartInput(this);
            }
          }, 50);
        }
      }
    }

    return result;
  }
}
