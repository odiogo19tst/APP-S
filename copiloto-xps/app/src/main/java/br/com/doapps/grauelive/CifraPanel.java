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
 private final Importer batchReporter;
 private org.json.JSONArray batch;
 private int batchIndex,batchGeneration;
 private boolean batchLoading;
 private final android.os.Handler batchHandler=new android.os.Handler(android.os.Looper.getMainLooper());

 interface Importer {void accept(org.json.JSONObject score);}
 CifraPanel(Activity activity, Importer importer, Importer batchReporter, Runnable close) {
  super(activity);this.importer=importer;this.batchReporter=batchReporter;setOrientation(VERTICAL);setBackgroundColor(0xff101827);
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
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !"https".equalsIgnoreCase(r.getUrl().getScheme())||(batchLoading&&!safeCifra(r.getUrl().toString()));}
   @Override public void onPageFinished(WebView v,String url){Uri uri=Uri.parse(url);String host=uri.getHost();if(host!=null&&(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br")))nav.edit().putString("last_url",url).apply();address.setText((host==null?"Cifra Club":host)+" • sessão gerenciada pelo site");CookieManager.getInstance().flush();if(batchLoading){final int token=batchGeneration;batchHandler.postDelayed(()->attemptBatch(token,0),900);}}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())address.setText("Falha ao abrir. Confira a internet ou use Externo.");}
  });
  browser.setWebChromeClient(new WebChromeClient());
  button(bar,"←",()->{if(browser.canGoBack())browser.goBack();});
  button(bar,"↻",()->browser.reload());
  button(bar,"Início",()->browser.loadUrl("https://www.cifraclub.com.br/"));
  button(bar,"Externo",()->{String u=browser.getUrl();if(u!=null&&"https".equalsIgnoreCase(Uri.parse(u).getScheme()))try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(u)));}catch(Exception ignored){address.setText("Nenhum navegador disponível.");}});
  button(bar,"Trazer cifra",this::importCurrent);
  button(bar,"Fechar",()->{cancelBatch();close.run();});
  String last=nav.getString("last_url","https://www.cifraclub.com.br/");Uri target=Uri.parse(last);String host=target.getHost();boolean trusted="https".equalsIgnoreCase(target.getScheme())&&host!=null&&(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br"));
  browser.loadUrl(trusted?last:"https://www.cifraclub.com.br/");
 }
 static boolean safeCifra(String url){
  Uri u=Uri.parse(url);String host=u.getHost();
  return "https".equalsIgnoreCase(u.getScheme())&&u.getUserInfo()==null&&host!=null&&(host.equalsIgnoreCase("cifraclub.com.br")||host.equalsIgnoreCase("www.cifraclub.com.br")||host.equalsIgnoreCase("m.cifraclub.com.br"));
 }
 private void report(String state,String error){try{org.json.JSONObject data=new org.json.JSONObject().put("state",state).put("index",batchIndex).put("total",batch==null?0:batch.length()).put("error",error==null?"":error);if(batch!=null&&batchIndex<batch.length())data.put("title",batch.getJSONObject(batchIndex).optString("title")).put("entryId",batch.getJSONObject(batchIndex).optString("id"));batchReporter.accept(data);}catch(Exception ignored){}}
 void importBatch(org.json.JSONArray items){
  if(items.length()<1||items.length()>50)throw new IllegalArgumentException("Use uma escala com 1 a 50 músicas");
  for(int i=0;i<items.length();i++)if(!safeCifra(items.optJSONObject(i)==null?"":items.optJSONObject(i).optString("sourceUrl")))throw new IllegalArgumentException("Link de cifra não permitido");
  cancelBatch();batch=items;batchIndex=0;loadNext();
 }
 void cancelBatch(){if(batchLoading)browser.stopLoading();if(batch!=null)report("cancelled","Importação interrompida; cifras já importadas foram preservadas.");batchGeneration++;batchLoading=false;batch=null;}
 private void loadNext(){
  if(batch==null)return;
  if(batchIndex>=batch.length()){report("done","");batch=null;batchLoading=false;return;}
  batchLoading=true;final int token=++batchGeneration;report("loading","");
  browser.loadUrl(batch.optJSONObject(batchIndex).optString("sourceUrl"));
  batchHandler.postDelayed(()->{if(batchLoading&&token==batchGeneration)finishBatchItem(null,"A página não disponibilizou a cifra em 25 segundos. Tente novamente no navegador.");},25000);
 }
 private void attemptBatch(int token,int attempt){
  if(!batchLoading||batch==null||token!=batchGeneration)return;
  String current=browser.getUrl()==null?"":browser.getUrl();
  String expected=Uri.parse(batch.optJSONObject(batchIndex).optString("sourceUrl")).getPath();
  String actual=Uri.parse(current).getPath();
  if(expected==null||actual==null||!actual.replace("principal.html","").equals(expected.replace("principal.html","")))return;
  extractCurrent(data->{
   if(!batchLoading||batch==null||token!=batchGeneration)return;
   if(data.optBoolean("ok")){finishBatchItem(data,"");return;}
   if(attempt<5)batchHandler.postDelayed(()->attemptBatch(token,attempt+1),1000);
   else finishBatchItem(null,data.optString("error","Cifra indisponível; tente novamente."));
  });
 }
 private void finishBatchItem(org.json.JSONObject score,String error){
  if(!batchLoading||batch==null)return;
  batchLoading=false;batchGeneration++;
  if(score!=null)try{score.put("louveBatch",true).put("louve",batch.getJSONObject(batchIndex));importer.accept(score);report("imported","");}catch(Exception e){report("failed",e.getMessage());}
  else report("failed",error);
  batchIndex++;batchHandler.postDelayed(this::loadNext,250);
 }
 void importCurrent(){extractCurrent(data->{if(data.optBoolean("ok")){importer.accept(data);address.setText("Cifra importada para o Grauê.");}else address.setText(data.optString("error","Cifra não disponível."));});}
 private void extractCurrent(Importer callback){
  String page=browser.getUrl()==null?"":browser.getUrl();
  if(!safeCifra(page)){callback.accept(failed("Abra a cifra no site oficial do Cifra Club."));return;}
  try{
   byte[] jsBytes;
   try(java.io.InputStream input=getContext().getAssets().open("cifra-extractor.js");java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream()){
    byte[] buf=new byte[8192];int n;while((n=input.read(buf))!=-1){if(output.size()+n>90000)throw new java.io.IOException("Extrator grande demais");output.write(buf,0,n);}jsBytes=output.toByteArray();
   }
   String js=new String(jsBytes,java.nio.charset.StandardCharsets.UTF_8);address.setText("Analisando acordes e letra automaticamente…");
   browser.evaluateJavascript(js+"\nJSON.stringify(window.GraueCifraExtract(document, location.href));",result->{
    try{Object decoded=new org.json.JSONTokener(result).nextValue();if(!(decoded instanceof String))throw new org.json.JSONException("Resultado não textual");callback.accept(new org.json.JSONObject((String)decoded));}
    catch(Exception e){callback.accept(failed("Não foi possível interpretar esta página. Confira se o site exige login ou outra intervenção."));}
   });
  }catch(Exception e){callback.accept(failed("Extrator indisponível: "+e.getMessage()));}
 }
 private static org.json.JSONObject failed(String message){org.json.JSONObject result=new org.json.JSONObject();try{result.put("ok",false).put("error",message);}catch(Exception ignored){}return result;}
 private void button(LinearLayout bar,String title,Runnable action){Button b=new Button(getContext());b.setText(title);b.setTextSize(11);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(4,0,4,0);b.setOnClickListener(v->action.run());bar.addView(b,new LayoutParams(0,-2,1));}
 void pause(){if(batch!=null)cancelBatch();browser.onPause();CookieManager.getInstance().flush();}
 void resume(){browser.onResume();}
 void destroy(){cancelBatch();batchHandler.removeCallbacksAndMessages(null);browser.stopLoading();removeView(browser);browser.destroy();}
}
