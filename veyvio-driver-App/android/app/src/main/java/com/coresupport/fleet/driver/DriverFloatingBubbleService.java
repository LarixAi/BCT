package com.coresupport.fleet.driver;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.app.NotificationCompat;

public class DriverFloatingBubbleService extends Service {

    public static final String ACTION_SHOW = "com.coresupport.fleet.driver.bubble.SHOW";
    public static final String ACTION_HIDE = "com.coresupport.fleet.driver.bubble.HIDE";
    public static final String EXTRA_JOB_ID = "jobId";
    public static final String EXTRA_JOB_ROUTE = "jobRoute";

    private static final String CHANNEL_ID = "ridova_nav_bubble";
    private static final int NOTIFICATION_ID = 42001;

    private WindowManager windowManager;
    private View bubbleView;
    private WindowManager.LayoutParams layoutParams;
    private String jobId;
    private String jobRoute;

    private float initialTouchX;
    private float initialTouchY;
    private int initialX;
    private int initialY;
    private boolean movedDuringTouch;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_HIDE.equals(action)) {
            removeBubble();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_SHOW.equals(action)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                stopSelf();
                return START_NOT_STICKY;
            }

            jobId = intent.getStringExtra(EXTRA_JOB_ID);
            jobRoute = intent.getStringExtra(EXTRA_JOB_ROUTE);

            Notification notification = buildNotification();
            startForeground(NOTIFICATION_ID, notification);
            showBubble();
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        removeBubble();
        super.onDestroy();
    }

    private Notification buildNotification() {
        createNotificationChannel();

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Veyvio navigation")
            .setContentText("Tap the floating button to return to your trip")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Navigation return button",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows while Ridova floating return button is active");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private void showBubble() {
        if (bubbleView != null) {
            return;
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) {
            return;
        }

        int bubbleSizePx = dpToPx(52);
        int marginPx = dpToPx(16);

        layoutParams = new WindowManager.LayoutParams(
            bubbleSizePx,
            bubbleSizePx,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        layoutParams.gravity = Gravity.TOP | Gravity.START;
        layoutParams.x = marginPx;
        layoutParams.y = dpToPx(120);

        FrameLayout container = new FrameLayout(this);
        container.setBackgroundResource(R.drawable.floating_bubble_bg);

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        icon.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        int iconPad = dpToPx(8);
        FrameLayout.LayoutParams iconParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        iconParams.setMargins(iconPad, iconPad, iconPad, iconPad);
        container.addView(icon, iconParams);

        container.setOnTouchListener(this::onBubbleTouch);
        bubbleView = container;
        windowManager.addView(bubbleView, layoutParams);
    }

    private boolean onBubbleTouch(View view, MotionEvent event) {
        if (layoutParams == null || windowManager == null) {
            return false;
        }

        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                initialTouchX = event.getRawX();
                initialTouchY = event.getRawY();
                initialX = layoutParams.x;
                initialY = layoutParams.y;
                movedDuringTouch = false;
                return true;
            case MotionEvent.ACTION_MOVE:
                float dx = event.getRawX() - initialTouchX;
                float dy = event.getRawY() - initialTouchY;
                if (Math.abs(dx) > dpToPx(4) || Math.abs(dy) > dpToPx(4)) {
                    movedDuringTouch = true;
                }
                layoutParams.x = initialX + (int) dx;
                layoutParams.y = initialY + (int) dy;
                windowManager.updateViewLayout(bubbleView, layoutParams);
                return true;
            case MotionEvent.ACTION_UP:
                if (!movedDuringTouch) {
                    handleBubbleTap();
                }
                return true;
            default:
                return false;
        }
    }

    private void handleBubbleTap() {
        DriverFloatingBubblePlugin.notifyBubbleTap(jobId, jobRoute);

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        if (jobRoute != null) {
            intent.putExtra(EXTRA_JOB_ROUTE, jobRoute);
        }
        if (jobId != null) {
            intent.putExtra(EXTRA_JOB_ID, jobId);
        }
        intent.putExtra("ridova_bubble_tap", true);
        startActivity(intent);
    }

    private void removeBubble() {
        if (windowManager != null && bubbleView != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {
                /* view may already be detached */
            }
        }
        bubbleView = null;
        layoutParams = null;
    }

    private int dpToPx(int dp) {
        return Math.round(
            TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics())
        );
    }

    public static void show(Context context, String jobId, String jobRoute) {
        Intent intent = new Intent(context, DriverFloatingBubbleService.class);
        intent.setAction(ACTION_SHOW);
        intent.putExtra(EXTRA_JOB_ID, jobId);
        intent.putExtra(EXTRA_JOB_ROUTE, jobRoute);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void hide(Context context) {
        Intent intent = new Intent(context, DriverFloatingBubbleService.class);
        intent.setAction(ACTION_HIDE);
        context.startService(intent);
    }
}
