package br.com.doapps.grauelive;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Catálogo atualizado diretamente do fornecedor. A página de terceiros não recebe
 * acesso à ponte Native, aos favoritos, ao backup ou à conexão MIDI do Grauê.
 * Downloads são delegados ao navegador; nunca são transmitidos ao teclado.
 */
public class SynthXpsPortalActivity extends Activity {
 private static final String URL = "https://www.synthxps.com.br/?modelo=xps10";
 private WebView portal;
 private TextView info;

 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  LinearLayout root = new LinearLayout(this);
  root.setOrientation(LinearLayout.VERTICAL);
  root.setBackgroundColor(Color.rgb(244,246,250));
  LinearLayout actions = new LinearLayout(this);
  actions.setOrientation(LinearLayout.HORIZONTAL);
  Button back = new Button(this); back.setText("Voltar");
  Button refresh = new Button(this); refresh.setText("Atualizar");
  Button browser = new Button(this); browser.setText("Navegador");
  actions.addView(back, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT,1));
  actions.addView(refresh, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT,1));
  actions.addView(browser, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT,1));
  root.addView(actions);
  info = new TextView(this);
  info.setText("Catálogo SynthXPS • Conteúdo atualizado diretamente do site.");
  info.setTextColor(Color.rgb(30,40,55));
  info.setPadding(16,10,16,10);
  root.addView(info);
  portal = new WebView(this);
  portal.setBackgroundColor(Color.WHITE);
  WebSettings settings = portal.getSettings();
  settings.setJavaScriptEnabled(true);  // o catálogo pode depender de JS
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);
  settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setJavaScriptCanOpenWindowsAutomatically(false);
  settings.setSupportMultipleWindows(false);
  settings.setMediaPlaybackRequiresUserGesture(true);
  settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
  portal.setWebChromeClient(new WebChromeClient());
  portal.setWebViewClient(new WebViewClient() {
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    if(!request.isForMainFrame())return false;
    Uri u=request.getUrl();
    if(isPortal(u))return false;
    openExternally(u);
    return true;
   }
   @Override public void onPageFinished(WebView view,String url) {
    info.setText("SynthXPS XPS-10 • Atualizar recarrega o catálogo online.");
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error) {
    if(request.isForMainFrame())info.setText("Não foi possível carregar o portal. Verifique a internet ou toque em Navegador.");
   }
  });
  portal.setDownloadListener((url,userAgent,contentDisposition,mimeType,length)->{
   Uri uri;
   try {uri=Uri.parse(url);}catch(Exception e){info.setText("Link de download inválido.");return;}
   info.setText("O download será aberto no navegador. O Grauê não instala arquivos automaticamente no XPS-10.");
   openExternally(uri);
  });
  root.addView(portal,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));
  setContentView(root);
  back.setOnClickListener(v->onBackPressed());
  refresh.setOnClickListener(v->portal.reload());
  browser.setOnClickListener(v->openExternally(Uri.parse(URL)));
  portal.loadUrl(URL);
 }
 private boolean isPortal(Uri u) {
  if(!"https".equalsIgnoreCase(u.getScheme()))return false;
  String h=u.getHost();
  return "synthxps.com.br".equalsIgnoreCase(h)||"www.synthxps.com.br".equalsIgnoreCase(h);
 }
 private void openExternally(Uri u) {
  if(u==null||!"https".equalsIgnoreCase(u.getScheme())){
   info.setText("Somente links HTTPS são permitidos.");
   return;
  }
  try {
   startActivity(new Intent(Intent.ACTION_VIEW,u).addCategory(Intent.CATEGORY_BROWSABLE));
  } catch(ActivityNotFoundException e) {
   info.setText("Nenhum navegador disponível para abrir este link.");
  }
 }
 @Override public void onBackPressed(){
  if(portal!=null&&portal.canGoBack())portal.goBack();
  else super.onBackPressed();
 }
 @Override protected void onDestroy() {
  if(portal!=null){((ViewGroup)portal.getParent()).removeView(portal);portal.destroy();portal=null;}
  super.onDestroy();
 }
}
