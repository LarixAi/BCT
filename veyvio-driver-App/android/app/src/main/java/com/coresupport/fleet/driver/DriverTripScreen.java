package com.coresupport.fleet.driver;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.ParkedOnlyOnClickListener;
import androidx.car.app.model.Template;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

public class DriverTripScreen extends Screen {

    DriverTripScreen(@NonNull CarContext carContext) {
        super(carContext);
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onCreate(@NonNull LifecycleOwner owner) {
                AndroidAutoTripStore.getInstance().attachScreen(DriverTripScreen.this);
            }

            @Override
            public void onDestroy(@NonNull LifecycleOwner owner) {
                AndroidAutoTripStore.getInstance().detachScreen(DriverTripScreen.this);
            }
        });
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        AndroidAutoTripStore.Trip trip = AndroidAutoTripStore.getInstance().getActiveTrip();
        if (trip == null) {
            return idleTemplate();
        }
        return activeTripTemplate(trip);
    }

    private Template idleTemplate() {
        ItemList list = new ItemList.Builder()
            .addItem(
                new Row.Builder()
                    .setTitle("No active trip")
                    .addText("Open Veyvio Driver on your phone to start a job")
                    .build()
            )
            .build();

        return new ListTemplate.Builder()
            .setTitle("Veyvio Driver")
            .setSingleList(list)
            .build();
    }

    private Template activeTripTemplate(@NonNull AndroidAutoTripStore.Trip trip) {
        String legLabel = "dropoff".equals(trip.leg) ? "Drop-off" : "Pickup";

        ItemList.Builder listBuilder = new ItemList.Builder()
            .addItem(
                new Row.Builder()
                    .setTitle(trip.label)
                    .addText(legLabel + " · Job " + shortJobRef(trip.jobId))
                    .build()
            )
            .addItem(
                new Row.Builder()
                    .setTitle("Destination")
                    .addText(String.format("%.5f, %.5f", trip.destinationLat, trip.destinationLng))
                    .build()
            );

        String actionTitle;
        switch (trip.primaryAction) {
            case "arrive":
                actionTitle = "I've arrived";
                break;
            case "complete_stop":
                actionTitle = "Complete stop";
                break;
            default:
                actionTitle = "Open on phone";
                break;
        }

        Action openPhone = new Action.Builder()
            .setTitle(actionTitle)
            .setBackgroundColor(CarColor.BLUE)
            .setOnClickListener(ParkedOnlyOnClickListener.create(() -> openPhoneApp(trip)))
            .build();

        return new ListTemplate.Builder()
            .setTitle("Active trip")
            .setSingleList(listBuilder.build())
            .setActionStrip(new androidx.car.app.model.ActionStrip.Builder().addAction(openPhone).build())
            .build();
    }

    private void openPhoneApp(@NonNull AndroidAutoTripStore.Trip trip) {
        Intent intent = new Intent(getCarContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        intent.putExtra(DriverFloatingBubbleService.EXTRA_JOB_ID, trip.jobId);
        if (trip.jobRoute != null) {
            intent.putExtra(DriverFloatingBubbleService.EXTRA_JOB_ROUTE, trip.jobRoute);
        }
        getCarContext().startActivity(intent);
        finish();
    }

    private static String shortJobRef(@NonNull String jobId) {
        if (jobId.length() <= 8) return jobId;
        return jobId.substring(0, 8);
    }
}
