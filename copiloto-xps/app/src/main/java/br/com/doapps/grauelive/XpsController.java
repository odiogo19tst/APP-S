package br.com.doapps.grauelive;
import android.os.*;
import org.json.*;
import java.util.*;
/** Serialized read/write operations; no edits to user memory. Hardware readback is mandatory. */
public final class XpsController {
 public interface IO {boolean send(byte[] bytes);void emit(String kind,Object data);}
 private final List<XpsProtocol.Block> readable=XpsProtocol.readable();
 private final IO io;private final Handler h=new Handler(Looper.getMainLooper());
 private final Map<Integer,Integer> state=new HashMap<>();private Map<Integer,Integer> undo=new LinkedHashMap<>();
 private Map<Integer,Integer> expected=new LinkedHashMap<>();private int generation=0;private boolean busy=false;
 private int deepPart=-1,deepRevision=0;private boolean deepValid=false;private int[] deepIdentity;
 private Map<Integer,Integer> patchUndo=new LinkedHashMap<>(),patchUndoExpected=new LinkedHashMap<>();
 public boolean isBusy(){return busy;}
 public void patchSelectionInput(){if(deepPart<0)return;invalidatePatch();io.emit("status","Seleção MIDI mudou no teclado. Releia o Patch antes de editar.");h.postDelayed(()->readWhenIdle(5),300);}
 private boolean patchIdentityMatches(){if(deepPart<0||deepIdentity==null||!hasPerformancePart(deepPart))return false;XpsProtocol.Block part=XpsProtocol.block("part",deepPart);for(int i=0;i<3;i++)if(!Integer.valueOf(deepIdentity[i]).equals(state.get(part.start+4+i)))return false;return true;}
 private void invalidatePatch(){if(deepPart>=0&&busy){generation++;busy=false;expected.clear();io.emit("hardwareBusy",false);}deepPart=-1;deepIdentity=null;deepValid=false;deepRevision++;patchUndo.clear();patchUndoExpected.clear();publishPatch();}
 public void publishPatch(){
  try{JSONObject data=new JSONObject().put("part",deepPart).put("revision",deepRevision).put("ready",false).put("source","midi-live");
   if(deepPart>=0){boolean complete=true;for(XpsProtocol.Block b:PatchParameters.blocks(deepPart)){
    JSONArray values=new JSONArray();for(int i=0;i<b.size;i++){Integer v=state.get(b.start+i);if(v==null){complete=false;break;}values.put(v);}
    if(values.length()==b.size)data.put(b.section.equals("patch")?"common":b.section.equals("patchTmt")?"tmt":"tone"+(b.index%4+1),values);
   }data.put("ready",deepValid&&complete&&!busy&&patchIdentityMatches());data.put("identity",new JSONArray(deepIdentity));data.put("readAt",System.currentTimeMillis());}
   io.emit("deepPatch",data);
  }catch(Exception ignored){}
 }
 public void readPatch(int part){
  if(busy){io.emit("status","Aguarde a operação MIDI atual.");return;}
  if(!hasValidSysex()||!hasPerformancePart(part)){io.emit("status","Leia uma Performance real antes de abrir os Tones internos.");return;}
  XpsProtocol.Block b=XpsProtocol.block("part",part);Integer bank=state.get(b.start+4);
  if(bank==null||(bank!=87&&bank!=121)){io.emit("status","A parte precisa usar um Patch melódico; Drum Kits usam outro mapa.");return;}
  if(deepPart!=part){patchUndo.clear();patchUndoExpected.clear();}
  deepPart=part;deepIdentity=new int[]{bank,state.get(b.start+5),state.get(b.start+6)};deepValid=false;deepRevision++;publishPatch();
  readBlocks(PatchParameters.blocks(part),false);
 }
 private static int patchInt(JSONObject o,String key)throws JSONException{Object value=o.get(key);if(!(value instanceof Number)||!Double.isFinite(((Number)value).doubleValue())||((Number)value).doubleValue()!=((Number)value).intValue())throw new IllegalArgumentException("Valor precisa ser inteiro");return ((Number)value).intValue();}
 public void writePatch(String json,boolean armed){
  if(!armed||busy||!deepValid||!patchIdentityMatches()){io.emit("status","Leia novamente o Patch antes de editar seus parâmetros internos.");return;}
  try{JSONObject request=new JSONObject(json);if(request.length()!=3||patchInt(request,"part")!=deepPart||patchInt(request,"revision")!=deepRevision)throw new IllegalArgumentException("A leitura do Patch mudou. Revise novamente.");
   JSONArray ops=request.getJSONArray("operations");if(ops.length()<1||ops.length()>64)throw new IllegalArgumentException("Quantidade de parâmetros inválida");
   Map<Integer,Integer> target=new LinkedHashMap<>(),before=new LinkedHashMap<>();
   for(int i=0;i<ops.length();i++){JSONObject op=ops.getJSONObject(i);if(op.length()!=3||!op.has("field")||!op.has("tone")||!op.has("value"))throw new IllegalArgumentException("Campos de edição não autorizados");
    PatchParameters.Def d=PatchParameters.get(op.getString("field"));int tone=patchInt(op,"tone"),value=patchInt(op,"value");
    if(tone<1||tone>4)throw new IllegalArgumentException("Tone inválido");
    int address=PatchParameters.address(d,deepPart,tone);int[] bytes=PatchParameters.encode(d,value);
    for(int n=0;n<bytes.length;n++){int at=address+n;if(!state.containsKey(at))throw new IllegalArgumentException("Parâmetro sem leitura real");if(target.put(at,bytes[n])!=null)throw new IllegalArgumentException("Parâmetro duplicado");before.put(at,state.get(at));}
   }
   PatchParameters.validateRanges(state,target,deepPart);
   if(target.equals(before)){io.emit("status","O Patch já corresponde aos valores escolhidos.");return;}
   patchUndo=before;patchUndoExpected=new LinkedHashMap<>(target);deepValid=false;deepRevision++;publishPatch();send(target);
  }catch(Exception e){io.emit("status",e.getMessage());}
 }
 public void undoPatch(boolean armed){
  if(!armed||busy||!deepValid||!patchIdentityMatches()||patchUndo.isEmpty()){io.emit("status","Não há edição interna confirmada para desfazer.");return;}
  if(!patchUndoExpected.entrySet().stream().allMatch(e->e.getValue().equals(state.get(e.getKey())))){io.emit("status","O Patch mudou após a edição. Desfazer bloqueado; leia e revise os valores.");return;}
  Map<Integer,Integer> old=patchUndo;patchUndo=new LinkedHashMap<>();patchUndoExpected.clear();deepValid=false;deepRevision++;publishPatch();send(old);
 }
 private int validSysexPackets=0;
 private volatile boolean patchObserveEnabled=false;private int patchObserveCount=0;
 /** This is an observed response, unlike USB-MIDI port connection or sent requests. */
 public boolean hasValidSysex(){return validSysexPackets>0;}
 public int validSysexCount(){return validSysexPackets;}
 public XpsController(IO io){this.io=io;}
 /** Read-only diagnostic: logs only checksum-valid DT1 in temporary Patch address space.
  * Never requests, edits, or stores USER data. Must be explicitly enabled by musician. */
 public void observePatch(boolean enabled){patchObserveEnabled=enabled;patchObserveCount=0;io.emit("patchObserveState",enabled);}
 private void emitPatchObservation(XpsProtocol.Data d){
  int msb=(d.start>>21)&127;
  if(!patchObserveEnabled||msb<0x11||msb>0x1f||d.values.length<1||d.values.length>32||patchObserveCount>=100)return;
  patchObserveCount++;
  try{
   JSONObject message=new JSONObject();message.put("address",d.start);
   int[] digits=XpsProtocol.digits(d.start);message.put("hex",String.format(java.util.Locale.ROOT,"%02X %02X %02X %02X",digits[0],digits[1],digits[2],digits[3]));
   JSONArray values=new JSONArray();for(int n:d.values)values.put(n);
   message.put("values",values);message.put("count",patchObserveCount);
   message.put("source","roland-dt1-checksum-valid");io.emit("patchProbe",message);
  }catch(JSONException ignored){}
 }
 private List<XpsProtocol.Block> performanceBlocks(){List<XpsProtocol.Block> b=XpsProtocol.blocks();b.addAll(XpsProtocol.patches());return b;}
 public void readUsers(){if(!hasValidSysex()){io.emit("status","USB-MIDI detectado, mas o XPS-10 não respondeu SysEx. Não vou enviar 256 consultas sem confirmação. Verifique driver GENERIC, modo MIDI e Device ID.");return;}if(busy){io.emit("status","Aguarde a operação atual.");return;}busy=true;io.emit("hardwareBusy",true);int token=++generation,delay=0;for(XpsProtocol.Block b:XpsProtocol.users()){for(int i=0;i<b.size;i++)state.remove(b.start+i);h.postDelayed(()->{if(token!=generation)return;if(!io.send(XpsProtocol.request(b))){abort("Sem porta MIDI de saída.");return;}if(b.index%32==0)io.emit("status","Consultando timbres de usuário: "+(b.index+1)+" / 256…");},delay);delay+=100;}h.postDelayed(()->{if(token!=generation)return;busy=false;io.emit("hardwareBusy",false);JSONArray tones=new JSONArray();for(XpsProtocol.Block b:XpsProtocol.users()){StringBuilder name=new StringBuilder();boolean complete=true;for(int i=0;i<12;i++){Integer c=state.get(b.start+i);if(c==null){complete=false;break;}name.append(c>=32&&c<=126?(char)(int)c:' ');}if(complete)try{JSONObject t=new JSONObject();t.put("code",String.format(java.util.Locale.ROOT,"USER%03d",b.index+1));t.put("name",name.toString().trim());t.put("category","USER");t.put("msb",87);t.put("lsb",b.index/128);t.put("program",b.index%128+1);tones.put(t);}catch(JSONException ignored){}}io.emit("userTones",tones);io.emit("status",tones.length()+" de 256 posições de usuário responderam. Posições sem resposta não foram inventadas.");},delay+1500);}
 /** A tap is an explicit authorization to audition a tone, not a request to save in USER memory. */
 public boolean hasPerformancePart(int part){
  if(part<0||part>15)return false;
  XpsProtocol.Block b=XpsProtocol.block("part",part);
  return Integer.valueOf(1).equals(state.get(XpsProtocol.address(1,0,0,0)))
   &&state.containsKey(b.start+4)&&state.containsKey(b.start+5)&&state.containsKey(b.start+6);
 }
 /**
  * CC80–83 affect four Patch Tone levels (XPS-10 MIDI Implementation 2014).
  * They are MIDI channel controls, not SysEx part-addressed edits.
  * Do not allow a command when the target channel is shared by another
  * receiving Performance part, or when any part's channel is unobserved.
  * Caller must not call this a verified readback of tone level.
  */
 public int isolatedToneChannel(int part){
  if(part<0||part>=16||busy||!hasValidSysex()||!hasPerformancePart(part))return -1;
  XpsProtocol.Block selected=XpsProtocol.block("part",part);
  Integer channel=state.get(selected.start),enabled=state.get(selected.start+1);
  if(channel==null||channel<0||channel>15||!Integer.valueOf(1).equals(enabled))return -1;
  for(int i=0;i<16;i++){
   if(i==part)continue;
   XpsProtocol.Block b=XpsProtocol.block("part",i);
   Integer otherChannel=state.get(b.start),otherEnabled=state.get(b.start+1);
   if(otherChannel==null||otherEnabled==null)return -1;
   if(otherChannel.equals(channel)&&Integer.valueOf(1).equals(otherEnabled))return -1;
  }
  return channel+1;
 }
 public void auditionTone(int part,int msb,int lsb,int program){auditionToneConfig(part,msb,lsb,program,-1);}
 public void auditionToneConfig(int part,int msb,int lsb,int program,int volume){
  if(part<0||part>=16||msb<0||msb>127||lsb<0||lsb>127||program<1||program>128){
   io.emit("status","Endereço do timbre inválido.");return;
  }
  if(busy){io.emit("status","Leitura do XPS-10 em andamento. Toque novamente após concluir.");return;}
  if(!hasPerformancePart(part)){io.emit("status","Não há Performance ativa com parâmetros completos; selecione uma Performance e aguarde a leitura para editar esta parte.");return;}
  try{
   JSONArray edits=new JSONArray()
    .put(new JSONObject().put("section","part").put("index",part).put("offset",4).put("value",msb))
    .put(new JSONObject().put("section","part").put("index",part).put("offset",5).put("value",lsb))
    .put(new JSONObject().put("section","part").put("index",part).put("offset",6).put("value",program-1));
   if(volume>=0&&volume<=127)edits.put(new JSONObject().put("section","part").put("index",part).put("offset",7).put("value",volume));
   write(edits.toString(),true); // single explicit tap; guarded snapshot+readback, never WRITE to user memory
  }catch(JSONException e){io.emit("status","Não foi possível selecionar o timbre: "+e.getMessage());}
 }
 public void reset(){invalidatePatch();patchObserveEnabled=false;patchObserveCount=0;io.emit("patchObserveState",false);generation++;state.clear();undo.clear();expected.clear();busy=false;validSysexPackets=0;io.emit("hardwareReset",true);}
 public void accept(byte[] packet){
  XpsProtocol.Data d=XpsProtocol.decode(packet);if(d==null)return;
  emitPatchObservation(d);
  validSysexPackets++;
  if(validSysexPackets==1)io.emit("sysexReady",true);
  boolean deepChanged=false;
  java.util.Set<String> changed=new java.util.LinkedHashSet<>();
  for(int i=0;i<d.values.length;i++){
   int address=d.start+i;
   for(XpsProtocol.Block block:readable){
    if(address>=block.start&&address<block.start+block.size){
     Integer before=state.put(address,d.values[i]);
     if(deepPart>=0&&(before==null||before!=d.values[i]))for(XpsProtocol.Block db:PatchParameters.blocks(deepPart))if(address>=db.start&&address<db.start+db.size){deepChanged=true;break;}
     if(!busy&&(before==null||before!=d.values[i]))changed.add(block.section+":"+block.index);
     break;
    }
   }
  }
  if(deepPart>=0&&!patchIdentityMatches())invalidatePatch();
  else if(deepChanged){deepRevision++;if(!busy)publishPatch();}
  // On the actual XPS-10, MIDI Tx Edit Data can forward physical slider/edit changes as SysEx.
  // Merge observed packets with cached blocks; never invent values for missing bytes.
  if(!busy&&!changed.isEmpty()){
   JSONObject updated=snapshot();
   io.emit("hardwarePhysical",updated);
  }
 }
 private JSONObject snapshot(){JSONObject result=new JSONObject();try{for(XpsProtocol.Block b:performanceBlocks()){JSONArray values=new JSONArray();boolean complete=true;for(int i=0;i<b.size;i++){Integer v=state.get(b.start+i);if(v==null){complete=false;break;}values.put(v);}if(complete)result.put(b.section+":"+b.index,values);}int completeBlocks=0;for(XpsProtocol.Block block:performanceBlocks()){
   boolean complete=true;
   for(int i=0;i<block.size;i++)if(!state.containsKey(block.start+i)){complete=false;break;}
   if(complete)completeBlocks++;
  }
  result.put("readAt",System.currentTimeMillis());
  result.put("source","midi-live");
  result.put("validSysexPackets",validSysexPackets);
  result.put("completeBlocks",completeBlocks);
  result.put("availableBlocks",performanceBlocks().size());
  result.put("fullStateVerified",completeBlocks==performanceBlocks().size()&&validSysexPackets>0);
  result.put("favoritesVerified",false);
  result.put("notes","Memória FAVORITE 0–9 não confirmada por SysEx; requer backup válido.");}catch(JSONException ignored){}return result;}
 /** One-time connection sync. Probe SysEx before scanning every available active block.
  * It does not claim to enumerate stored FAVORITE banks.
  */
 public void initialSync(){
  if(busy){io.emit("status","Sincronização MIDI já em andamento.");return;}
  expected.clear();busy=true;
  io.emit("hardwareBusy",true);
  int token=++generation;
  io.emit("status","USB MIDI conectado. Verificando resposta SysEx antes da leitura.");
  XpsProtocol.Block setup=XpsProtocol.block("setup",0),common=XpsProtocol.block("common",0);
  if(!io.send(XpsProtocol.request(setup))){abort("Não foi possível solicitar identificação MIDI ao XPS-10.");return;}
  h.postDelayed(()->{if(token==generation)io.send(XpsProtocol.request(common));},240);
  h.postDelayed(()->{
   if(token!=generation)return;
   busy=false;io.emit("hardwareBusy",false);
   if(!hasValidSysex()){
    io.emit("hardware",snapshot());
    io.emit("status","USB-MIDI conectado, porém sem resposta SysEx. Consulta completa não iniciada; verifique driver USB GENERIC, Device ID e cabos. O backup ainda pode ser importado.");
    return;
   }
   io.emit("status","SysEx confirmado. Lendo blocos do estado ativo, sem alterar a memória USER.");
   readNow();
  },1450);
 }
 /** Read the Performance selected by the musician after the pending initial USB sync settles. */
 public void readWhenIdle(int attempts){
  if(attempts<=0){io.emit("status","Não foi possível reler a Performance: MIDI ocupado. Tente novamente.");return;}
  if(busy){h.postDelayed(()->readWhenIdle(attempts-1),400);return;}
  expected.clear();readNow();
 }
 public void read(){if(busy){io.emit("status","Aguarde a operação MIDI em andamento.");return;}expected.clear();readNow();}
 private void readNow(){invalidatePatch();readBlocks(performanceBlocks(),true);}
 private void readBlocks(List<XpsProtocol.Block> requested,boolean full){final int patchReadPart=deepPart;final boolean fullPatchRead=patchReadPart>=0&&PatchParameters.blocks(patchReadPart).stream().allMatch(pb->requested.stream().anyMatch(rb->rb.start==pb.start&&rb.size==pb.size));busy=true;if(full)state.clear();else for(XpsProtocol.Block b:requested)for(int i=0;i<b.size;i++)state.remove(b.start+i);io.emit("hardwareBusy",true);io.emit("status","Lendo XPS-10… aguarde a resposta do teclado.");int token=++generation,delay=0;for(XpsProtocol.Block b:requested){h.postDelayed(()->{if(token!=generation)return;if(!io.send(XpsProtocol.request(b))){abort("Porta MIDI indisponível para leitura.");}},delay);delay+=100;}
  h.postDelayed(()->{if(token!=generation)return;busy=false;io.emit("hardwareBusy",false);JSONObject result=snapshot();io.emit("hardware",result);boolean verified=!expected.isEmpty()&&expected.entrySet().stream().allMatch(e->e.getValue().equals(state.get(e.getKey())));String message=state.isEmpty()?"Sem resposta SysEx. Confira USB, modo MIDI e Device ID 17 (10h).":expected.isEmpty()?"Leitura recebida. Blocos ausentes permanecem indisponíveis.":verified?"Alteração confirmada pela leitura do XPS-10.":"Não foi possível confirmar todos os valores enviados. Leia novamente e confira o teclado.";io.emit("status",message);expected.clear();if(deepPart>=0){if(fullPatchRead&&deepPart==patchReadPart)deepValid=patchIdentityMatches();publishPatch();}},delay+700);
 }
 private void abort(String message){deepValid=false;deepRevision++;publishPatch();generation++;busy=false;io.emit("hardwareBusy",false);io.emit("status",message);io.emit("hardware",snapshot());}
 public void cancelWrites(){if(busy)abort("Operação interrompida. Parte dos comandos pode ter sido enviada; leia novamente.");}
 public void write(String json,boolean armed){if(!armed){io.emit("status","USB-MIDI não conectado. Conecte o XPS-10 para testar a edição.");return;}if(busy){io.emit("status","Aguarde a operação atual.");return;}
  try{JSONArray items=new JSONArray(json);if(items.length()<1||items.length()>128)throw new IllegalArgumentException("Quantidade inválida de parâmetros");Map<Integer,Integer> target=new LinkedHashMap<>();for(int i=0;i<items.length();i++){JSONObject o=items.getJSONObject(i);String section=o.getString("section");if(section.equals("mfxparam")){int unit=o.getInt("index"),type=o.getInt("effect");if(!Integer.valueOf(type).equals(state.get(XpsProtocol.block("mfx",unit).start)))throw new IllegalArgumentException("O tipo MFX mudou. Leia novamente.");int a=MfxParameters.address(unit,type,o.getInt("offset"),o.getInt("value"));int[] v=MfxParameters.nibbles(o.getInt("value"));for(int n=0;n<4;n++)if(target.put(a+n,v[n])!=null)throw new IllegalArgumentException("Parâmetro duplicado");}else if(section.equals("masterTune")){if(o.getInt("index")!=0||o.getInt("offset")!=0)throw new IllegalArgumentException("Alvo de afinação inválido");int[] v=XpsProtocol.masterTune(o.getInt("value"));int a=XpsProtocol.block("system",0).start;for(int n=0;n<4;n++)if(target.put(a+n,v[n])!=null)throw new IllegalArgumentException("Parâmetro duplicado");}else{int a=XpsProtocol.writeAddress(section,o.getInt("index"),o.getInt("offset"),o.getInt("value"));if(target.put(a,o.getInt("value"))!=null)throw new IllegalArgumentException("Parâmetro duplicado");}}
   for(int i=0;i<3;i++){int a=XpsProtocol.block("mfx",i).start;if(target.containsKey(a))for(int k=17;k<145;k++)if(target.containsKey(a+k))throw new IllegalArgumentException("Troque o tipo MFX e leia antes de editar seus parâmetros");}
   boolean onlyMode=target.size()==1&&target.containsKey(XpsProtocol.address(1,0,0,0));boolean onlySystem=target.keySet().stream().allMatch(XpsProtocol::isSystemAddress);if(!onlyMode&&!onlySystem&&!Integer.valueOf(1).equals(state.get(XpsProtocol.address(1,0,0,0))))throw new IllegalArgumentException("Leia o teclado e use modo Performance antes de editar");
   // Validate zone ranges against the combined target + last hardware snapshot.
   for(XpsProtocol.Block b:XpsProtocol.blocks())if(b.section.equals("zone")){Integer lo=target.getOrDefault(b.start+12,state.get(b.start+12)),hi=target.getOrDefault(b.start+13,state.get(b.start+13));if(lo!=null&&hi!=null&&lo>hi)throw new IllegalArgumentException("Nota inicial maior que final");}
   Map<Integer,Integer> before=new LinkedHashMap<>();for(int a:target.keySet()){if(!state.containsKey(a))throw new IllegalArgumentException("Faça uma leitura completa antes de editar");before.put(a,state.get(a));}undo=onlyMode?new LinkedHashMap<>():before;send(target);
  }catch(Exception e){io.emit("status",e.getMessage());}
 }
 private void send(Map<Integer,Integer> target){busy=true;io.emit("hardwareBusy",true);expected=new LinkedHashMap<>(target);int token=++generation,delay=0;
  List<Integer> keys=new ArrayList<>(target.keySet());Collections.sort(keys);
  for(int i=0;i<keys.size();){int start=keys.get(i),end=i+1;while(end<keys.size()&&keys.get(end)==keys.get(end-1)+1)end++;int[] values=new int[end-i];for(int k=i;k<end;k++)values[k-i]=target.get(keys.get(k));byte[] packet=XpsProtocol.packet(0x12,start,values);h.postDelayed(()->{if(token!=generation)return;if(!io.send(packet))abort("Falha no envio. Leia novamente antes de continuar.");},delay);delay+=35;i=end;}
  h.postDelayed(()->{if(token!=generation)return;if(target.containsKey(XpsProtocol.address(1,0,0,0))||target.containsKey(XpsProtocol.address(1,0,0,38))){readNow();return;}if(deepPart>=0&&PatchParameters.blocks(deepPart).stream().anyMatch(b->target.keySet().stream().anyMatch(a->a>=b.start&&a<b.start+b.size))){readBlocks(PatchParameters.blocks(deepPart),false);return;}List<XpsProtocol.Block> touched=new ArrayList<>();for(XpsProtocol.Block b:XpsProtocol.blocks())if(target.keySet().stream().anyMatch(a->a>=b.start&&a<b.start+b.size)){touched.add(b);if(b.section.equals("part")&&(target.containsKey(b.start+4)||target.containsKey(b.start+5)||target.containsKey(b.start+6)))touched.add(XpsProtocol.patches().get(b.index));}readBlocks(touched,false);},delay+400);
 }
 public void undo(boolean armed){if(!armed||busy){io.emit("status","Conecte o XPS-10 e aguarde a leitura ou edição atual.");return;}if(undo.isEmpty()){io.emit("status","Não há alteração temporária com estado anterior conhecido.");return;}Map<Integer,Integer> old=undo;undo=new LinkedHashMap<>();send(old);}
}
