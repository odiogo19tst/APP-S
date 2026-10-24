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
 interface Importer {void accept(String title,String text);}
 CifraPanel(Activity activity, Importer importer, Runnable close) {
  super(activity);setOrientation(VERTICAL);setBackgroundColor(0xff101827);
  LinearLayout bar=new LinearLayout(activity);
  addView(bar,new LayoutParams(-1,-2));
  TextView address=new TextView(activity);address.setTextColor(0xffffffff);address.setPadding(12,4,12,4);address.setText("Cifra Club • navegação online");
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
  button(bar,"Importar",()->{
   Uri uri=Uri.parse(browser.getUrl()==null?"":browser.getUrl());String host=uri.getHost();if(host==null||!(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br"))){address.setText("Abra a cifra no Cifra Club antes de importar.");return;}
   // Busca somente o conteúdo da cifra aberta pelo usuário. O novo layout do Cifra Club pode não usar <pre>.
   // Não acessa cookies, credenciais nem páginas fora do domínio permitido.
   String script = """
     (() => {
       const selectors = ['pre', '#cifra', '.cifra_cnt', '.cifra', '[data-testid="cifra-content"]',
         '[data-testid="chord-sheet"]', '[class*="chord-sheet"]', '[class*="cifra-content"]',
         '[class*="cifra_cnt"]', 'main article pre'];
       const candidates = [];
       for (const sel of selectors) for (const e of document.querySelectorAll(sel)) {
         const t = (e.innerText || '').trim();
         if (t.length >= 30 && t.length <= 200000) candidates.push(t);
       }
       // Preserva quebras de linha para que o parser local possa ler acordes e versos.
       const score = t => {
         const lines = t.split(String.fromCharCode(10)).map(x => x.trim());
         const patterns = lines.filter(x => /(^| )[A-G](#|b)?(m|maj|sus|dim|aug|7|9|11|13)?[0-9]*( |$)/.test(x)).length;
         return patterns * 12 - Math.max(0, t.length - 10000) / 400;
       };
       candidates.sort((a,b) => score(b)-score(a));
       const content = candidates[0] || '';
       return JSON.stringify({title:(document.querySelector('h1')?.innerText || document.title || '').slice(0,180),
         text:content.slice(0,100000)});
     })()
   """;
   browser.evaluateJavascript(script,result->{try{String json=(String)new org.json.JSONTokener(result).nextValue();org.json.JSONObject d=new org.json.JSONObject(json);String text=d.getString("text");if(text.trim().isEmpty()){address.setText("Não encontrei a cifra neste layout. Use Compartilhar/Importar texto.");return;}importer.accept(d.getString("title"),text);address.setText("Cifra enviada ao Grauê. Revise o tom e os acordes.");}catch(Exception e){address.setText("Importação indisponível nesta página. Use Compartilhar texto.");}});
  });
  button(bar,"Fechar",close);
  String last=nav.getString("last_url","https://www.cifraclub.com.br/");Uri target=Uri.parse(last);String host=target.getHost();boolean trusted="https".equalsIgnoreCase(target.getScheme())&&host!=null&&(host.equals("cifraclub.com.br")||host.endsWith(".cifraclub.com.br"));
  browser.loadUrl(trusted?last:"https://www.cifraclub.com.br/");
 }
 private void button(LinearLayout bar,String title,Runnable action){Button b=new Button(getContext());b.setText(title);b.setTextSize(11);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(4,0,4,0);b.setOnClickListener(v->action.run());bar.addView(b,new LayoutParams(0,-2,1));}
 void pause(){browser.onPause();CookieManager.getInstance().flush();}
 void resume(){browser.onResume();}
 void destroy(){browser.stopLoading();removeView(browser);browser.destroy();}
}
