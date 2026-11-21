package br.com.doapps.grauelive;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import android.database.Cursor;
import android.os.ParcelFileDescriptor;
import java.io.InputStream;
import java.util.Map;

/**
 * Takes ownership only of download IDs initiated by the isolated SynthXPS WebView.
 * A successful Android download is copied to ToneImportLibrary without any MIDI write.
 */
public final class ToneDownloadReceiver extends BroadcastReceiver {
    static final String PREFS = "graue-synthxps-downloads";

    public static void track(Context context, long id, String originalName, Uri destination, String location) {
        if (id <= 0 || destination == null || !"content".equalsIgnoreCase(destination.getScheme()))
            throw new IllegalArgumentException("Download sem destino válido");
        boolean saved = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString("pending-" + id, originalName)
            .putString("destination-" + id, destination.toString())
            .putString("location-" + id, location)
            .putString("last-location", location)
            .putString("last-status", "Aguardando download: " + location)
            .commit(); // Persist before DownloadManager can announce completion.
        if (!saved) throw new IllegalStateException("Não foi possível registrar o local escolhido");
    }

    /**
     * One-touch portal import. The Android DownloadManager owns the download;
     * the immutable app library receives the bytes on completion. No user
     * filename dialog, no restore operation, no MIDI transmission.
     */
    public static void trackAutomatic(Context context, long id, String originalName) {
        if (id <= 0 || originalName == null || originalName.trim().isEmpty())
            throw new IllegalArgumentException("Download automático inválido");
        boolean saved=context.getApplicationContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE)
            .edit().putString("pending-" + id,originalName)
            .putString("destination-" + id,"")
            .putString("location-" + id,"Biblioteca Grauê")
            .putString("last-location","Biblioteca Grauê")
            .putString("last-status","Baixando " + originalName + " para a biblioteca...")
            .commit();
        if (!saved) throw new IllegalStateException("Não foi possível registrar o download");
    }

    public static int pendingCount(Context context) {
        Map<String, ?> all = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getAll();
        int n = 0;
        for (String key : all.keySet()) if (key.startsWith("pending-")) n++;
        return n;
    }

    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        final long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
        if (id <= 0) return;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.contains("pending-" + id)) return;
        PendingResult pending = goAsync();
        new Thread(() -> {
            try { reconcileId(context.getApplicationContext(), id); }
            finally { pending.finish(); }
        }, "graue-tone-download").start();
    }

    /** Call during app startup too, for completion while process was stopped. */
    public static void reconcile(Context context) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int n = 0;
        for (String key : prefs.getAll().keySet()) {
            if (!key.startsWith("pending-") || ++n > 80) continue;
            try { reconcileId(context.getApplicationContext(), Long.parseLong(key.substring("pending-".length()))); }
            catch (NumberFormatException ignored) {}
        }
    }

    static void reconcileId(Context context, long id) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String key = "pending-" + id, name = prefs.getString(key, null);
        if (name == null) return;
        String destinationKey = "destination-" + id;
        String locationKey = "location-" + id;
        String chosenUri = prefs.getString(destinationKey, "");
        String chosenLocation = prefs.getString(locationKey, "Local selecionado");
        DownloadManager manager = (DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return;
        try (Cursor c = manager.query(new DownloadManager.Query().setFilterById(id))) {
            if (c == null || !c.moveToFirst()) return;
            int col = c.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int status = col < 0 ? 0 : c.getInt(col);
            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                ToneImportLibrary lib = new ToneImportLibrary(context);
                org.json.JSONObject imported;
                try (ParcelFileDescriptor fd = manager.openDownloadedFile(id);
                     InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(fd)) {
                    imported = lib.importStream(in, name, "SynthXPS · download Android");
                }
                // Valid Roland backup copies are also indexed in the dedicated vault,
                // preserving the complete binary. This is NOT a binary SVD merge.
                if ("SVD_XPS10_BACKUP_ORIGINAL".equals(imported.optString("format"))) {
                    new BackupArchive(context).importOriginal(
                        lib.file(imported.getString("sha256")), name);
                }
                // The chosen document was created by ACTION_CREATE_DOCUMENT before download.
                // Copy the exact validated original there, never to Roland USER or SVD.
                if (!chosenUri.isEmpty()) {
                    Uri target = Uri.parse(chosenUri);
                    if (!"content".equalsIgnoreCase(target.getScheme()))
                        throw new IllegalStateException("O destino não é um documento Android válido");
                    File original = lib.file(imported.getString("sha256"));
                    try (InputStream source = new FileInputStream(original);
                         OutputStream output = context.getContentResolver().openOutputStream(target, "wt")) {
                        if (output == null) throw new IllegalStateException("Pasta de destino inacessível");
                        byte[] buf = new byte[16384]; int n;
                        while ((n = source.read(buf)) != -1) output.write(buf, 0, n);
                        output.flush();
                    }
                }
                prefs.edit().remove(key).remove(destinationKey).remove(locationKey)
                    .putString("last-location", chosenLocation)
                    .putString("last-status",
                        "Download salvo em " + chosenLocation + " e importado na biblioteca do Grauê. Nenhum MIDI enviado.")
                    .apply();
            } else if (status == DownloadManager.STATUS_FAILED) {
                // ACTION_CREATE_DOCUMENT creates a placeholder file; remove it on failed download.
                if (!chosenUri.isEmpty()) {
                    try { context.getContentResolver().delete(Uri.parse(chosenUri), null, null); }
                    catch (Exception ignored) {}
                }
                prefs.edit().remove(key).remove(destinationKey).remove(locationKey)
                    .putString("last-status", "Falha no download SynthXPS. Nenhum arquivo completo foi salvo.")
                    .apply();
            }
        } catch (Exception e) {
            // Keep the pending ID so a subsequent startup can retry copying the original.
            prefs.edit().putString("last-status",
                    "Download concluído, mas a cópia ainda não entrou no Grauê: " + e.getMessage()).apply();
        }
    }

    public static String lastLocation(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("last-location", "");
    }

    public static String lastStatus(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("last-status", "Baixe um arquivo na loja; ele será copiado para a biblioteca local.");
    }
}
