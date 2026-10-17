package br.com.doapps.grauelive;

/** Sixteen-byte notification <= default BLE MTU payload (20 bytes). */
public final class GrauePacket {
    public static final int SIZE=16;
    public static byte[] encode(int sequence,MusicBrain.Harmony h){
        byte[] p=new byte[SIZE];
        p[0]='G'; p[1]=1; p[2]=(byte)sequence;
        p[3]=(byte)u8(h.midi);p[4]=(byte)u8(h.root);p[5]=(byte)u8(h.mode);
        p[6]=(byte)h.degree;p[7]=(byte)h.confidence;
        p[8]=(byte)u8(h.chord1);p[9]=(byte)u8(h.quality1);
        p[10]=(byte)u8(h.chord2);p[11]=(byte)u8(h.quality2);
        p[12]=(byte)255;p[13]=0;p[14]=0;
        int checksum=0; for(int i=0;i<SIZE-1;i++)checksum^=p[i]&255;
        p[15]=(byte)checksum;return p;
    }
    private static int u8(int val){return val<0?255:val;}
    public static boolean verify(byte[] p){if(p==null||p.length!=SIZE||p[0]!='G'||p[1]!=1)return false;
        int sum=0;for(byte b:p)sum^=b&255;return sum==0;
    }
}
