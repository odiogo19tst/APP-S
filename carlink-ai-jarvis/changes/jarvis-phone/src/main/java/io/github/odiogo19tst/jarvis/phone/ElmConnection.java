package io.github.odiogo19tst.jarvis.phone;

import android.bluetooth.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import io.github.odiogo19tst.jarvis.Obd;

/** Single-threaded caller, bounded replies, watchdog closes stalled transports. No write modes. */
final class ElmConnection implements AutoCloseable {
    private final BluetoothSocket socket;
    private final ScheduledExecutorService watchdog=Executors.newSingleThreadScheduledExecutor();
    ElmConnection(BluetoothDevice device) throws IOException {
        socket=device.createRfcommSocketToServiceRecord(Obd.SPP);
        ScheduledFuture<?> timeout=watchdog.schedule(this::close,8,TimeUnit.SECONDS);
        try { socket.connect(); } catch(IOException e) { close(); throw e; } finally { timeout.cancel(false); }
    }
    void initialize() throws IOException {
        query("ATZ"); query("ATE0"); query("ATL0"); query("ATS0"); query("ATH0"); query("ATSP0");
    }
    String query(String command) throws IOException {
        if(!command.matches("ATZ|ATE0|ATL0|ATS0|ATH0|ATSP0|010D|010C|0105|03")) throw new IOException("Comando bloqueado");
        ScheduledFuture<?> timeout=watchdog.schedule(this::close,3,TimeUnit.SECONDS);
        try {
            socket.getOutputStream().write((command+"\r").getBytes(StandardCharsets.US_ASCII));
            socket.getOutputStream().flush();
            ByteArrayOutputStream result=new ByteArrayOutputStream();
            for(int c;(c=socket.getInputStream().read())!=-1;) {
                if(c=='>') return new String(result.toByteArray(),StandardCharsets.US_ASCII);
                if(result.size()>=1024) throw new IOException("Resposta muito longa");
                result.write(c);
            }
            throw new EOFException();
        } finally { timeout.cancel(false); }
    }
    @Override public void close() {
        try { socket.close(); } catch(IOException ignored) {}
        watchdog.shutdownNow();
    }
}
