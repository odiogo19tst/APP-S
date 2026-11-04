package com.carlink.app.jarvis;

import android.os.SystemClock;
import io.github.odiogo19tst.jarvis.DrivingGate;

final class JarvisState {
    static final DrivingGate GATE = new DrivingGate();
    static long now() { return SystemClock.elapsedRealtime(); }
}
