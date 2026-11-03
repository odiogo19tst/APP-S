package io.github.odiogo19tst.jarvis;

import java.util.*;
/** Mode 01/03 only. Assumes ELM headers and echo disabled; rejects ambiguous multi-ECU replies. */
public final class Obd {
    private Obd() {}
    public static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    public static int[] bytes(String response) {
        String s = response.replaceAll("\\s|>", "");
        if (s.isEmpty() || (s.length() & 1) != 0 || !s.matches("[0-9A-Fa-f]+"))
            throw new IllegalArgumentException("Resposta ELM ausente, ambígua ou incompatível");
        int[] b = new int[s.length()/2];
        for(int i=0;i<b.length;i++) b[i]=Integer.parseInt(s.substring(i*2,i*2+2),16);
        return b;
    }
    public static double pid(String response, int pid) {
        int[] b=bytes(response);
        int n=pid==0x0c ? 4 : 3;
        if(b.length!=n || b[0]!=0x41 || b[1]!=pid) throw new IllegalArgumentException("PID não suportado");
        switch(pid) {
            case 0x0c: return (b[2]*256+b[3])/4.0;
            case 0x05: return b[2]-40;
            case 0x0d: return b[2];
            default: throw new IllegalArgumentException("PID bloqueado");
        }
    }
    public static List<String> dtc(String response) {
        int[] b=bytes(response);
        if(b[0]!=0x43 || (b.length & 1)!=1) throw new IllegalArgumentException("Mode 03 incompatível");
        List<String> codes=new ArrayList<>();
        for(int i=1;i+1<b.length;i+=2) {
            int a=b[i], c=b[i+1];
            if(a==0 && c==0) continue;
            codes.add(String.format(Locale.ROOT,"%c%d%X%02X","PCBU".charAt(a>>6),(a>>4)&3,a&15,c));
        }
        return codes;
    }
}
