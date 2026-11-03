package io.github.odiogo19tst.jarvis;

/** All UI operations require explicit parked consent AND fresh zero speed. Monotonic time only. */
public final class DrivingGate {
    private long approvedUntil = -1, speedAt = -1;
    private int speed = -1;
    public synchronized void approveParked(long now) { approvedUntil = now + 120_000; }
    public synchronized void speed(int kmh, long now) {
        speed = kmh >= 0 && kmh <= 255 ? kmh : -1;
        speedAt = now;
        if (speed != 0) approvedUntil = -1;
    }
    public synchronized boolean allowsUi(long now) {
        return now < approvedUntil && speed == 0 && speedAt >= 0 && now >= speedAt && now - speedAt <= 3000;
    }
    public synchronized void stop() { approvedUntil = -1; speedAt = -1; speed = -1; }
}
