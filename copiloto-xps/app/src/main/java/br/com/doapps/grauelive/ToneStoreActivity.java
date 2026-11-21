package br.com.doapps.grauelive;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.text.TextUtils;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Locale;

/**
 * Isolated SynthXPS WebView with a permanent Grauê navigation dock.
 * ACTION_CREATE_DOCUMENT lets the user select the exact folder and filename BEFORE downloading.
 * DownloadManager fetches the file; ToneDownloadReceiver imports an original to the app library
 * and copies the downloaded bytes to the user-selected document. Never writes to XPS-10 MIDI.
 */
public final class ToneStoreActivity extends Activity {
    public static final String STORE_URL = "https://www.synthxps.com.br/?modelo=xps10";
    public static final String EXTRA_RETURN_TO = "graue_store_return_to";
    public static final String EXTRA_IMPORTED_XPS_SHA = "graue_imported_xps_sha";
    private long awaitingAutomaticId = -1;
    private final android.os.Handler autoHandler=new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable autoPoll=new Runnable(){
        public void run(){
            if(awaitingAutomaticId<0||isFinishing())return;
            long id=awaitingAutomaticId;
            android.content.SharedPreferences prefs=getSharedPreferences(ToneDownloadReceiver.PREFS,MODE_PRIVATE);
            if(prefs.getLong("last-import-id",-1)==id){
                awaitingAutomaticId=-1;
                String sha=prefs.getString("last-import-sha","");
                String name=prefs.getString("last-import-name","");
                String format=prefs.getString("last-import-format","");
                if(sha.matches("[a-f0-9]{64}")&&name.toLowerCase(Locale.ROOT).endsWith(".xps")
                    &&"XPS_JSON_UNVERIFIED".equals(format)){
                    setResult(RESULT_OK,new Intent().putExtra(EXTRA_RETURN_TO,"store")
                        .putExtra(EXTRA_IMPORTED_XPS_SHA,sha));
                    finish();return;
                }
                note("Arquivo "+name+" guardado na biblioteca. O original foi preservado.");
                return;
            }
            if(!prefs.contains("pending-" + id)){
                awaitingAutomaticId=-1;
                note(prefs.getString("last-status","Download encerrado."));
                return;
            }
            autoHandler.postDelayed(this,650);
        }
    };
    private static final int REQUEST_SAVE_TONE = 3109;
    private static final String STATE_URL = "tone_pending_url";
    private WebView browser;
    private TextView status;
    private TextView destinationStatus;
    private PendingDownload pendingDownload;
    private boolean loadFailed = false;
    private final int ink = Color.rgb(230, 246, 244);
    private final int bg = Color.rgb(8, 18, 28);
    private final int panel = Color.rgb(23, 39, 50);
    private final int mint = Color.rgb(117, 235, 191);

    private static final class PendingDownload {
        final String url, userAgent, name, mime;
        PendingDownload(String url, String userAgent, String name, String mime) {
            this.url = url; this.userAgent = userAgent; this.name = name;
            this.mime = mime;
        }
    }

    static boolean isStorePage(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return host != null && ("synthxps.com.br".equalsIgnoreCase(host)
                || "www.synthxps.com.br".equalsIgnoreCase(host));
    }

