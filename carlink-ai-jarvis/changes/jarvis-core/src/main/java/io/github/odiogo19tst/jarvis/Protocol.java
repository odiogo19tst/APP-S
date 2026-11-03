package io.github.odiogo19tst.jarvis;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Bounded UTF-8 lines over Android's secure, bonded RFCOMM transport. No LAN listener. */
public final class Protocol {
    private Protocol() {}
    public static final UUID SERVICE = UUID.fromString("7d252d13-6bd4-468c-b685-a07359f6c613");
    public static String read(InputStream in) throws IOException {
        ByteArrayOutputStream data = new ByteArrayOutputStream();
        for (int c; (c = in.read()) != -1;) {
            if (c == '\n') return new String(data.toByteArray(), StandardCharsets.UTF_8);
            if (c == '\r' || c == 0 || data.size() >= 2048) throw new IOException("Invalid frame");
            data.write(c);
        }
        throw new EOFException();
    }
    public static synchronized void write(OutputStream out, String line) throws IOException {
        if (line.length() > 500 || line.indexOf('\n') >= 0 || line.indexOf('\r') >= 0)
            throw new IOException("Invalid outgoing frame");
        out.write((line + "\n").getBytes(StandardCharsets.UTF_8));
        out.flush();
    }
    public static String command(String speech) {
        String s = speech.trim().toLowerCase(java.util.Locale.ROOT);
        switch (s) {
            case "início": case "inicio": case "tela inicial": return "HOME";
            case "voltar": return "BACK";
            case "abrir mapas": return "MAPS";
            case "abrir spotify": return "SPOTIFY";
            case "ler tela": return "SCREEN";
            case "parar": case "cancelar": return "STOP";
            case "rotação": case "rotacao": return "RPM";
            case "temperatura": return "TEMP";
            case "velocidade": return "SPEED";
            case "falhas": return "DTC";
            default:
                // A view ID explicitly approved on the head unit; never free-form shell/intent code.
                if (s.matches("acionar [a-z0-9_.]+:id/[a-z0-9_]+")) return "CLICK " + s.substring(8);
                return "UNKNOWN";
        }
    }
}
