package uk.veyvio.yard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Never restore the previous WebView URL (e.g. a remote workers.dev page).
    // Cold start must load packaged index.html — same pattern as Veyvio Driver.
    super.onCreate(null);
  }
}
