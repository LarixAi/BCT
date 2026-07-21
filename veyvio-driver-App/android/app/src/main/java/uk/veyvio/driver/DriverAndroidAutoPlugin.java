package uk.veyvio.driver;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Map;

@CapacitorPlugin(name = "DriverAndroidAuto")
public class DriverAndroidAutoPlugin extends Plugin {

    @PluginMethod
    public void updateActiveTrip(PluginCall call) {
        String jobId = call.getString("jobId");
        if (jobId == null || jobId.isEmpty()) {
            call.reject("jobId is required");
            return;
        }

        Map<String, Object> payload = AndroidAutoTripStore.mapFromPlugin(
            jobId,
            call.getString("jobRoute"),
            call.getString("leg"),
            call.getString("primaryAction"),
            call.getString("label"),
            call.getDouble("destinationLat"),
            call.getDouble("destinationLng")
        );

        AndroidAutoTripStore.getInstance().updateFromMap(payload);

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void clearActiveTrip(PluginCall call) {
        AndroidAutoTripStore.getInstance().clear();
        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void isAndroidAutoAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        call.resolve(result);
    }
}
