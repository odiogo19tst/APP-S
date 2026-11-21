package br.com.doapps.grauelive;
import java.io.*;
import java.util.*;
/** Read-only SVD1 directory and packed seven-bit NAME fields. Other packed parameters are not MIDI bytes. */
public final class SvdCatalog {
 public static final class Section {public final String tag;public final long offset,size;public final int count,stride;Section(String t,long o,long s,int n,int r){tag=t;offset=o;size=s;count=n;stride=r;}}
 public final List<Section> sections=new ArrayList<>();
 public final List<String> performances=new ArrayList<>(),patches=new ArrayList<>();
 private static long unsigned(int value){return value&0xffffffffL;}
 private static String readName(RandomAccessFile f,long offset)throws IOException{
  f.seek(offset);byte[] packed=new byte[11];f.readFully(packed);StringBuilder name=new StringBuilder();
  for(int i=0;i<12;i++){int value=0;for(int j=0;j<7;j++){int bit=i*7+j;value=(value<<1)|((packed[bit/8]>>(7-bit%8))&1);}if(value<32||value>126)throw new IOException("Nome SVD fora do formato validado");name.append((char)value);}
  return name.toString().trim();
 }
 public static SvdCatalog read(File file)throws IOException{
  try(RandomAccessFile f=new RandomAccessFile(file,"r")){
   if(f.length()<48||f.length()>120L*1024*1024)throw new IOException("Tamanho SVD inválido");
   f.seek(2);byte[] magic=new byte[4];f.readFully(magic);if(!Arrays.equals(magic,new byte[]{'S','V','D','1'}))throw new IOException("Não é um backup SVD1 validado");
   f.seek(24);long first=unsigned(f.readInt());if(first<32||first>4096||(first-16)%16!=0)throw new IOException("Diretório SVD inválido");
   SvdCatalog result=new SvdCatalog();Set<String> seen=new HashSet<>();long previousEnd=first;
   for(int at=16;at<first;at+=16){f.seek(at);byte[] tagBytes=new byte[8];f.readFully(tagBytes);String tag=new String(tagBytes,java.nio.charset.StandardCharsets.US_ASCII);long off=unsigned(f.readInt()),size=unsigned(f.readInt());
    if(!tag.endsWith("XPS0")||!seen.add(tag)||off<previousEnd||size<16||off+size>f.length())throw new IOException("Bloco SVD incompatível ou truncado");previousEnd=off+size;
    f.seek(off);long count=unsigned(f.readInt()),stride=unsigned(f.readInt()),header=unsigned(f.readInt());
    if(count<1||count>100000||stride<1||header!=16||16+count*stride!=size)throw new IOException("Estrutura de registros SVD inválida");
    result.sections.add(new Section(tag,off,size,(int)count,(int)stride));
    List<String> names=tag.equals("PRFbXPS0")?result.performances:tag.equals("PATaXPS0")?result.patches:null;
    if(names!=null){int limit=names==result.performances?128:256;if(count>limit||stride<11||stride>4096)throw new IOException("Catálogo SVD fora dos limites");for(int i=0;i<count;i++)names.add(readName(f,off+16+i*stride));}
   }
   if(previousEnd!=f.length())throw new IOException("Dados extras fora do diretório SVD");return result;
  }
 }
}
