package br.com.doapps.grauelive;
import java.util.*;
public class XpsProtocolSelfTest {
 static void check(boolean x,String m){if(!x)throw new AssertionError(m);}
 static void reject(Runnable r){boolean rejected=false;try{r.run();}catch(IllegalArgumentException e){rejected=true;}check(rejected,"Invalid write accepted");}
 public static void main(String[] args){
  check(XpsProtocol.blocks().size()==42,"block count");
  check(XpsProtocol.patches().get(15).start==XpsProtocol.address(20,96,0,0),"part16 temporary patch");
  check(XpsProtocol.users().get(255).start==XpsProtocol.address(49,127,0,0),"user256 address");
  int a=XpsProtocol.address(16,0,32,0);byte[] p=XpsProtocol.packet(18,a,new int[]{127,0,64});XpsProtocol.Data d=XpsProtocol.decode(p);check(d!=null&&d.start==a&&Arrays.equals(d.values,new int[]{127,0,64}),"DT1 roundtrip");
  byte[] bad=p.clone();bad[11]^=1;check(XpsProtocol.decode(bad)==null,"checksum rejection");bad=p.clone();bad[2]=17;check(XpsProtocol.decode(bad)==null,"device rejection");
  byte[] request=XpsProtocol.request(XpsProtocol.block("mfx",0));check(request[13]==1&&request[14]==17,"base128 size145");check(XpsProtocol.decode(request)==null,"RQ1 is not DT1");
  List<byte[]> received=new ArrayList<>();XpsProtocol.Stream stream=new XpsProtocol.Stream(received::add);stream.feed(p,0,5);stream.feed(new byte[]{(byte)248},0,1);stream.feed(p,5,p.length-5);check(received.size()==1&&Arrays.equals(received.get(0),p),"split/realtime SysEx");
  stream.feed(new byte[]{(byte)240,65,(byte)144,60,90},0,5);stream.feed(p,0,p.length);check(received.size()==2,"malformed recovery");
  check(XpsProtocol.writeAddress("zone",15,13,127)==XpsProtocol.address(16,0,95,13),"zone16 address");
  reject(()->XpsProtocol.writeAddress("part",0,2,1));reject(()->XpsProtocol.writeAddress("mfx",0,0,79));reject(()->XpsProtocol.writeAddress("part",16,7,100));reject(()->XpsProtocol.writeAddress("setup",0,0,4));reject(()->XpsProtocol.writeAddress("zone",0,0,60));
  check(XpsProtocol.writeAddress("part",0,21,67)==a+21,"octave");
  check(XpsProtocol.block("rhythmGroup",0).start==XpsProtocol.address(30,19,0,0),"rhythm group address");
  check(XpsProtocol.block("rhythmGroup",0).size==115,"rhythm group size");
  check(XpsProtocol.writeAddress("setup",0,27,127)>0,"arp style");reject(()->XpsProtocol.writeAddress("setup",0,38,24));reject(()->XpsProtocol.writeAddress("rhythmGroup",0,22,1));reject(()->XpsProtocol.writeAddress("rhythmGroup",0,23,16));
  int m=MfxParameters.address(0,1,1,32783);check(m==XpsProtocol.block("mfx",0).start+21,"EQ gain address");check(Arrays.equals(MfxParameters.nibbles(32783),new int[]{8,0,0,15}),"four nibble codec");reject(()->MfxParameters.address(0,1,1,32799));reject(()->MfxParameters.address(0,1,31,32768));reject(()->MfxParameters.address(0,79,0,32768));
  check(XpsProtocol.block("system",0).start==XpsProtocol.address(2,0,0,0),"system base");
  check(XpsProtocol.block("systemController",0).start==XpsProtocol.address(2,0,64,0),"controller base");
  check(Arrays.equals(XpsProtocol.masterTune(1024),new int[]{0,4,0,0}),"440 Hz encoding");
  check(Arrays.equals(XpsProtocol.packet(0x12,XpsProtocol.address(2,0,0,0),XpsProtocol.masterTune(1147)),new byte[]{(byte)0xf0,0x41,0x10,0,0,0x3a,0x12,2,0,0,0,0,4,7,11,0x68,(byte)0xf7}),"golden tuning packet +12.3 cents");
  check(Arrays.equals(XpsProtocol.masterTune(24),new int[]{0,0,1,8}),"minimum tune");
  check(Arrays.equals(XpsProtocol.masterTune(2024),new int[]{0,7,14,8}),"maximum tune");
  reject(()->XpsProtocol.masterTune(23));reject(()->XpsProtocol.masterTune(2025));
  reject(()->XpsProtocol.writeAddress("system",0,0,4));reject(()->XpsProtocol.writeAddress("system",0,8,1));reject(()->XpsProtocol.writeAddress("systemController",0,4,1));
  reject(()->XpsProtocol.writeAddress("systemController",0,3,0));reject(()->XpsProtocol.writeAddress("systemController",0,7,25));
  check(XpsProtocol.writeAddress("system",0,4,40)==XpsProtocol.address(2,0,0,4),"global key shift");
  check(XpsProtocol.writeAddress("systemController",0,7,24)==XpsProtocol.address(2,0,64,7),"pedal favorite down");
  check(XpsProtocol.isSystemAddress(XpsProtocol.address(2,0,0,0)),"global mode independent");check(!XpsProtocol.isSystemAddress(a),"part still Performance only");
  System.out.println("XPS protocol: addresses, sizes, checksum, stream and write allowlist passed");
 }
}
