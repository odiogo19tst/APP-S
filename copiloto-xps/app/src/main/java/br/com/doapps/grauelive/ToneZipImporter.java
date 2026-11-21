package br.com.doapps.grauelive;

import android.content.Context;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.json.JSONObject;

/**
 * Non-destructive incremental import of SynthXPS ZIP collections.
 *
 * Extracts only known sound/backup files into the immutable SHA-256 library,
 * NOT into Roland USER memory. SVD backups are archived separately as originals.
 * It does not merge proprietary SVD bytes nor restore any instrument state.
 */
public final class ToneZipImporter {
    private static final int MAX_ENTRIES=120;
    private static final long MAX_UNPACKED=240L*1024L*1024L;
    private static final Set<String> ALLOWED = new HashSet<>();
    static {
        for(String extension:new String[]{".xps",".jxe",".svd",".bin",".mid",".midi",".wav"})
            ALLOWED.add(extension);
    }
    private ToneZipImporter(){}

    public static JSONObject importArchive(Context context,File zipFile,String origin) throws Exception {
        if(context==null||zipFile==null||!zipFile.isFile())
            throw new IOException("Pacote ZIP indisponível");
        ToneImportLibrary library=new ToneImportLibrary(context);
        BackupArchive backups=new BackupArchive(context);
        int checked=0,imported=0,duplicates=0,xps=0,svd=0,skipped=0;
        final long[] cumulative={0L};
        try(ZipInputStream zip=new ZipInputStream(new BufferedInputStream(new FileInputStream(zipFile)))){
            ZipEntry entry;
            while((entry=zip.getNextEntry())!=null){
                if(++checked>MAX_ENTRIES)throw new IOException("Arquivo ZIP excedeu o máximo de 120 entradas");
                if(entry.isDirectory()){zip.closeEntry();continue;}
                String full=entry.getName()==null?"":entry.getName().replace('\\','/');
                String name=full.substring(full.lastIndexOf('/')+1);
                if(name.isEmpty()||name.startsWith(".")||name.length()>120){
                    skipped++;zip.closeEntry();continue;
                }
                String lower=name.toLowerCase(Locale.ROOT);
                boolean allowed=false;
                for(String ext:ALLOWED)if(lower.endsWith(ext)){allowed=true;break;}
                if(!allowed){skipped++;zip.closeEntry();continue;}
                long declared=entry.getSize();
                if(declared>120L*1024L*1024L){
                    throw new IOException("Item ZIP maior que 120 MB: "+name);
                }
                final long[] perEntry={0L};
                // ToneImportLibrary takes ownership and closes its input. This
                // wrapper intentionally leaves ZipInputStream open for nextEntry.
                try(InputStream bounded=new FilterInputStream(zip){
                    @Override public int read(byte[] b,int off,int len)throws IOException{
                        int n=super.read(b,off,len);
                        if(n>0){perEntry[0]+=n;cumulative[0]+=n;
                            if(perEntry[0]>120L*1024L*1024L||cumulative[0]>MAX_UNPACKED)
                                throw new IOException("Limite descompactado de ZIP excedido");
                        }
                        return n;
                    }
                    @Override public int read()throws IOException{
                        int n=super.read();
                        if(n!=-1){perEntry[0]++;cumulative[0]++;
                            if(perEntry[0]>120L*1024L*1024L||cumulative[0]>MAX_UNPACKED)
                                throw new IOException("Limite ZIP excedido");
                        }
                        return n;
                    }
                    @Override public void close(){} // outer ZIP owns the stream
                }){
                    JSONObject copy=library.importStream(bounded,name,
                        "Pacote SynthXPS · "+(origin==null?"ZIP":origin));
                    if("SVD_XPS10_BACKUP_ORIGINAL".equals(copy.optString("format"))){
                        backups.importOriginal(library.file(copy.getString("sha256")),name);
                        svd++;
                    }
                    if(lower.endsWith(".xps"))xps++;
                    imported++;
                }catch(IOException e){
                    // Limit errors must abort instead of trying to continue an
                    // untrusted partially-expanded archive.
                    throw e;
                }
                zip.closeEntry();
            }
        }
        return new JSONObject().put("entries",checked).put("filesImported",imported)
            .put("xps",xps).put("svd",svd).put("skipped",skipped)
            .put("deduplication","SHA-256 immutable library")
            .put("bytesUnpacked",cumulative[0])
            .put("rolandRestore",false).put("userWrite",false)
            .put("svdMergeExecuted",false);
    }
}
