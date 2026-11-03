package com.carlink.app.jarvis;

import android.os.SystemClock;
import io.github.odiogo19tst.jarvis.DrivingGate;

final class JarvisState {
    static final DrivingGate GATE = new DrivingGate();
    static volatile JarvisAccessibility accessibility;
    static volatile JarvisActivity session;
    static long now() { return SystemClock.elapsedRealtime(); }
}
