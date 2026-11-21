package br.com.doapps.grauelive;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

    public static void track(Context context, long id, String originalName) {
        if (id <= 0) throw new IllegalArgumentException("Download inválido");
        context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString("pending-" + id, originalName).apply();
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
        DownloadManager manager = (DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return;
        try (Cursor c = manager.query(new DownloadManager.Query().setFilterById(id))) {
            if (c == null || !c.moveToFirst()) return;
            int col = c.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int status = col < 0 ? 0 : c.getInt(col);
            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                try (ParcelFileDescriptor fd = manager.openDownloadedFile(id);
                     InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(fd)) {
                    ToneImportLibrary lib = new ToneImportLibrary(context);
                    lib.importStream(in, name, "SynthXPS · download Android");
                    prefs.edit().remove(key).putString("last-status",
                            "Arquivo da loja copiado para a biblioteca do Grauê. Nenhum MIDI enviado.").apply();
                }
            } else if (status == DownloadManager.STATUS_FAILED) {
                prefs.edit().remove(key).putString("last-status",
                        "Falha no download SynthXPS. Abra Downloads e tente novamente.").apply();
            }
        } catch (Exception e) {
            // Keep the pending ID so a subsequent startup can retry copying the original.
            prefs.edit().putString("last-status",
                    "Download concluído, mas a cópia ainda não entrou no Grauê: " + e.getMessage()).apply();
        }
    }

    public static String lastStatus(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("last-status", "Baixe um arquivo na loja; ele será copiado para a biblioteca local.");
    }
}
