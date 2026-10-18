package br.com.doapps.grauelive;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.webkit.*;
import android.widget.*;

/** Online browser isolated from the local MIDI bridge. */
final class CifraPanel extends LinearLayout {
 private final WebView browser;
 CifraPanel(Activity activity, Runnable close) {
  super(activity);setOrientation(VERTICAL);setBackgroundColor(0xff101827);
  LinearLayout bar=new LinearLayout(activity);
  addView(bar,new LayoutParams(-1,-2));
  TextView address=new TextView(activity);address.setTextColor(0xffffffff);address.setPadding(12,4,12,4);address.setText("Cifra Club • navegação online");
  addView(address,new LayoutParams(-1,-2));
  browser=new WebView(activity);addView(browser,new LayoutParams(-1,0,1));
  WebSettings s=browser.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setBuiltInZoomControls(true);s.setDisplayZoomControls(false);
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(browser,false);
  browser.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !"https".equalsIgnoreCase(r.getUrl().getScheme());}
   @Override public void onPageFinished(WebView v,String url){Uri uri=Uri.parse(url);address.setText(uri.getHost()+" • login feito diretamente no site");CookieManager.getInstance().flush();}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())address.setText("Falha ao abrir. Confira a internet ou use Externo.");}
  });
  browser.setWebChromeClient(new WebChromeClient());
  button(bar,"←",()->{if(browser.canGoBack())browser.goBack();});
  button(bar,"↻",()->browser.reload());
  button(bar,"Início",()->browser.loadUrl("https://www.cifraclub.com.br/"));
  button(bar,"Externo",()->{String u=browser.getUrl();if(u!=null&&"https".equalsIgnoreCase(Uri.parse(u).getScheme()))try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(u)));}catch(Exception ignored){address.setText("Nenhum navegador disponível.");}});
  button(bar,"Fechar",close);
  browser.loadUrl("https://www.cifraclub.com.br/");
 }
 private void button(LinearLayout bar,String title,Runnable action){Button b=new Button(getContext());b.setText(title);b.setTextSize(11);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(4,0,4,0);b.setOnClickListener(v->action.run());bar.addView(b,new LayoutParams(0,-2,1));}
 void pause(){browser.onPause();CookieManager.getInstance().flush();}
 void resume(){browser.onResume();}
 void destroy(){browser.stopLoading();removeView(browser);browser.destroy();}
}
