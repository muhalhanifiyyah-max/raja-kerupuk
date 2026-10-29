package id.rajakerupuk.pedagang;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // Atur warna status bar awal agar persis sama dengan navbar (#1c1c1e)
        updateSystemBars("#1c1c1e", false);

        // Daftarkan antarmuka JavaScript agar aplikasi web dapat menyinkronkan status bar saat tema berganti
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void setSystemBarColor(final String colorHex, final boolean isLight) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                updateSystemBars(colorHex, isLight);
                            }
                        });
                    }
                }, "AndroidStatusBar");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateSystemBars(String colorHex, boolean isLight) {
        try {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            int color = Color.parseColor(colorHex);
            window.setStatusBarColor(color);
            window.setNavigationBarColor(color);

            WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(isLight);
                insetsController.setAppearanceLightNavigationBars(isLight);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
