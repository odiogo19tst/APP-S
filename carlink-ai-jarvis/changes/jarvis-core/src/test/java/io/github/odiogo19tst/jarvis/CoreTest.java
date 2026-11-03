package io.github.odiogo19tst.jarvis;

import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.util.*;

public class CoreTest {
    @Test public void gateRequiresBothSignalsAndExpires() {
        DrivingGate g=new DrivingGate();
        assertFalse(g.allowsUi(10));
        g.approveParked(10); assertFalse(g.allowsUi(10));
        g.speed(0,20); assertTrue(g.allowsUi(21));
        assertFalse(g.allowsUi(3021));
        g.speed(0,4000); assertTrue(g.allowsUi(4001));
        g.speed(1,4002); g.speed(0,4003); assertFalse(g.allowsUi(4004));
        g.approveParked(4005); assertTrue(g.allowsUi(4006));
        g.speed(-1,4007); assertFalse(g.allowsUi(4008));
        g.approveParked(5000); g.speed(0,124999); assertTrue(g.allowsUi(124999));
        assertFalse(g.allowsUi(125000));
        g.stop(); assertFalse(g.allowsUi(100));
    }
    @Test public void pidFormulasAndDtc() {
        assertEquals(1726.0,Obd.pid("41 0C 1A F8\r>",0x0c),0);
        assertEquals(90.0,Obd.pid("410582",0x05),0);
        assertEquals(100.0,Obd.pid("410D64",0x0d),0);
        assertEquals(Arrays.asList("P0133","U0123"),Obd.dtc("43 01 33 C1 23 00 00"));
        assertEquals(Collections.emptyList(),Obd.dtc("43000000000000"));
    }
    @Test public void rejectAmbiguousAndMissingObd() {
        for(String s:new String[]{"NO DATA","7E8 03 41 0D 00","410D00410D00","410C00","SEARCHING...410D00"}) {
            try { Obd.pid(s,0x0d); fail(s); } catch(IllegalArgumentException expected) {}
        }
    }
    @Test public void boundedFramesAndEof() throws Exception {
        assertEquals("HOME",Protocol.read(new ByteArrayInputStream("HOME\n".getBytes("UTF-8"))));
        for(String s:new String[]{"HOME", "A\r\n", String.join("",Collections.nCopies(2049,"A"))+"\n"}) {
            try { Protocol.read(new ByteArrayInputStream(s.getBytes("UTF-8"))); fail(); } catch(IOException expected) {}
        }
    }
    @Test public void commandAllowlist() {
        assertEquals("MAPS",Protocol.command("Abrir mapas"));
        assertEquals("UNKNOWN",Protocol.command("apagar falhas"));
        assertEquals("UNKNOWN",Protocol.command("execute rm -rf"));
        assertEquals("CLICK com.spotify.music:id/play",Protocol.command("acionar com.spotify.music:id/play"));
    }
}
