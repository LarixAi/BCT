package uk.veyvio.driver;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(DriverNavReturnPlugin.class);
    registerPlugin(DriverFloatingBubblePlugin.class);
    registerPlugin(DriverAndroidAutoPlugin.class);
    // Never restore the previous WebView URL (e.g. /documents). Cold start must
    // load index.html at /, otherwise biometric unlock reveals a stale mid-app page.
    super.onCreate(null);
    // Keep the display awake while Driver is in the foreground (walkaround,
    // duty, Gate 1 handset runs). Normal lock timeout resumes when the app
    // is backgrounded or closed.
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  }
}
