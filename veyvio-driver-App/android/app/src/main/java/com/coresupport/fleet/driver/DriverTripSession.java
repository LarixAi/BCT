package com.coresupport.fleet.driver;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.car.app.Session;
import androidx.car.app.Screen;

public class DriverTripSession extends Session {

    @NonNull
    @Override
    public Screen onCreateScreen(@NonNull Intent intent) {
        return new DriverTripScreen(getCarContext());
    }
}
