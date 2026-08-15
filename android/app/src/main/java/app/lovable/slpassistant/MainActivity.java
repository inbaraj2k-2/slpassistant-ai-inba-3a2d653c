package app.lovable.slpassistant;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Plain Capacitor BridgeActivity + one minimal, IME-safe window change.
 *
 * Chromium/WebView must own the IME InputConnection for HTML inputs. We never
 * call requestFocus(), showSoftInput(), or install touch listeners here.
 *
 * This build also contains diagnostic-only logging for the physical-device
 * keyboard investigation. The diagnostics observe focus, WebView/inset state,
 * WebView package/version, and Android IME state; they never mutate focus,
 * keyboard visibility, or WebView layout.
 */
public class MainActivity extends BridgeActivity {

  private static final String TAG = "SLPKeyboardDiag";
  private int lastWidth = -1;
  private int lastHeight = -1;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    installKeyboardDiagnostics();
  }

  private void installKeyboardDiagnostics() {
    try {
      final WebView webView = getBridge().getWebView();
      if (webView == null) {
        Log.e(TAG, "WEBVIEW_NULL");
        return;
      }

      String webViewPackage = "unknown";
      try {
        android.content.pm.PackageInfo info = WebView.getCurrentWebViewPackage();
        if (info != null) {
          webViewPackage = info.packageName + "/" + info.versionName;
        }
      } catch (Throwable ignored) {
        // Diagnostic only; never affect app startup.
      }

      Log.i(TAG, "BOOT sdk=" + android.os.Build.VERSION.SDK_INT
          + " release=" + android.os.Build.VERSION.RELEASE
          + " webview=" + webViewPackage
          + " focusable=" + webView.isFocusable()
          + " focusableInTouchMode=" + webView.isFocusableInTouchMode()
          + " hasFocus=" + webView.hasFocus()
          + " windowFocus=" + webView.hasWindowFocus()
          + " textEditor=" + webView.onCheckIsTextEditor());

      ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
        Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
        Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
        Log.i(TAG, "INSETS imeVisible=" + insets.isVisible(WindowInsetsCompat.Type.ime())
            + " imeBottom=" + ime.bottom
            + " barsBottom=" + bars.bottom
            + " view=" + view.getWidth() + "x" + view.getHeight());
        return insets;
      });

      webView.setOnFocusChangeListener((view, hasFocus) -> {
        Log.i(TAG, "WEBVIEW_FOCUS hasFocus=" + hasFocus
            + " windowFocus=" + view.hasWindowFocus()
            + " size=" + view.getWidth() + "x" + view.getHeight());
        logImeState(view, "focusChange");
      });

      ViewTreeObserver observer = webView.getViewTreeObserver();
      observer.addOnGlobalFocusChangeListener((oldFocus, newFocus) -> {
        Log.i(TAG, "GLOBAL_FOCUS old=" + describeView(oldFocus)
            + " new=" + describeView(newFocus));
        if (newFocus != null) {
          logImeState(newFocus, "globalFocus");
        }
      });

      observer.addOnGlobalLayoutListener(() -> {
        int width = webView.getWidth();
        int height = webView.getHeight();
        if (width != lastWidth || height != lastHeight) {
          lastWidth = width;
          lastHeight = height;
          Log.i(TAG, "WEBVIEW_SIZE " + width + "x" + height
              + " windowFocus=" + webView.hasWindowFocus()
              + " hasFocus=" + webView.hasFocus());
        }
      });

      webView.post(() -> logImeState(webView, "postCreate"));
    } catch (Throwable error) {
      Log.e(TAG, "DIAG_INIT_FAILED", error);
    }
  }

  private void logImeState(View view, String reason) {
    try {
      InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
      boolean active = imm != null && imm.isActive(view);
      boolean accepting = imm != null && imm.isAcceptingText();
      Log.i(TAG, "IME_STATE reason=" + reason
          + " active=" + active
          + " acceptingText=" + accepting
          + " focusedView=" + describeView(view));
    } catch (Throwable error) {
      Log.w(TAG, "IME_STATE_ERROR reason=" + reason, error);
    }
  }

  private String describeView(View view) {
    if (view == null) return "null";
    String id = "-";
    try {
      if (view.getId() != View.NO_ID) id = getResources().getResourceName(view.getId());
    } catch (Throwable ignored) {
      // Diagnostic only.
    }
    return view.getClass().getSimpleName() + "#" + id;
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    Log.i(TAG, "ACTIVITY_WINDOW_FOCUS hasFocus=" + hasFocus);
  }

  @Override
  public void onResume() {
    super.onResume();
    Log.i(TAG, "ACTIVITY_RESUME");
  }
}
