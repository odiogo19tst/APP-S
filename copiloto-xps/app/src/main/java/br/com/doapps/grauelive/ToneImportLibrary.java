package br.com.doapps.grauelive;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Immutable inbox for sound files downloaded from SynthXPS or selected by the user.
 * This is NOT the XPS-10 SVD backup folder and is NOT a MIDI/JXE decoder.
 * Never transmits, executes, extracts or modifies third-party files.
 */
public final class ToneImportLibrary {
    private static final long LIMIT = 120L * 1024L * 1024L;
    private static final int MAX_ENTRIES = 400;
    private final Context context;
    private final File dir, catalog;

    public ToneImportLibrary(Context context) {
        this.context = context.getApplicationContext();
        dir = new File(context.getFilesDir(), "synthxps-originals");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("Biblioteca de timbres indisponível");
        catalog = new File(dir, "catalog.json");
    }

    private static String safeName(String value) {
        String name = value == null ? "arquivo" : value.trim().replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (name.length() > 120) name = name.substring(name.length() - 120);
        return name.isEmpty() ? "arquivo" : name;
    }

    public String nameOf(Uri uri) {
        String value = "arquivo";
        try (Cursor c = context.getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int col = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (col >= 0) value = c.getString(col);
            }
        } catch (Exception ignored) {}
        return safeName(value);
    }

    static String classify(String name, byte[] header, int count) {
        final String ext = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (count >= 6 && header[2] == 'S' && header[3] == 'V' && header[4] == 'D' && header[5] == '1')
            return "SVD_XPS10_BACKUP_ORIGINAL";
        if (count >= 4 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F')
            return "WAV_POSSIBLE"; // Full WAV/PCM spec is not proven from RIFF alone.
        if (count >= 4 && header[0] == 'M' && header[1] == 'T' && header[2] == 'h' && header[3] == 'd')
            return "MIDI_SMF_UNVERIFIED";
        if (count >= 4 && header[0] == 'P' && header[1] == 'K' && (header[2] & 0xff) == 3 && (header[3] & 0xff) == 4)
            return "ZIP_UNVERIFIED";
        if (ext.endsWith(".jxe")) return "JXE_UNVERIFIED";
        if (ext.endsWith(".svd")) return "SVD_UNVERIFIED";
        if (ext.endsWith(".wav")) return "WAV_UNVERIFIED";
        return "UNKNOWN";
    }

    private static String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) result.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        return result.toString();
    }

    private JSONArray readCatalog() throws Exception {
        if (!catalog.isFile()) return new JSONArray();
        if (catalog.length() > 1024 * 1024) throw new IOException("Índice da biblioteca excedeu o limite");
        try (InputStream in = new FileInputStream(catalog)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192]; int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            return new JSONArray(out.toString("UTF-8"));
        }
    }

    private void persist(JSONArray items) throws Exception {
        File tmp = new File(dir, "catalog.tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(items.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            out.getFD().sync();
        }
        if (!tmp.renameTo(catalog)) {
            if (tmp.exists()) tmp.delete();
            throw new IOException("Não foi possível atualizar o índice");
        }
    }

    public synchronized JSONArray list() throws Exception { return readCatalog(); }

    public synchronized JSONObject importUri(Uri uri, String name, String source) throws Exception {
        if (uri == null) throw new IOException("Arquivo não selecionado");
        try (InputStream in = context.getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IOException("Arquivo indisponível");
            return importStream(in, name == null ? nameOf(uri) : name, source);
        }
    }

    public synchronized JSONObject importStream(InputStream input, String givenName, String source) throws Exception {
        if (input == null) throw new IOException("Arquivo não disponível");
        String name = safeName(givenName);
        JSONArray items = readCatalog();
        File temp = File.createTempFile("intake-", ".tmp", dir);
        long size = 0;
        byte[] header = new byte[16]; int first = 0;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new BufferedInputStream(input); OutputStream out = new FileOutputStream(temp)) {
            byte[] buffer = new byte[16384]; int n;
            while ((n = in.read(buffer)) != -1) {
                if (n == 0) continue;
                size += n;
                if (size > LIMIT) throw new IOException("Arquivo maior que 120 MB");
                if (first < header.length) {
                    int copy = Math.min(header.length - first, n);
                    System.arraycopy(buffer, 0, header, first, copy);
                    first += copy;
                }
                digest.update(buffer, 0, n);
                out.write(buffer, 0, n);
            }
        } catch (Exception e) {
            temp.delete();
            throw e;
        }
        if (size == 0) {
            temp.delete();
            throw new IOException("Arquivo vazio");
        }
        String sha = hex(digest.digest());
        for (int i = 0; i < items.length(); i++) {
            JSONObject row = items.getJSONObject(i);
            if (sha.equals(row.optString("sha256"))) {
                temp.delete();
                return row; // Deduplicate by content; never overwrite the original file.
            }
        }
        if (items.length() >= MAX_ENTRIES) {
            temp.delete();
            throw new IOException("Biblioteca cheia. Exporte e limpe arquivos antigos antes de importar.");
        }
        String format = classify(name, header, first);
        File target = new File(dir, sha + ".original");
        if (!temp.renameTo(target)) {
            temp.delete();
            throw new IOException("Não foi possível armazenar a cópia original");
        }
        JSONObject row = new JSONObject();
        row.put("sha256", sha).put("name", name).put("bytes", size)
           .put("format", format).put("source", source == null ? "Arquivo local" : source)
           .put("importedAt", System.currentTimeMillis())
           .put("verifiedForKeyboard", false).put("convertedToPerformance", false)
           .put("writtenToKeyboard", false).put("isRolandSvdBackup", false);
        items.put(row);
        try { persist(items); }
        catch (Exception e) { target.delete(); throw e; }
        return row;
    }

    public synchronized File file(String sha) throws Exception {
        if (sha == null || !sha.matches("[a-f0-9]{64}")) throw new IOException("Identificador de arquivo inválido");
        JSONArray items = readCatalog();
        boolean found = false;
        for (int i = 0; i < items.length(); i++) if (sha.equals(items.getJSONObject(i).optString("sha256"))) found = true;
        if (!found) throw new IOException("Arquivo não pertence à biblioteca");
        File source = new File(dir, sha + ".original");
        if (!source.isFile()) throw new IOException("Cópia original não localizada");
        return source;
    }

    public synchronized String originalName(String sha) throws Exception {
        JSONArray items = readCatalog();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            if (sha != null && sha.equals(item.optString("sha256"))) return item.optString("name", "arquivo");
        }
        throw new IOException("Arquivo não localizado");
    }

    public synchronized boolean remove(String sha) throws Exception {
        if (sha == null || !sha.matches("[a-f0-9]{64}")) throw new IOException("Identificador inválido");
        JSONArray input = readCatalog(), remaining = new JSONArray();
        boolean removed = false;
        for (int i = 0; i < input.length(); i++) {
            JSONObject item = input.getJSONObject(i);
            if (sha.equals(item.optString("sha256"))) removed = true;
            else remaining.put(item);
        }
        if (!removed) return false;
        persist(remaining);
        new File(dir, sha + ".original").delete();
        return true;
    }
}
