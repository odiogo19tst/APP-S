package br.com.doapps.grauelive;

import android.content.Context;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Real, lossless merge of backup FILE COLLECTIONS, not proprietary SVD bytes.
 * Adds unique timbres and snapshots into one portable ZIP while keeping every
 * original byte intact and without changing the Roland USER banks.
 */
public final class ToneCollectionBundle {
    private static final int MAX_ITEMS=119;
    private static final long MAX_SIZE=240L*1024L*1024L;
    private ToneCollectionBundle(){}

    private static String extension(String filename){
        String name=filename==null?"":filename.toLowerCase(Locale.ROOT);
        for(String ext:new String[]{".xps",".jxe",".svd",".bin",".mid",".midi",".wav"})
            if(name.endsWith(ext))return ext;
        return "";
    }
    private static String hex(byte[] bytes){
        StringBuilder text=new StringBuilder();
        for(byte b:bytes)text.append(String.format(Locale.ROOT,"%02x",b&255));
        return text.toString();
    }
    private static long add(ZipOutputStream zip,File original,String entryName,
                            String sha,long limit) throws Exception{
        if(original==null||!original.isFile())
            throw new IOException("O original de "+entryName+" não foi encontrado");
        if(original.length()<=0||original.length()>120L*1024L*1024L
            ||original.length()>limit)
            throw new IOException("A coleção excedeu o limite ou contém arquivo inválido");
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        ZipEntry entry=new ZipEntry(entryName);
        entry.setTime(0L);
        zip.putNextEntry(entry);
        long count=0L;
        try(InputStream in=new FileInputStream(original)){
            byte[] buffer=new byte[16384];int n;
            while((n=in.read(buffer))!=-1){
                count+=n;
                if(count>limit)throw new IOException("Pacote incremental excedeu 240 MB");
                digest.update(buffer,0,n);
                zip.write(buffer,0,n);
            }
        }
        zip.closeEntry();
        if(!sha.equals(hex(digest.digest())))
            throw new IOException("Backup ou timbre alterado no armazenamento: SHA diferente");
        return count;
    }

    public static File create(Context context) throws Exception {
        if(context==null)throw new IOException("Contexto Android indisponível");
        ToneImportLibrary tones=new ToneImportLibrary(context);
        BackupArchive backups=new BackupArchive(context);
        JSONArray originals=tones.list(),backupList=backups.list(),items=new JSONArray();
        Set<String> already=new HashSet<>();
        File output=File.createTempFile("graue-colecao-", ".zip",context.getCacheDir());
        int totalFiles=0;long copied=0;
        try(ZipOutputStream zip=new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(output)))){
            zip.setLevel(6);
            // Backups first. Each SVD is a separate original, never joined by
            // concatenating binary sections or triggering a Roland RESTORE.
            for(int i=0;i<backupList.length();i++){
                JSONObject row=backupList.getJSONObject(i);
                String sha=row.optString("sha256");
                if(!sha.matches("[a-f0-9]{64}")||!already.add(sha))continue;
                String name=row.optString("name","backup.svd");
                if(++totalFiles>MAX_ITEMS)throw new IOException("Limite de 119 arquivos na coleção (mais manifest.json)");
                String ext=extension(name);
                if(ext.isEmpty())ext=".bin";
                String entryName="backups/"+sha+ext;
                copied+=add(zip,backups.fileFor(sha),entryName,sha,MAX_SIZE-copied);
                items.put(new JSONObject().put("origin","Roland backup original")
                    .put("name",name).put("sha256",sha).put("bytes",row.optLong("bytes"))
                    .put("entry",entryName).put("role","backup-protegido"));
            }
            // Include only known standalone sound files. Skip parent ZIPs:
            // their supported children are indexed separately on download.
            for(int i=0;i<originals.length();i++){
                JSONObject row=originals.getJSONObject(i);
                String sha=row.optString("sha256"),name=row.optString("name");
                String ext=extension(name);
                if(ext.isEmpty()||!sha.matches("[a-f0-9]{64}")||!already.add(sha))continue;
                if(++totalFiles>MAX_ITEMS)throw new IOException("Limite de 119 arquivos na coleção (mais manifest.json)");
                String entryName="timbres/"+sha+ext;
                copied+=add(zip,tones.file(sha),entryName,sha,MAX_SIZE-copied);
                items.put(new JSONObject().put("origin","Grauê tone library")
                    .put("name",name).put("sha256",sha).put("bytes",row.optLong("bytes"))
                    .put("entry",entryName).put("role",ext.equals(".xps")?"timbre-XPS":"original-preservado"));
            }
            if(totalFiles==0)throw new IOException("Nenhum timbre ou backup disponível para mesclar");
            JSONObject manifest=new JSONObject()
                .put("schema","graue-xps-collection-v1").put("instrument","Roland XPS-10")
                .put("createdAt",System.currentTimeMillis())
                .put("files",items).put("count",totalFiles)
                .put("shaAlgorithm","SHA-256")
                .put("note","União incremental de arquivos originais. NÃO é um SVD Roland restaurável.")
                .put("userMemoryModified",false).put("svdMerged",false);
            zip.putNextEntry(new ZipEntry("manifest.json"));
            zip.write(manifest.toString(2).getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }catch(Exception e){output.delete();throw e;}
        return output;
    }
}
