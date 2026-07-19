package com.coresupport.fleet.driver;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DriverFloatingBubble")
public class DriverFloatingBubblePlugin extends Plugin {

    private static DriverFloatingBubblePlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        instance = null;
        super.handleOnDestroy();
    }

    static void notifyBubbleTap(String jobId, String jobRoute) {
        if (instance == null) {
            return;
        }
        JSObject payload = new JSObject();
        if (jobId != null) {
            payload.put("jobId", jobId);
        }
        if (jobRoute != null) {
            payload.put("jobRoute", jobRoute);
        }
        instance.notifyListeners("bubbleTap", payload);
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            result.put("granted", Settings.canDrawOverlays(getContext()));
        } else {
            result.put("granted", true);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Settings.canDrawOverlays(getContext())) {
                JSObject result = new JSObject();
                result.put("granted", true);
                call.resolve(result);
                return;
            }

            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );

            if (getActivity() != null) {
                startActivityForResult(call, intent, "overlayPermissionResult");
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject pending = new JSObject();
                pending.put("granted", false);
                call.resolve(pending);
            }
            return;
        }

        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }

    @ActivityCallback
    private void overlayPermissionResult(PluginCall call, ActivityResult result) {
        JSObject payload = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            payload.put("granted", Settings.canDrawOverlays(getContext()));
        } else {
            payload.put("granted", true);
        }
        call.resolve(payload);
    }

    @PluginMethod
    public void show(PluginCall call) {
        String jobId = call.getString("jobId");
        String jobRoute = call.getString("jobRoute");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            call.reject("Overlay permission not granted");
            return;
        }

        DriverFloatingBubbleService.show(getContext(), jobId, jobRoute);

        JSObject payload = new JSObject();
        payload.put("shown", true);
        call.resolve(payload);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        DriverFloatingBubbleService.hide(getContext());
        JSObject payload = new JSObject();
        payload.put("hidden", true);
        call.resolve(payload);
    }
}
