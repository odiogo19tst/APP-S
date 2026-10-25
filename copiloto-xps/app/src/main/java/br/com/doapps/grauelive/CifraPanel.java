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
 private final TextView address;
 private final Importer importer;
 interface Importer {void accept(org.json.JSONObject score);}
 CifraPanel(Activity activity, Importer importer, Runnable close) {
  super(activity);this.importer=importer;setOrientation(VERTICAL);setBackgroundColor(0xff101827);
  LinearLayout bar=new LinearLayout(activity);
  addView(bar,new LayoutParams(-1,-2));
  address=new TextView(activity);address.setTextColor(0xffffffff);address.setPadding(12,4,12,4);address.setText("Cifra Club • navegação online");
  addView(address,new LayoutParams(-1,-2));
  final android.content.SharedPreferences nav=activity.getSharedPreferences("graue-cifra-navigation",0);
  browser=new WebView(activity);addView(browser,new LayoutParams(-1,0,1));
  WebSettings s=browser.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setBuiltInZoomControls(true);s.setDisplayZoomControls(false);
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(browser,false);
  browser.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !"https".equalsIgnoreCase(r.getUrl().getScheme());}
   @Override public void onPageFinished(WebView v,String url){Uri uri=Uri.parse(url);String host=uri.getHost();if(host!=null&&(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br")))nav.edit().putString("last_url",url).apply();address.setText((host==null?"Cifra Club":host)+" • sessão gerenciada pelo site");CookieManager.getInstance().flush();}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())address.setText("Falha ao abrir. Confira a internet ou use Externo.");}
  });
  browser.setWebChromeClient(new WebChromeClient());
  button(bar,"←",()->{if(browser.canGoBack())browser.goBack();});
  button(bar,"↻",()->browser.reload());
  button(bar,"Início",()->browser.loadUrl("https://www.cifraclub.com.br/"));
  button(bar,"Externo",()->{String u=browser.getUrl();if(u!=null&&"https".equalsIgnoreCase(Uri.parse(u).getScheme()))try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(u)));}catch(Exception ignored){address.setText("Nenhum navegador disponível.");}});
  button(bar,"Trazer cifra",this::importCurrent);
  button(bar,"Fechar",close);
  String last=nav.getString("last_url","https://www.cifraclub.com.br/");Uri target=Uri.parse(last);String host=target.getHost();boolean trusted="https".equalsIgnoreCase(target.getScheme())&&host!=null&&(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br"));
  browser.loadUrl(trusted?last:"https://www.cifraclub.com.br/");
 }
 void importCurrent(){
   final String page=browser.getUrl()==null?"":browser.getUrl();
   final Uri uri=Uri.parse(page);String host=uri.getHost();
   if(!"https".equalsIgnoreCase(uri.getScheme())||host==null||!(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br"))){
    address.setText("Abra uma cifra no Cifra Club para importar.");return;
   }
   try{
    // Only script that runs in the current Cifra Club WebView.
    // The script classifies the DOM the user already opened: no crawling or cookie access.
    byte[] jsBytes;
    try(java.io.InputStream input=getContext().getAssets().open("cifra-extractor.js");
        java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream()){
     byte[] buf=new byte[8192];int n;
     while((n=input.read(buf))!=-1){if(output.size()+n>90000)throw new java.io.IOException("Extrator grande demais");output.write(buf,0,n);}
     jsBytes=output.toByteArray();
    }
    String js=new String(jsBytes,java.nio.charset.StandardCharsets.UTF_8);
    address.setText("Analisando acordes e letra automaticamente…");
    browser.evaluateJavascript(js+"\nJSON.stringify(window.GraueCifraExtract(document, location.href));",result->{
     try{
      Object decoded=new org.json.JSONTokener(result).nextValue();
      if(!(decoded instanceof String))throw new org.json.JSONException("Resultado não textual");
      org.json.JSONObject data=new org.json.JSONObject((String)decoded);
      if(!data.optBoolean("ok")){
       address.setText(data.optString("error","Não consegui identificar a cifra nesta página."));return;
      }
      if(data.optString("text","").isBlank()){address.setText("Cifra sem versos detectáveis. Página mantida no navegador.");return;}
      importer.accept(data);
      address.setText("Cifra importada para o Grauê. Navegador recolhido.");
     }catch(Exception e){address.setText("Não foi possível interpretar esta versão da página. Confira se abriu uma cifra.");}
    });
   }catch(Exception e){address.setText("Extrator indisponível. Verifique os arquivos do app.");}
  }
 private void button(LinearLayout bar,String title,Runnable action){Button b=new Button(getContext());b.setText(title);b.setTextSize(11);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(4,0,4,0);b.setOnClickListener(v->action.run());bar.addView(b,new LayoutParams(0,-2,1));}
 void pause(){browser.onPause();CookieManager.getInstance().flush();}
 void resume(){browser.onResume();}
 void destroy(){browser.stopLoading();removeView(browser);browser.destroy();}
}
