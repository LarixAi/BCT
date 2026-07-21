package uk.veyvio.driver;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DriverNavReturn")
public class DriverNavReturnPlugin extends Plugin {

    @PluginMethod
    public void bringToForeground(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(getContext(), MainActivity.class);
            intent.addFlags(
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP
                    | Intent.FLAG_ACTIVITY_NEW_TASK
            );
            getContext().startActivity(intent);
            call.resolve();
        });
    }
}
