package com.coresupport.fleet.driver;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(DriverNavReturnPlugin.class);
    registerPlugin(DriverFloatingBubblePlugin.class);
    registerPlugin(DriverAndroidAutoPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
