package br.com.doapps.grauelive;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.CRC32;
/** Bounded local loop library with atomic checkpoints. No MIDI output or network access. */
public final class MidiLoopFiles {
 public static final int MAX_BYTES=1_000_000,MAX_SAVED=100;
 private final File root;
 public static final class Entry {
  public final String id,name,songId,songTitle;public final long savedAt;public final MidiLooper.Session session;
  public Entry(String id,String name,String songId,String songTitle,long savedAt,MidiLooper.Session session){
   if(!id.matches("[a-f0-9-]{36}|checkpoint")||name==null||name.trim().isEmpty()||name.length()>80||songId==null||songId.length()>160||songTitle==null||songTitle.length()>150||session==null)throw new IllegalArgumentException("Identificação do loop inválida");
   this.id=id;this.name=name;this.songId=songId;this.songTitle=songTitle;this.savedAt=savedAt;this.session=session;
  }
 }
 public MidiLoopFiles(File directory)throws IOException{root=new File(directory,"midi-loops");if(!root.isDirectory()&&!root.mkdirs())throw new IOException("Não foi possível criar a biblioteca de loops");}
 public synchronized Entry save(String name,String songId,String songTitle,MidiLooper.Session session)throws IOException{
  if(savedFiles().length>=MAX_SAVED)throw new IOException("Biblioteca cheia: exporte e apague um loop (limite 100)");
  Entry e=new Entry(UUID.randomUUID().toString(),name.trim(),songId,songTitle,System.currentTimeMillis(),session);atomic(new File(root,e.id+".gloop"),encode(e));return e;
 }
 public synchronized void checkpoint(MidiLooper.Session session)throws IOException{atomic(new File(root,"checkpoint.gloop"),encode(new Entry("checkpoint","Última sessão","","",System.currentTimeMillis(),session)));}
 public synchronized Entry checkpoint()throws IOException{File f=new File(root,"checkpoint.gloop");return f.exists()?decode(read(f)):null;}
 public synchronized Entry load(String id)throws IOException{if(id==null||!id.matches("[a-f0-9-]{36}"))throw new IOException("Loop inválido");return decode(read(new File(root,id+".gloop")));}
 public synchronized void delete(String id)throws IOException{load(id);if(!new File(root,id+".gloop").delete())throw new IOException("Não foi possível apagar o loop salvo");}
 public synchronized List<Entry> list(){List<Entry> entries=new ArrayList<>();for(File f:savedFiles())try{entries.add(decode(read(f)));}catch(Exception ignored){}entries.sort(Comparator.comparingLong((Entry e)->e.savedAt).reversed());return entries;}
 private File[] savedFiles(){File[] f=root.listFiles((d,n)->n.matches("[a-f0-9-]{36}\\.gloop"));return f==null?new File[0]:f;}
 public static byte[] read(InputStream in)throws IOException{if(in==null)throw new IOException("Arquivo indisponível");ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>MAX_BYTES)throw new IOException("Loop maior que 1 MB");out.write(b,0,n);}return out.toByteArray();}
 private static byte[] read(File f)throws IOException{try(InputStream in=new FileInputStream(f)){return read(in);}}
 private static void atomic(File file,byte[] bytes)throws IOException{
  File tmp=File.createTempFile("loop-",".tmp",file.getParentFile());try{try(FileOutputStream out=new FileOutputStream(tmp)){out.write(bytes);out.getFD().sync();}try{Files.move(tmp.toPath(),file.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}catch(AtomicMoveNotSupportedException e){Files.move(tmp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING);}}finally{Files.deleteIfExists(tmp.toPath());}
 }
 public static byte[] encode(Entry e)throws IOException{
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);out.writeInt(0x474c5031);out.writeUTF(e.id);out.writeUTF(e.name);out.writeUTF(e.songId);out.writeUTF(e.songTitle);out.writeLong(e.savedAt);
  MidiLooper.Session s=e.session;out.writeInt(s.bpm);out.writeInt(s.beats);out.writeInt(s.bars);
  for(int i=0;i<4;i++){out.writeBoolean(s.muted(i));out.writeInt(s.tracks.get(i).size());for(MidiLooper.Event event:s.tracks.get(i)){out.writeLong(event.offsetNs);out.writeByte(event.status);out.writeByte(event.note);out.writeByte(event.velocity);}}
  out.flush();CRC32 crc=new CRC32();crc.update(bytes.toByteArray());out.writeLong(crc.getValue());out.flush();if(bytes.size()>MAX_BYTES)throw new IOException("Loop excede o limite");return bytes.toByteArray();
 }
 public static Entry decode(byte[] bytes)throws IOException{
  if(bytes==null||bytes.length<32||bytes.length>MAX_BYTES)throw new IOException("Arquivo de loop inválido");
  DataInputStream tail=new DataInputStream(new ByteArrayInputStream(bytes,bytes.length-8,8));CRC32 crc=new CRC32();crc.update(bytes,0,bytes.length-8);if(crc.getValue()!=tail.readLong())throw new IOException("Loop corrompido; gravação atual preservada");
  try{DataInputStream in=new DataInputStream(new ByteArrayInputStream(bytes,0,bytes.length-8));if(in.readInt()!=0x474c5031)throw new IOException("Versão de loop desconhecida");String id=in.readUTF(),name=in.readUTF(),song=in.readUTF(),title=in.readUTF();long at=in.readLong();int bpm=in.readInt(),beats=in.readInt(),bars=in.readInt();List<List<MidiLooper.Event>> tracks=new ArrayList<>();boolean[] muted=new boolean[4];
   for(int i=0;i<4;i++){muted[i]=in.readBoolean();int count=in.readInt();if(count<0||count>MidiLooper.MAX_EVENTS)throw new IOException("Número de eventos inválido");List<MidiLooper.Event> events=new ArrayList<>();for(int j=0;j<count;j++)events.add(new MidiLooper.Event(in.readLong(),in.readUnsignedByte(),in.readUnsignedByte(),in.readUnsignedByte()));tracks.add(events);}if(in.available()!=0)throw new IOException("Dados extras no loop");return new Entry(id,name,song,title,at,new MidiLooper.Session(bpm,beats,bars,tracks,muted));
  }catch(IllegalArgumentException e){throw new IOException("Loop inválido: "+e.getMessage(),e);}
 }
}
