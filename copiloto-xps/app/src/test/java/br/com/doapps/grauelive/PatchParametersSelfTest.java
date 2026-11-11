package br.com.doapps.grauelive;
import java.util.*;
public final class PatchParametersSelfTest {
 static void check(boolean ok,String label){if(!ok)throw new AssertionError(label);}
 static void fails(Runnable r){try{r.run();throw new AssertionError("Expected rejection");}catch(IllegalArgumentException expected){}}
 static byte[] packet(String id,int part,int tone,int value){PatchParameters.Def d=PatchParameters.get(id);return XpsProtocol.packet(0x12,PatchParameters.address(d,part,tone),PatchParameters.encode(d,value));}
 static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte n:b){if(s.length()>0)s.append(' ');s.append(String.format("%02X",n&255));}return s.toString();}
 public static void main(String[] args){
  check(PatchParameters.all().size()==244,"244 original definitions");
  check(hex(packet("tone_tva_env_time_1",0,4,90)).equals("F0 41 10 00 00 3A 12 11 00 26 66 5A 09 F7"),"Official TVA address/checksum vector");
  check(hex(packet("tone_lfo2_rate",15,2,149)).equals("F0 41 10 00 00 3A 12 14 60 22 7C 09 05 60 F7"),"Part16/Tone2 nibble vector");
  check(hex(packet("tone_wave_number_l_mono",0,1,16384)).equals("F0 41 10 00 00 3A 12 11 00 20 2C 04 00 00 00 1F F7"),"Four-nibble wave vector");
  check(PatchParameters.address(PatchParameters.get("tone_lfo2_delay_time"),0,1)==XpsProtocol.address(0x11,0,0x21,0),"Base128 carry, never base256");
  Set<Integer> all=new HashSet<>();
  for(int part=0;part<16;part++){
   check(PatchParameters.blocks(part).size()==6,"Common, TMT and four Tone blocks");
   for(PatchParameters.Def d:PatchParameters.all()){
    int count=d.section.equals("tone")?4:1;
    for(int tone=1;tone<=count;tone++){
     int address=PatchParameters.address(d,part,tone);check((address>>>21)>=0x11&&(address>>>21)<=0x14,"Only temporary Performance Patch addresses");
     for(int i=0;i<d.width;i++)check(all.add(address+i),"No alias or overlapping field "+d.id);
     for(int value:new int[]{d.min,d.max}){
      try{d.validate(value);}catch(IllegalArgumentException reserved){continue;}
      int[] bytes=PatchParameters.encode(d,value);check(PatchParameters.decode(d,bytes,0)==value,"Round-trip "+d.id);
      XpsProtocol.Data decoded=XpsProtocol.decode(XpsProtocol.packet(0x12,address,bytes));check(decoded!=null&&decoded.start==address,"Checksum "+d.id);
     }
    }
    fails(()->PatchParameters.encode(d,d.min-1));fails(()->PatchParameters.encode(d,d.max+1));
   }
  }
  fails(()->PatchParameters.get("arbitrary_sysex"));fails(()->PatchParameters.base(-1));fails(()->PatchParameters.base(16));
  fails(()->PatchParameters.block("tone",0,0));fails(()->PatchParameters.block("user",0,1));
  fails(()->PatchParameters.encode(PatchParameters.get("common_matrix_control_1_source"),32));
  fails(()->PatchParameters.encode(PatchParameters.get("tone_tone_output_assign"),2));
  fails(()->PatchParameters.decode(PatchParameters.get("tone_lfo1_rate"),new int[]{16,1},0));
  Map<Integer,Integer> state=new HashMap<>(),pending=new HashMap<>();int at=PatchParameters.block("tmt",0,1).start;
  state.put(at+6,20);state.put(at+7,80);pending.put(at+6,90);fails(()->PatchParameters.validateRanges(state,pending,0));
  pending.put(at+7,100);PatchParameters.validateRanges(state,pending,0);
  System.out.println("Deep Patch PASS: 244 fields, all 16 parts/4 tones, golden SysEx vectors, nibble widths, base128 carry, reserved values and range constraints");
 }
}