    static boolean isHttps(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme()) && !TextUtils.isEmpty(uri.getHost());
    }

    static String safeFilename(String value) {
        String name = value == null ? "timbre" : value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (name.length() > 100) name = name.substring(name.length() - 100);
        return name.isEmpty() ? "timbre" : name;
    }

    /** The SAF provider owns the real file path. Never invent a device filesystem path. */
    static String describeDocument(Context context, Uri uri, String filename) {
        String name = safeFilename(filename);
        if (uri == null) return "Pasta não selecionada";
        try {
            if (DocumentsContract.isDocumentUri(context, uri)) {
                String docId = DocumentsContract.getDocumentId(uri);
                String authority = uri.getAuthority();
                if ("com.android.externalstorage.documents".equals(authority) && docId.contains(":")) {
                    String relative = docId.substring(docId.indexOf(':') + 1);
                    if (!relative.isEmpty())
                        return (docId.startsWith("primary:") ? "Armazenamento interno/" : "Armazenamento selecionado/")
                                + relative;
                }
                if ("com.android.providers.downloads.documents".equals(authority))
                    return "Downloads · " + name;
            }
        } catch (Exception ignored) {}
        return "Local escolhido no Android · " + name;
    }

    private int dp(int size) {
        return Math.round(size * getResources().getDisplayMetrics().density);
    }

    private Button button(String label, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setAllCaps(false);
        button.setTextColor(primary ? bg : ink);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(primary ? mint : panel));
        button.setMinHeight(dp(48));
        button.setContentDescription(label);
        return button;
    }

    private void note(String message) {
        if (status != null) status.setText(message);
    }

    private void finishTo(String route) {
        setResult(RESULT_OK, new Intent().putExtra(EXTRA_RETURN_TO, route));
        finish();
    }

    private void openExternal(Uri uri) {
        if (!isHttps(uri)) {
            Toast.makeText(this, "Endereço externo inválido. Use HTTPS.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (Exception e) {
            note("Nenhum navegador disponível para abrir esse link.");
        }
    }

    private void downloads() {
        try {
            startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
        } catch (Exception e) {
            note("Abra o aplicativo Meus Arquivos ou Downloads do Android.");
        }
    }

    private void goBackInStore() {
        if (browser != null && browser.canGoBack()) {
            browser.goBack();
        } else {
            note("Você já está na primeira página da loja. Toque em Início para voltar ao Grauê.");
        }
    }

    /** Android system Back returns to Grauê, never trapping the musician in WebView history. */
    @Override public void onBackPressed() { finishTo("home"); }

    /** Download straight into the protected library; export is optional later. */
    private void enqueueAutomatically(String url,String userAgent,String filename,String mime){
        try{
            Uri link=Uri.parse(url);
            if(!isHttps(link))throw new IllegalArgumentException("Endereço inseguro");
            DownloadManager.Request download=new DownloadManager.Request(link);
            download.setTitle(filename);
            download.setDescription("Importação automática para a biblioteca Grauê");
            download.setMimeType(mime);
            download.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if(userAgent!=null&&!userAgent.isEmpty())download.addRequestHeader("User-Agent",userAgent);
            String cookies=CookieManager.getInstance().getCookie(url);
            if(cookies!=null&&!cookies.isEmpty())download.addRequestHeader("Cookie",cookies);
            DownloadManager manager=(DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE);
            if(manager==null)throw new IllegalStateException("Gerenciador de downloads indisponível");
            long id=manager.enqueue(download);
            ToneDownloadReceiver.trackAutomatic(this,id,filename);
            awaitingAutomaticId=id;
            autoHandler.removeCallbacks(autoPoll);
            autoHandler.postDelayed(autoPoll,500);
            destinationStatus.setText("Destino automático: Biblioteca Grauê");
            note("Baixando "+filename+"; a biblioteca recebe uma cópia. Nenhum comando MIDI é enviado.");
        }catch(Exception e){note("Não foi possível importar automaticamente: "+e.getMessage());}
    }

    private void chooseLocationBeforeDownload(String url, String userAgent,
                                              String contentDisposition, String mimeType) {
        Uri uri;
        try { uri = Uri.parse(url); } catch (Exception e) { uri = null; }
        if (!isHttps(uri)) {
            note("Download disponível somente por HTTPS. Tente abrir o arquivo no navegador.");
            return;
        }
        if (pendingDownload != null) {
            note("Já existe uma escolha de local aberta. Conclua ou cancele antes de baixar outro arquivo.");
            return;
        }
        String name = safeFilename(URLUtil.guessFileName(url, contentDisposition, mimeType));
        String mime = mimeType == null || mimeType.trim().isEmpty() ? "application/octet-stream" : mimeType;
        // Sounds and backups are downloaded directly into the immutable app
        // inbox. Backups are never restored when downloaded.
        String lower=name.toLowerCase(Locale.ROOT);
        if(lower.endsWith(".xps")||lower.endsWith(".jxe")||lower.endsWith(".svd")
            ||lower.endsWith(".zip")||lower.endsWith(".bin")||lower.endsWith(".wav")
            ||lower.endsWith(".mid")||lower.endsWith(".midi")){
            enqueueAutomatically(url,userAgent,name,mime);
            return;
        }
        pendingDownload = new PendingDownload(url, userAgent, name, mime);
        // The Android file picker displays locations and allows the user to rename the file.
        Intent destination = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        destination.addCategory(Intent.CATEGORY_OPENABLE);
        destination.setType(mime);
        destination.putExtra(Intent.EXTRA_TITLE, name);
        destination.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            note("Escolha a pasta e confirme o nome do arquivo antes de começar o download.");
            startActivityForResult(destination, REQUEST_SAVE_TONE);
        } catch (Exception e) {
            pendingDownload = null;
            note("Não foi possível abrir o seletor de pasta do Android. " + e.getMessage());
        }
    }

    private void enqueueAtChosenLocation(PendingDownload request, Uri destination, int grantedFlags) {
        if (request == null || destination == null || !"content".equalsIgnoreCase(destination.getScheme())) {
            note("Nenhum destino válido selecionado. Download cancelado.");
            return;
        }
        try {
            // Required for the receiver to copy the file after the Activity/process is stopped.
            try {
                int grants = grantedFlags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                if ((grants & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0)
                    throw new SecurityException("Destino sem permissão de gravação");
                getContentResolver().takePersistableUriPermission(destination, grants);
            } catch (SecurityException e) {
                note("O provedor de arquivos não permite acesso persistente a essa pasta. Escolha outra localização.");
                return;
            }
            String chosenName = new ToneImportLibrary(this).nameOf(destination);
            if ("arquivo".equals(chosenName)) chosenName = request.name;
            String label = describeDocument(this, destination, chosenName);
            DownloadManager.Request download = new DownloadManager.Request(Uri.parse(request.url));
            download.setTitle(chosenName);
            download.setDescription("Destino escolhido: " + label + " · Cópia no Grauê");
            download.setMimeType(request.mime);
            download.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (request.userAgent != null && !request.userAgent.isEmpty())
                download.addRequestHeader("User-Agent", request.userAgent);
            String cookies = CookieManager.getInstance().getCookie(request.url);
            if (cookies != null && !cookies.isEmpty())
                download.addRequestHeader("Cookie", cookies);
            DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("Gerenciador de downloads indisponível");
            long id = manager.enqueue(download);
            ToneDownloadReceiver.track(this, id, chosenName, destination, label);
            destinationStatus.setText("Destino selecionado: " + label);
            note("Download iniciado para o destino escolhido. Depois, uma cópia entrará na biblioteca do Grauê.");
        } catch (Exception e) {
            note("Não foi possível iniciar o download: " + e.getMessage());
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_SAVE_TONE) return;
        PendingDownload candidate = pendingDownload;
        pendingDownload = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            note("Download cancelado. Nenhum arquivo foi baixado.");
            return;
        }
        enqueueAtChosenLocation(candidate, data.getData(), data.getFlags());
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (pendingDownload != null) {
            out.putString(STATE_URL, pendingDownload.url);
            out.putString("tone_pending_agent", pendingDownload.userAgent);
            out.putString("tone_pending_name", pendingDownload.name);
            out.putString("tone_pending_mime", pendingDownload.mime);
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null && state.containsKey(STATE_URL))
            pendingDownload = new PendingDownload(state.getString(STATE_URL),
                    state.getString("tone_pending_agent"), state.getString("tone_pending_name"),
                    state.getString("tone_pending_mime"));
        if (Build.VERSION.SDK_INT >= 33)
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> finishTo("home"));
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(bg);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });

        TextView title = new TextView(this);
        title.setText("Loja de Timbres · XPS-10");
        title.setTextColor(mint);
        title.setTextSize(19);
        title.setPadding(16, 16, 16, 8);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title);

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        Button refresh = button("↻ Atualizar", false);
        Button external = button("Abrir no navegador", false);
        toolbar.addView(refresh, new LinearLayout.LayoutParams(0, dp(52), 1));
        toolbar.addView(external, new LinearLayout.LayoutParams(0, dp(52), 1));
        root.addView(toolbar);

        destinationStatus = new TextView(this);
        destinationStatus.setTextColor(mint);
        destinationStatus.setTextSize(12);
        destinationStatus.setPadding(14, 8, 14, 8);
        destinationStatus.setText("Timbres XPS/JXE e backups SVD: download automático para o Grauê.");
        root.addView(destinationStatus);

        status = new TextView(this);
        status.setTextColor(ink);
        status.setTextSize(12);
        status.setPadding(14, 7, 14, 10);
        status.setText("Toque no arquivo XPS na loja. O Grauê baixa e guarda na biblioteca sem escolher pasta.");
        root.addView(status);

        browser = new WebView(this);
        browser.setBackgroundColor(bg);
        root.addView(browser, new LinearLayout.LayoutParams(-1, 0, 1));

        // Persistent dock, matching the main Grauê application's navigation pattern.
        LinearLayout dock = new LinearLayout(this);
        dock.setOrientation(LinearLayout.HORIZONTAL);
        dock.setBackgroundColor(panel);
        Button home = button("⌂ Início", true);
        Button previous = button("‹ Voltar página", false);
        Button library = button("♫ Biblioteca", false);
        Button folder = button("▣ Downloads", false);
        for (Button action : new Button[]{home, previous, library, folder})
            dock.addView(action, new LinearLayout.LayoutParams(0, dp(58), 1));
        root.addView(dock);
        setContentView(root);

        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSafeBrowsingEnabled(true);
        browser.setWebChromeClient(new WebChromeClient());
        browser.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                loadFailed = false;
                note("Carregando o catálogo SynthXPS…");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isStorePage(request.getUrl())) return false;
                openExternal(request.getUrl());
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!loadFailed) note("Loja pronta. O botão de download permite escolher a pasta antes de baixar.");
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    loadFailed = true;
                    note("Não foi possível carregar a loja. Verifique a internet ou use Abrir no navegador.");
                }
            }
        });
        browser.setDownloadListener((url, agent, disposition, mime, size) ->
                chooseLocationBeforeDownload(url, agent, disposition, mime));

        home.setOnClickListener(v -> finishTo("home"));
        previous.setOnClickListener(v -> goBackInStore());
        library.setOnClickListener(v -> finishTo("store"));
        folder.setOnClickListener(v -> downloads());
        refresh.setOnClickListener(v -> {
            note("Atualizando os timbres disponíveis…");
            browser.reload();
        });
        external.setOnClickListener(v -> openExternal(Uri.parse(STORE_URL)));
        browser.loadUrl(STORE_URL);
    }

    @Override protected void onPause() {
        autoHandler.removeCallbacks(autoPoll);
        if (browser != null) browser.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if(awaitingAutomaticId>=0){autoHandler.removeCallbacks(autoPoll);autoHandler.post(autoPoll);}
        if (browser != null) browser.onResume();
        new Thread(() -> {
            ToneDownloadReceiver.reconcile(getApplicationContext());
            String latest = ToneDownloadReceiver.lastStatus(getApplicationContext());
            String location = ToneDownloadReceiver.lastLocation(getApplicationContext());
            runOnUiThread(() -> {
                if (browser == null) return;
                if (location != null && !location.isEmpty())
                    destinationStatus.setText("Último destino: " + location);
                if (pendingDownload == null && latest != null && !latest.isEmpty()) note(latest);
            });
        }, "graue-store-reconcile").start();
    }

    @Override protected void onDestroy() {
        autoHandler.removeCallbacks(autoPoll);
        if (browser != null) {
            browser.stopLoading();
            browser.setWebChromeClient(null);
            browser.setWebViewClient(null);
            browser.destroy();
            browser = null;
        }
        super.onDestroy();
    }
}
