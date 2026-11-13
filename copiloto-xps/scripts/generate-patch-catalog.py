"""Generate the native validator and WebView facts from the reviewed XPS-10 map."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
spec=json.loads((root/'spec/patch-parameters.json').read_text())
rows=spec['parameters']
java='''package br.com.doapps.grauelive;
import java.util.*;
/** XPS-10 MIDI Implementation e01 pp.10,17-18,20-22. Generated from spec/patch-parameters.json. */
public final class PatchParameters {
 public static final class Def {
  public final String id,section;public final int offset,width,min,max;private final int[] allowed,excluded;
  Def(String id,String section,int offset,int width,int min,int max,int[] allowed,int[] excluded){this.id=id;this.section=section;this.offset=offset;this.width=width;this.min=min;this.max=max;this.allowed=allowed;this.excluded=excluded;}
  public void validate(int value){if(value<min||value>max||excluded!=null&&Arrays.stream(excluded).anyMatch(n->n==value)||allowed!=null&&Arrays.stream(allowed).noneMatch(n->n==value))throw new IllegalArgumentException("Valor fora do mapa MIDI: "+id);}
 }
 private static final Map<String,Def> MAP=new LinkedHashMap<>();
 static {
'''
for d in rows:
 def arr(name):return 'null' if name not in d else 'new int[]{'+','.join(map(str,d[name]))+'}'
 java+=f'  add(new Def("{d["id"]}","{d["section"]}",{d["offset"]},{d["width"]},{d["min"]},{d["max"]},{arr("allowed")},{arr("excluded")}));\n'
java+=''' }
 private static void add(Def d){if(MAP.put(d.id,d)!=null)throw new IllegalStateException("Duplicate parameter");}
 public static Collection<Def> all(){return Collections.unmodifiableCollection(MAP.values());}
 public static Def get(String id){Def d=MAP.get(id);if(d==null)throw new IllegalArgumentException("Parâmetro interno desconhecido");return d;}
 public static int base(int part){if(part<0||part>=16)throw new IllegalArgumentException("Parte inválida");return XpsProtocol.address(0x11+part/4,(part%4)*32,0,0);}
 public static XpsProtocol.Block block(String section,int part,int tone){
  int base=base(part);
  if(section.equals("common"))return new XpsProtocol.Block("patch",part,base,80);
  if(section.equals("tmt"))return new XpsProtocol.Block("patchTmt",part,base+XpsProtocol.address(0,0,0x10,0),41);
  if(!section.equals("tone")||tone<1||tone>4)throw new IllegalArgumentException("Tone inválido");
  return new XpsProtocol.Block("patchTone",part*4+tone-1,base+XpsProtocol.address(0,0,0x20+(tone-1)*2,0),154);
 }
 public static List<XpsProtocol.Block> blocks(int part){List<XpsProtocol.Block> r=new ArrayList<>();r.add(block("common",part,1));r.add(block("tmt",part,1));for(int i=1;i<=4;i++)r.add(block("tone",part,i));return r;}
 public static int address(Def d,int part,int tone){return block(d.section,part,tone).start+d.offset;}
 public static int[] encode(Def d,int value){d.validate(value);if(d.width==1)return new int[]{value};int[] bytes=new int[d.width];for(int i=d.width-1;i>=0;i--){bytes[i]=value&15;value>>>=4;}return bytes;}
 public static int decode(Def d,int[] bytes,int offset){if(bytes==null||offset<0||offset+d.width>bytes.length)throw new IllegalArgumentException("Leitura incompleta");int value=0;for(int i=0;i<d.width;i++){int b=bytes[offset+i];if(b<0||b>(d.width==1?127:15))throw new IllegalArgumentException("Codificação MIDI inválida");value=d.width==1?b:(value<<4)|b;}d.validate(value);return value;}
 /** Cross-field constraints use the combined pending values and actual readback. */
 public static void validateRanges(Map<Integer,Integer> state,Map<Integer,Integer> pending,int part){
  XpsProtocol.Block b=block("tmt",part,1);
  for(int i=0;i<4;i++)for(int low:new int[]{6+9*i,10+9*i}){
   Integer lo=pending.getOrDefault(b.start+low,state.get(b.start+low)),hi=pending.getOrDefault(b.start+low+1,state.get(b.start+low+1));
   if((pending.containsKey(b.start+low)||pending.containsKey(b.start+low+1))&&(lo==null||hi==null||lo>hi))throw new IllegalArgumentException("Faixa de tecla/velocidade inválida");
  }
 }
}
'''
(root/'app/src/main/java/br/com/doapps/grauelive/PatchParameters.java').write_text(java)
js="'use strict';\n// Generated parameter facts. Source and PDF hash are in spec/patch-parameters.json.\n(function(g){const data="+json.dumps(rows,separators=(',',':'),ensure_ascii=False)+";if(typeof module!=='undefined')module.exports=data;if(g)g.GrauePatchParameters=data;})(typeof window!=='undefined'?window:null);\n"
(root/'app/src/main/assets/patch-parameters.js').write_text(js)
print('Generated',len(rows),'parameter definitions')
