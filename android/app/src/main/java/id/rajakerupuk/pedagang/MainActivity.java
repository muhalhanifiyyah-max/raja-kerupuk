package id.rajakerupuk.pedagang;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
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

        // Atur agar webview merender edge-to-edge di belakang status bar secara penuh
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Set style icon status bar awal (false = teks putih untuk latar gelap)
        updateStatusBars(false);

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
                                updateStatusBars(isLight);
                            }
                        });
                    }
                }, "AndroidStatusBar");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateStatusBars(boolean isLight) {
        try {
            Window window = getWindow();
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
