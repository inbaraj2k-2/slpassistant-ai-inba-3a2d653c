package app.lovable.slpassistant;

import android.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Temporary native-vs-WebView input diagnostic. This is instrumentation only;
 * it does not override WebView input, focus, keyboard, or window behavior.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    addNativeInputDiagnosticButton();
  }

  private void addNativeInputDiagnosticButton() {
    // PHONE-ONLY NATIVE EDITTEXT DIAGNOSTIC — TEMPORARY INSTRUMENTATION.
    Button button = new Button(this);
    button.setText("Native input test");
    button.setTextSize(12);
    button.setOnClickListener(v -> showNativeInputDialog());

    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
        Gravity.TOP | Gravity.END
    );
    params.topMargin = 12;
    params.rightMargin = 12;
    addContentView(button, params);
  }

  private void showNativeInputDialog() {
    LinearLayout content = new LinearLayout(this);
    content.setOrientation(LinearLayout.VERTICAL);
    content.setPadding(32, 8, 32, 8);

    TextView label = new TextView(this);
    label.setText("Native Android EditText\nTap the field and type: abc");
    label.setTextColor(Color.BLACK);
    label.setTextSize(16);
    content.addView(label, new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    ));

    EditText nativeInput = new EditText(this);
    nativeInput.setHint("Native Android EditText");
    nativeInput.setSingleLine(false);
    nativeInput.setTextSize(18);
    nativeInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
    nativeInput.setPadding(16, 12, 16, 12);
    content.addView(nativeInput, new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    ));

    TextView info = new TextView(this);
    info.setText(getDeviceInfo());
    info.setTextColor(Color.DKGRAY);
    info.setTextSize(12);
    info.setPadding(0, 16, 0, 0);
    content.addView(info, new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    ));

    new AlertDialog.Builder(this)
        .setTitle("NATIVE ANDROID INPUT TEST")
        .setView(content)
        .setPositiveButton("Close", null)
        .show();
  }

  private String getDeviceInfo() {
    String webViewPackage = "Unavailable";
    String webViewVersion = "Unavailable";

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        PackageInfo info = WebView.getCurrentWebViewPackage();
        if (info != null) {
          webViewPackage = info.packageName;
          webViewVersion = info.versionName;
        }
      }
    } catch (Exception ignored) {
      // Diagnostic-only read failure; do not affect input behavior.
    }

    return "Android: " + Build.VERSION.RELEASE
        + " (API " + Build.VERSION.SDK_INT + ")\n"
        + "Device: " + Build.MANUFACTURER + " " + Build.MODEL + "\n"
        + "WebView provider: " + webViewPackage + "\n"
        + "WebView version: " + webViewVersion + "\n"
        + "Capacitor: 8.4.1\n"
        + "Target SDK: " + getApplicationInfo().targetSdkVersion;
  }
}
