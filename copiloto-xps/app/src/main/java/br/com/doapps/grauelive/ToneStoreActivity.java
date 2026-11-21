package br.com.doapps.grauelive;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
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
 * Live XPS-10 catalog shown in a separate, isolated WebView.
 * No Native / USB-MIDI JavaScript bridge is attached to untrusted web pages.
 * Downloading a file never writes to the Roland or changes Grauê favorites.
 */
public final class ToneStoreActivity extends Activity {
    public static final String STORE_URL = "https://www.synthxps.com.br/?modelo=xps10";
    private WebView browser;
    private TextView status;
    private boolean loadFailed = false;
    private final int ink = Color.rgb(230, 246, 244);
    private final int bg = Color.rgb(8, 18, 28);
    private final int panel = Color.rgb(23, 39, 50);
    private final int mint = Color.rgb(117, 235, 191);

    static boolean isStorePage(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return host != null && ("synthxps.com.br".equalsIgnoreCase(host)
                || "www.synthxps.com.br".equalsIgnoreCase(host));
    }

    static boolean isHttps(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme()) && !TextUtils.isEmpty(uri.getHost());
    }

    private Button button(String text, boolean primary) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(12);
        button.setAllCaps(false);
        button.setTextColor(primary ? bg : ink);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(primary ? mint : panel));
        button.setMinHeight(48);
        return button;
    }

    private void note(String message) {
        if (status != null) status.setText(message);
    }

    private void openExternal(Uri uri) {
        if (!isHttps(uri)) {
            Toast.makeText(this, "Link externo não suportado. Use a loja pelo navegador.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (Exception e) {
            Toast.makeText(this, "Nenhum navegador disponível para abrir este link.", Toast.LENGTH_LONG).show();
        }
    }

    private void downloads() {
        try {
            startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
        } catch (Exception e) {
            Toast.makeText(this, "Abra o gerenciador Downloads do Android.", Toast.LENGTH_LONG).show();
        }
    }

    private void download(String url, String userAgent, String contentDisposition, String mimeType) {
        Uri uri;
        try { uri = Uri.parse(url); } catch (Exception e) { uri = null; }
        if (!isHttps(uri)) {
            note("Este arquivo não usa HTTPS. Abra a loja no navegador para baixar.");
            return;
        }
        try {
            // The website may use a separate HTTPS host for downloadable files.
            // Only the user's explicit in-page download event can reach this callback.
            String candidate = URLUtil.guessFileName(url, contentDisposition, mimeType);
            candidate = candidate == null ? "arquivo" : candidate
                    .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_")
                    .trim();
            if (candidate.length() > 100) candidate = candidate.substring(candidate.length() - 100);
            if (candidate.isEmpty()) candidate = "arquivo";
            String name = "Grauê-XPS10-" + System.currentTimeMillis() + "-" + candidate;
            DownloadManager.Request req = new DownloadManager.Request(uri);
            req.setTitle(name);
            req.setDescription("Arquivo do portal SynthXPS; não instalado no Roland.");
            if (mimeType != null && !mimeType.isEmpty()) req.setMimeType(mimeType);
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (userAgent != null && !userAgent.isEmpty()) req.addRequestHeader("User-Agent", userAgent);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null && !cookies.isEmpty()) req.addRequestHeader("Cookie", cookies);
            // The Android DownloadManager owns the file in shared Downloads.
            // No automatic Roland USER write or third-party code execution.
            DownloadManager manager = (DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("Downloads não disponível");
            long id = manager.enqueue(req);
            ToneDownloadReceiver.track(this, id, candidate);
            note("Download iniciado. Ao terminar, o original também será copiado para a biblioteca de timbres do Grauê.");
        } catch (Exception e) {
            note("O download não pôde ser iniciado. Abra o arquivo no navegador.");
            Toast.makeText(this, "Download não iniciado: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(bg);
        // Android 15+ can draw edge-to-edge: keep shop controls above system bars.
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
        Button back = button("‹ Voltar", false);
        Button refresh = button("Atualizar", false);
        Button chrome = button("Navegador", false);
        Button folder = button("Downloads", true);
        for (Button b : new Button[]{back, refresh, chrome, folder}) {
            toolbar.addView(b, new LinearLayout.LayoutParams(0, 50, 1));
        }
        root.addView(toolbar);

        status = new TextView(this);
        status.setTextColor(ink);
        status.setTextSize(12);
        status.setPadding(16, 10, 16, 10);
        status.setText("Catálogo online SynthXPS. Downloads não são instalados automaticamente no teclado.");
        root.addView(status);
        browser = new WebView(this);
        browser.setBackgroundColor(bg);
        root.addView(browser, new LinearLayout.LayoutParams(-1, 0, 1));
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
                if (!loadFailed) note("Catálogo online. Para arquivos baixados, consulte Downloads. Não envia timbres por MIDI.");
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    loadFailed = true;
                    note("Não foi possível carregar o portal. Verifique a internet ou toque em Navegador.");
                }
            }
        });
        browser.setDownloadListener((url, userAgent, contentDisposition, mimeType, size) ->
                download(url, userAgent, contentDisposition, mimeType));
        back.setOnClickListener(v -> onBackPressed());
        refresh.setOnClickListener(v -> {
            note("Atualizando o catálogo diretamente no portal…");
            browser.reload();
        });
        chrome.setOnClickListener(v -> openExternal(Uri.parse(STORE_URL)));
        folder.setOnClickListener(v -> downloads());
        browser.loadUrl(STORE_URL);
    }

    @Override public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }
    @Override protected void onPause() {
        if (browser != null) browser.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (browser != null) browser.onResume();
        new Thread(() -> {
            ToneDownloadReceiver.reconcile(getApplicationContext());
            String state = ToneDownloadReceiver.lastStatus(getApplicationContext());
            runOnUiThread(() -> { if (browser != null) note(state); });
        }, "graue-store-reconcile").start();
    }
    @Override protected void onDestroy() {
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
