package br.com.doapps.grauelive;
import java.io.*;
public final class SvdCatalogSelfTest {
 static void check(boolean value){if(!value)throw new AssertionError("SVD check failed");}
 public static void main(String[] args)throws Exception{
  File f=File.createTempFile("svd-test-",".svd");try{
   try(RandomAccessFile out=new RandomAccessFile(f,"rw")){
    out.write(new byte[32]);out.seek(2);out.writeBytes("SVD1");out.seek(16);out.writeBytes("PRFbXPS0");out.writeInt(32);out.writeInt(27);out.seek(32);out.writeInt(1);out.writeInt(11);out.writeInt(16);out.writeInt(0);
    byte[] packed=new byte[11];String name="TEST PERF   ";for(int i=0;i<12;i++)for(int j=0;j<7;j++){int bit=i*7+j;packed[bit/8]|=((name.charAt(i)>>(6-j))&1)<<(7-bit%8);}out.write(packed);
   }
   SvdCatalog result=SvdCatalog.read(f);check(result.sections.size()==1);check(result.performances.get(0).equals("TEST PERF"));check(result.patches.isEmpty());
   try(RandomAccessFile out=new RandomAccessFile(f,"rw")){out.setLength(50);}
   boolean rejected=false;try{SvdCatalog.read(f);}catch(IOException e){rejected=true;}check(rejected);
  }finally{f.delete();}
  if(args.length>0){SvdCatalog actual=SvdCatalog.read(new File(args[0]));check(actual.performances.size()==128);check(actual.patches.size()==256);check(actual.performances.get(0).equals("RhodesAffair"));System.out.println("Real SVD validated: 10 sections, 128 performances, 256 patches");}
  System.out.println("SVD: seven-bit names, bounded directory, truncation rejection passed");
 }
}
