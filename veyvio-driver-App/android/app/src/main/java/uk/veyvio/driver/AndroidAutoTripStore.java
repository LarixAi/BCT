package uk.veyvio.driver;

import java.util.HashMap;
import java.util.Map;

/** Active trip payload shared with Android Auto head units (Samsung + Android Auto). */
public final class AndroidAutoTripStore {

    public static final class Trip {
        public final String jobId;
        public final String jobRoute;
        public final String leg;
        public final String primaryAction;
        public final String label;
        public final double destinationLat;
        public final double destinationLng;

        Trip(
            String jobId,
            String jobRoute,
            String leg,
            String primaryAction,
            String label,
            double destinationLat,
            double destinationLng
        ) {
            this.jobId = jobId;
            this.jobRoute = jobRoute;
            this.leg = leg;
            this.primaryAction = primaryAction;
            this.label = label;
            this.destinationLat = destinationLat;
            this.destinationLng = destinationLng;
        }
    }

    private static final AndroidAutoTripStore INSTANCE = new AndroidAutoTripStore();

    private Trip activeTrip;
    private DriverTripScreen activeScreen;

    private AndroidAutoTripStore() {}

    public static AndroidAutoTripStore getInstance() {
        return INSTANCE;
    }

    public Trip getActiveTrip() {
        return activeTrip;
    }

    public void updateFromMap(Map<String, Object> payload) {
        if (payload == null || payload.get("jobId") == null) {
            clear();
            return;
        }

        String jobId = String.valueOf(payload.get("jobId"));
        String jobRoute = payload.get("jobRoute") != null ? String.valueOf(payload.get("jobRoute")) : null;
        String leg = payload.get("leg") != null ? String.valueOf(payload.get("leg")) : "pickup";
        String primaryAction = payload.get("primaryAction") != null
            ? String.valueOf(payload.get("primaryAction"))
            : "open_app";
        String label = payload.get("label") != null ? String.valueOf(payload.get("label")) : "Trip";

        double lat = toDouble(payload.get("destinationLat"));
        double lng = toDouble(payload.get("destinationLng"));
        if (Double.isNaN(lat) || Double.isNaN(lng)) {
            clear();
            return;
        }

        activeTrip = new Trip(jobId, jobRoute, leg, primaryAction, label, lat, lng);
        refreshScreen();
    }

    public void clear() {
        if (activeTrip == null) {
            return;
        }
        activeTrip = null;
        refreshScreen();
    }

    public void attachScreen(DriverTripScreen screen) {
        activeScreen = screen;
    }

    public void detachScreen(DriverTripScreen screen) {
        if (activeScreen == screen) {
            activeScreen = null;
        }
    }

    private void refreshScreen() {
        if (activeScreen != null) {
            activeScreen.invalidate();
        }
    }

    private static double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException ignored) {
                return Double.NaN;
            }
        }
        return Double.NaN;
    }

    public static Map<String, Object> mapFromPlugin(
        String jobId,
        String jobRoute,
        String leg,
        String primaryAction,
        String label,
        Double destinationLat,
        Double destinationLng
    ) {
        Map<String, Object> map = new HashMap<>();
        map.put("jobId", jobId);
        if (jobRoute != null) map.put("jobRoute", jobRoute);
        if (leg != null) map.put("leg", leg);
        if (primaryAction != null) map.put("primaryAction", primaryAction);
        if (label != null) map.put("label", label);
        if (destinationLat != null) map.put("destinationLat", destinationLat);
        if (destinationLng != null) map.put("destinationLng", destinationLng);
        return map;
    }
}
