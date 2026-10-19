package com.dodigital.dolive;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;

/** DO LIVE Android MVP. Local demonstration; never starts or claims a TikTok broadcast. */
public final class StudioActivity extends Activity {
    private static final int CAMERA_REQUEST = 100;
    private static final int PICK_IMAGE = 101;
    private static final int PICK_VIDEO = 102;
    private static final int EXPORT_JSON = 103;
    private static final int IMPORT_JSON = 104;
    private static final String[] PAGES = {
            "LOGIN", "INÍCIO", "MODO SHOW", "CENAS", "CAMADAS", "CHAT",
            "BATALHAS", "ALERTAS", "TEMAS", "ESTATÍSTICAS", "AJUSTES", "COPILOTO IA"
    };
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ArrayList<String> scenes = new ArrayList<>();
    private final ArrayList<LayerItem> layers = new ArrayList<>();
    private SharedPreferences prefs;
    private LinearLayout body;
    private CameraSurface cameraSurface;
    private FrameLayout previewFrame;
    private TextView battleBadge;
    private TextView sceneBadge;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean frontCamera = true;
    private boolean battleEnabled = false;
    private boolean voiceEnabled = true;
    private boolean alertsEnabled = true;
    private boolean pilotUntilStopped = false;
    private boolean loggedIn = false;
    private int page = 0;
    private int sceneIndex = 0;
    private int accent = 0xFF05E9F5;
    private int chatCount = 0;
    private int giftsCount = 0;
    private int alertCount = 0;
    private int homeScore = 0;
    private int awayScore = 0;
    private String pilotMode = "Assistente";
    private String lastEvent = "Nenhum evento recebido";
    private final Runnable handBack = () -> {
        if (pilotUntilStopped) {
            pilotUntilStopped = false;
            pilotMode = "Assistente";
            store();
            say("O apresentador retomou o comando. Obrigado pela companhia!");
            if (page == 11) render();
        }
    };

    private static class LayerItem {
        String kind;
        String text;
        String uri;
        boolean visible;
        LayerItem(String kind, String text, String uri, boolean visible) {
            this.kind = kind; this.text = text; this.uri = uri; this.visible = visible;
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xFF090C16);
        getWindow().setNavigationBarColor(0xFF090C16);
        prefs = getSharedPreferences("dolive-mvp", MODE_PRIVATE);
        load();
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                int result = tts.setLanguage(new Locale("pt", "BR"));
                ttsReady = result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED;
            }
        });
        render();
    }

    private int dp(float x) { return Math.round(getResources().getDisplayMetrics().density * x); }
    private GradientDrawable shape(int background, int stroke, int radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(background);
        d.setCornerRadius(dp(radius)); d.setStroke(dp(1), stroke); return d;
    }
    private TextView text(String s, int size, boolean heavy) {
        TextView v = new TextView(this); v.setText(s); v.setTextColor(Color.WHITE);
        v.setTextSize(size); v.setTypeface(Typeface.DEFAULT, heavy ? Typeface.BOLD : Typeface.NORMAL);
        v.setGravity(Gravity.CENTER_VERTICAL); return v;
    }
    private TextView muted(String s) {
        TextView t = text(s, 13, false); t.setTextColor(0xFFA0B2C7); return t;
    }
    private LinearLayout vertical() {
        LinearLayout l = new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); return l;
    }
    private void gap(LinearLayout parent, int height) {
        View spacer = new View(this); parent.addView(spacer, new LinearLayout.LayoutParams(1, dp(height)));
    }
    private void title(String header, String description) {
        TextView title = text(header, 23, true); body.addView(title);
        gap(body, 6); body.addView(muted(description)); gap(body, 17);
    }
    private void panel(LinearLayout parent, String heading, String subheading) {
        LinearLayout card = vertical(); card.setPadding(dp(14), dp(14), dp(14), dp(14));
        card.setBackground(shape(0xFF141C2D, 0xFF334057, 16));
        TextView h = text(heading, 17, true); h.setTextColor(accent); card.addView(h);
        if (subheading != null && !subheading.isEmpty()) { gap(card, 7); card.addView(muted(subheading)); }
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2); p.bottomMargin = dp(11);
        parent.addView(card, p);
    }
    private Button button(String label, Runnable onClick) {
        Button b = new Button(this); b.setText(label); b.setAllCaps(false);
        b.setTextColor(Color.WHITE); b.setTextSize(13); b.setBackground(shape(0xFF22314B, accent, 11));
        b.setOnClickListener(v -> onClick.run());
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, dp(49)); p.bottomMargin=dp(9);
        body.addView(b, p); return b;
    }
    private Button tinyButton(String label, Runnable onClick) {
        Button b = new Button(this); b.setText(label); b.setAllCaps(false); b.setTextColor(Color.WHITE);
        b.setTextSize(12); b.setBackground(shape(0xFF24334C, 0xFF354968, 9));
        b.setOnClickListener(v -> onClick.run()); return b;
    }
    private void section(String heading) {
        TextView t = text(heading, 17, true); t.setTextColor(accent); body.addView(t); gap(body, 10);
    }
    private void notice(String message) {
        TextView t = muted(message); t.setPadding(dp(12),dp(13),dp(12),dp(13));
        t.setBackground(shape(0xFF111728,0xFF36445B,12)); body.addView(t);
        gap(body,12);
    }
    private void line(String value) { body.addView(muted(value)); gap(body, 10); }
    private void toggle(String title, boolean value, java.util.function.Consumer<Boolean> changed) {
        Switch sw = new Switch(this); sw.setText(title); sw.setTextSize(14);
        sw.setTextColor(Color.WHITE); sw.setChecked(value);
        sw.setPadding(dp(8),dp(8),dp(8),dp(8));
        sw.setOnCheckedChangeListener((s, v) -> changed.accept(v));
        body.addView(sw); gap(body, 8);
    }
    private void edit(String hint, java.util.function.Consumer<String> submit, String buttonText) {
        EditText e = new EditText(this); e.setTextColor(Color.WHITE); e.setHintTextColor(0xFF92A0B3);
        e.setSingleLine(true); e.setTextSize(15); e.setHint(hint);
        e.setPadding(dp(12),dp(8),dp(12),dp(8)); e.setBackground(shape(0xFF131B2B,0xFF46516B,10));
        body.addView(e, new LinearLayout.LayoutParams(-1,dp(50))); gap(body,7);
        button(buttonText, () -> {String value=e.getText().toString().trim(); if(!value.isEmpty()) submit.accept(value);else toast("Preencha o campo primeiro");});
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }
    private void navigate(int destination) { page=destination; render(); }

    private void render() {
        if(cameraSurface!=null) { cameraSurface.shutdown(); cameraSurface=null; }
        previewFrame=null; battleBadge=null; sceneBadge=null;
        LinearLayout root=vertical(); root.setBackgroundColor(0xFF090D18);
        LinearLayout header=vertical(); header.setPadding(dp(18),dp(13),dp(18),dp(10));
        TextView brand=text("◉  DO LIVE     |     DO Digital",20,true); brand.setTextColor(accent); header.addView(brand);
        TextView state=muted("PRÉVIA LOCAL • TikTok não conectado • v0.1.0"); header.addView(state);
        root.addView(header);
        HorizontalScrollView hs=new HorizontalScrollView(this);hs.setHorizontalScrollBarEnabled(false);
        LinearLayout tabs=new LinearLayout(this);tabs.setPadding(dp(10),dp(4),dp(10),dp(12));
        for(int i=0;i<PAGES.length;i++) {
            final int id=i;
            TextView t=text(PAGES[i],11,true);t.setGravity(Gravity.CENTER);
            t.setPadding(dp(10),dp(11),dp(10),dp(11));
            t.setTextColor(page==i?0xFF040814:Color.WHITE);
            t.setBackground(shape(page==i?accent:0xFF1A2435,page==i?accent:0xFF344259,9));
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,dp(38));p.rightMargin=dp(6);tabs.addView(t,p);
            t.setOnClickListener(v->navigate(id));
        }
        hs.addView(tabs);root.addView(hs);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);
        body=vertical();body.setPadding(dp(18),dp(8),dp(18),dp(26));
        scroll.addView(body);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        TextView footer=muted("MVP offline  •  Nenhuma transmissão iniciada");
        footer.setGravity(Gravity.CENTER);footer.setTextSize(11);footer.setPadding(0,dp(10),0,dp(12));
        root.addView(footer);
        setContentView(root);
        switch(page) {
            case 0: login();break; case 1: home();break;case 2: show();break;
            case 3: scenes();break;case 4: layers();break;case 5: chat();break;
            case 6: battles();break;case 7: alerts();break;case 8: themes();break;
            case 9: statistics();break;case 10: settings();break;case 11: copilot();break;
        }
    }
    private void login() {
        title("Bem-vindo ao DO LIVE", "Seu estúdio criativo de lives para Android.");
        panel(body,"12 telas • design escuro/neon", "Acesso demonstrativo local. Nenhuma conta TikTok é autenticada nesta versão.");
        button(loggedIn?"Abrir meu estúdio":"Entrar no estúdio (modo local)",()->{loggedIn=true;store();navigate(1);});
        notice("Login TikTok oficial será implementado somente quando houver autorização e integração compatível.");
    }
    private void home() {
        title("Central do streamer", "Tudo que você precisa, em um só lugar.");
        panel(body,"STATUS: OFFLINE", "Não transmitindo • Câmera local disponível no Modo Show");
        button("▶ Abrir Modo Show",()->navigate(2));
        button("◉ Copiloto IA",()->navigate(11));
        button("▣ Gerenciar cenas",()->navigate(3));
        panel(body,"Resumo deste aparelho", "Cenas: "+scenes.size()+"    Camadas: "+layers.size()+"\nComentários de teste: "+chatCount+"    Presentes de teste: "+giftsCount);
        notice("Batalhas, presentes, comentários e alertas atualmente funcionam com dados de teste. Não representam espectadores reais.");
    }
    private void show() {
        title("Modo Show", "Prévia vertical 9:16 com câmera, cenas e placar sobreposto.");
        TextView warning=text("● PRÉVIA LOCAL — SEM TRANSMISSÃO",12,true);
        warning.setTextColor(0xFFFF728E);warning.setGravity(Gravity.CENTER);body.addView(warning);gap(body,9);
        previewFrame=new FrameLayout(this);
        FrameLayout frame=previewFrame;
        frame.setBackground(shape(0xFF12192B,accent,15));
        // Keep aspect ratio 9:16 independent of the battle panel / local interactions.
        int available=getResources().getDisplayMetrics().widthPixels-dp(48);
        int width=Math.min(available,dp(258));int height=width*16/9;
        LinearLayout.LayoutParams fparams=new LinearLayout.LayoutParams(width,height); fparams.gravity=Gravity.CENTER_HORIZONTAL;
        body.addView(frame,fparams);
        if (checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED) {
            cameraSurface=new CameraSurface(this);
            frame.addView(cameraSurface,new FrameLayout.LayoutParams(-1,-1));
            cameraSurface.restart(frontCamera);
        } else {
            TextView placeholder=text("📷\nPermita acesso à câmera\npara visualizar a prévia",15,true);
            placeholder.setGravity(Gravity.CENTER);frame.addView(placeholder,new FrameLayout.LayoutParams(-1,-1));
        }
        sceneBadge=text("CENA: "+scenes.get(sceneIndex),12,true);sceneBadge.setTextColor(Color.WHITE);
        sceneBadge.setBackgroundColor(0xAA071123);sceneBadge.setPadding(dp(10),dp(8),dp(10),dp(8));
        FrameLayout.LayoutParams top=new FrameLayout.LayoutParams(-1,-2,Gravity.TOP);frame.addView(sceneBadge,top);
        for(LayerItem item: layers) {
            if(!item.visible)continue;
            if(item.kind.equals("imagem")) {
                try {
                    ImageView img=new ImageView(this);img.setImageURI(Uri.parse(item.uri));img.setScaleType(ImageView.ScaleType.FIT_CENTER);
                    FrameLayout.LayoutParams ip=new FrameLayout.LayoutParams(dp(110),dp(110),Gravity.CENTER);frame.addView(img,ip);
                }catch(Exception ex) { /* inaccessible media URI: preserve text placeholder */ }
            } else {
                TextView overlay=text(item.kind.equals("vídeo")?"🎞 "+item.text:item.text,14,true);
                overlay.setBackgroundColor(0xAA060B13);overlay.setPadding(dp(9),dp(6),dp(9),dp(6));
                overlay.setGravity(Gravity.CENTER);
                FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER);frame.addView(overlay,lp);
            }
        }
        battleBadge=text("⚔ BATALHA LOCAL  "+homeScore+" × "+awayScore,14,true);
        battleBadge.setGravity(Gravity.CENTER);battleBadge.setTextColor(0xFFFFFFE6);
        battleBadge.setBackgroundColor(0xDD872050);
        FrameLayout.LayoutParams bp=new FrameLayout.LayoutParams(-1,dp(46),Gravity.BOTTOM);frame.addView(battleBadge,bp);
        battleBadge.setVisibility(battleEnabled?View.VISIBLE:View.GONE);
        gap(body,15);
        if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)
            button("Permitir câmera",()->requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_REQUEST));
        button("↻ Inverter câmera (prévia)",()->{frontCamera=!frontCamera;if(cameraSurface!=null)cameraSurface.restart(frontCamera);});
        button("⚔ Mostrar/ocultar batalha SEM reiniciar a câmera",()->{
            battleEnabled=!battleEnabled;if(battleBadge!=null)battleBadge.setVisibility(battleEnabled?View.VISIBLE:View.GONE);store();
        });
        button("➜ Alternar cena",()->{
            sceneIndex=(sceneIndex+1)%scenes.size();
            if(sceneBadge!=null)sceneBadge.setText("CENA: "+scenes.get(sceneIndex));store();
        });
        button("Copiloto: "+(pilotUntilStopped?"assumindo interações":"acompanha localmente"),()->navigate(11));
        notice("Não há encoder nem conexão TikTok nesta versão. Trocar cenas e ativar o placar altera apenas a prévia local.");
    }
    private void scenes() {
        title("Cenas", "Crie e escolha layouts locais para a prévia.");
        for(int i=0;i<scenes.size();i++){
            int position=i;panel(body,(sceneIndex==i?"● ":"○ ")+scenes.get(i),"Cena "+(i+1));
            button("Usar esta cena",()->{sceneIndex=position;store();navigate(2);});
        }
        edit("Nome da nova cena",name->{scenes.add(name.substring(0,Math.min(40,name.length())));store();render();},"+ Criar cena");
        if(scenes.size()>1)button("Remover última cena",()->{scenes.remove(scenes.size()-1);sceneIndex=Math.min(sceneIndex,scenes.size()-1);store();render();});
    }
    private void layers() {
        title("Fontes e camadas", "Gerencie textos, imagens e arquivos de mídia locais.");
        for(int i=0;i<layers.size();i++) {
            LayerItem item=layers.get(i);int index=i;
            panel(body,(item.visible?"◉ ":"○ ")+item.kind.toUpperCase(Locale.ROOT), item.text);
            button(item.visible?"Ocultar camada":"Mostrar camada",()->{item.visible=!item.visible;store();render();});
            button("Excluir camada",()->{layers.remove(index);store();render();});
        }
        edit("Texto exibido sobre a cena",value->{layers.add(new LayerItem("texto",value,"",true));store();render();},"+ Adicionar texto");
        button("+ Escolher imagem do celular",()->openMedia("image/*",PICK_IMAGE));
        button("+ Selecionar vídeo (marcador na prévia)",()->openMedia("video/*",PICK_VIDEO));
        notice("Imagens podem aparecer sobre a câmera. A reprodução de vídeos, chroma key e mixer de áudio/vídeo ainda não estão prontos.");
    }
    private void chat() {
        title("Chat", "Simule mensagens para testar os três modos do Copiloto.");
        panel(body,"ÚLTIMA INTERAÇÃO",lastEvent);
        line("Modo atual: "+pilotMode+(pilotUntilStopped?" • IA no comando":""));
        edit("Comentário de teste", value->{
            chatCount++;lastEvent="Visitante: "+value;
            if(pilotUntilStopped || pilotMode.equals("Copiloto")) {
                String reply=Copilot.reply("visitante",value);
                lastEvent += "\nIA: "+reply;
                if(pilotUntilStopped) say(reply);
            }
            store();render();
        },"Enviar comentário simulado");
        button("Simular novo seguidor",()->{alertCount++;lastEvent="Novo seguidor (teste)";if(pilotUntilStopped)say("Seja muito bem-vindo! Aqui é o copiloto virtual.");store();render();});
        notice("Este chat não recebe nem publica mensagens no TikTok.");
    }
    private void battles() {
        title("Batalhas", "Placar e overlays de teste: sem vínculo com uma batalha real.");
        panel(body,"PLACAR DA SIMULAÇÃO",homeScore+" × "+awayScore);
        toggle("Mostrar placar na prévia",battleEnabled,value->{battleEnabled=value;store();});
        button("+1 meu lado",()->{homeScore++;store();render();});
        button("+1 outro lado",()->{awayScore++;store();render();});
        button("Zerar placar",()->{homeScore=0;awayScore=0;store();render();});
        button("Visualizar batalha no Modo Show",()->{battleEnabled=true;store();navigate(2);});
        notice("A prévia não gira, não inverte a câmera e não muda de proporção ao ativar o placar. A conexão com batalhas reais ainda não existe.");
    }
    private void alerts() {
        title("Alertas e presentes", "Simule eventos com respostas locais.");
        toggle("Alertas locais ativos",alertsEnabled,value->{alertsEnabled=value;store();});
        panel(body,"Último evento",lastEvent);
        button("🎁 Simular presente",()->{
            giftsCount++;lastEvent="Presente recebido (SIMULAÇÃO)";
            if(alertsEnabled && pilotUntilStopped)say(Copilot.gift("visitante"));
            store();render();
        });
        button("✨ Simular entrada de espectador",()->{
            alertCount++;lastEvent="Espectador entrou (SIMULAÇÃO)";
            if(alertsEnabled && pilotUntilStopped)say("Seja bem-vindo à live! Sou o apresentador virtual.");
            store();render();
        });
        notice("Não há recebimento financeiro nem consulta a presentes reais. Apenas eventos gerados no aparelho.");
    }
    private void themes() {
        title("Temas e overlays", "Personalize a identidade visual da interface.");
        button("Neon ciano",()->{accent=0xFF05E9F5;store();render();});
        button("Neon rosa",()->{accent=0xFFFF48BD;store();render();});
        button("Neon roxo",()->{accent=0xFFAF86FF;store();render();});
        button("Ver na prévia",()->navigate(2));
        notice("Os temas alteram os controles locais. A equivalência visual com a imagem oficial das 12 telas ainda precisa de revisão comparativa.");
    }
    private void statistics() {
        title("Estatísticas", "Dados de ensaio armazenados neste dispositivo.");
        panel(body,"Comentários de teste",String.valueOf(chatCount));
        panel(body,"Presentes simulados",String.valueOf(giftsCount));
        panel(body,"Alertas simulados",String.valueOf(alertCount));
        panel(body,"Conteúdo salvo",scenes.size()+" cenas • "+layers.size()+" camadas");
        notice("Não são métricas de audiência ou monetização do TikTok.");
    }
    private void settings() {
        title("Configurações", "Preferências locais e portabilidade do projeto.");
        toggle("Copiloto com voz sintetizada",voiceEnabled,value->{voiceEnabled=value;store();});
        toggle("Alertas de teste",alertsEnabled,value->{alertsEnabled=value;store();});
        button("Exportar backup JSON",()->{
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"do-live-backup.json");
            startActivityForResult(intent,EXPORT_JSON);
        });
        button("Importar backup JSON",()->{
            Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");startActivityForResult(intent,IMPORT_JSON);
        });
        panel(body,"Privacidade", "Arquivos e configurações ficam neste celular. Nesta versão não há login, nuvem, token nem conexão externa ao TikTok.");
        notice("O backup contém textos e endereços URI de mídia local, não os arquivos de vídeo/foto. Para restaurar mídias, é necessário manter permissões e arquivos acessíveis.");
    }
    private void copilot() {
        title("Copiloto IA", "Assistente virtual offline com respostas e voz predeterminadas.");
        panel(body,"MODO ATUAL",pilotMode+(pilotUntilStopped?" • APRESENTANDO":""));
        button("Assistente • só acompanha",()->{pilotMode="Assistente";stopPilot();store();render();});
        button("Copiloto • responde no simulador",()->{pilotMode="Copiloto";stopPilot();store();render();});
        button("Assumir por até 5 minutos (apresentador virtual)",()->{
            pilotMode="Apresentador Virtual";pilotUntilStopped=true;handler.removeCallbacks(handBack);
            handler.postDelayed(handBack,5*60*1000L);store();
            say("Olá, pessoal! Eu sou o apresentador virtual do DO LIVE. Nosso streamer está ocupado por alguns minutos. Vou acompanhar vocês até ele voltar.");
            render();
        });
        button("■ DEVOLVER COMANDO AGORA",()->{stopPilot();pilotMode="Assistente";store();render();});
        toggle("Usar voz do Android",voiceEnabled,value->{voiceEnabled=value;store();});
        button("▶ Testar fala de apresentação",()->say("Olá, pessoal! Aqui é o copiloto virtual do DO LIVE. Este é um teste no aparelho."));
        button("Abrir chat de demonstração",()->navigate(5));
        notice("Este Copiloto usa regras locais, não um modelo de IA online. Não publica mensagens reais. A voz sai pelo alto-falante do celular, não por um sinal de live.");
    }
    private void say(String phrase) {
        if(!voiceEnabled)return;
        if(!ttsReady) {toast("Voz do Android ainda não está disponível");return;}
        tts.speak(phrase,TextToSpeech.QUEUE_FLUSH,null,"do-live-voice");
    }
    private void stopPilot(){pilotUntilStopped=false;handler.removeCallbacks(handBack);if(tts!=null)tts.stop();}
    private void openMedia(String type,int request) {
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(type);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent,request);
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(request,permissions,results);
        if(request==CAMERA_REQUEST){if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED){render();}else toast("Câmera não autorizada");}
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK || data==null || data.getData()==null)return;
        Uri uri=data.getData();
        try {
            if(request==PICK_IMAGE || request==PICK_VIDEO) {
                getContentResolver().takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);
                String kind=request==PICK_IMAGE?"imagem":"vídeo";
                layers.add(new LayerItem(kind,kind+" selecionado",uri.toString(),true));store();render();
            } else if(request==EXPORT_JSON) {
                try(OutputStream os=getContentResolver().openOutputStream(uri)) {
                    if(os==null)throw new IllegalStateException("Destino inválido");
                    os.write(createBackup().toString(2).getBytes(StandardCharsets.UTF_8));
                }
                toast("Backup exportado");
            } else if(request==IMPORT_JSON) {
                try(InputStream is=getContentResolver().openInputStream(uri)) {
                    if(is==null)throw new IllegalStateException("Arquivo indisponível");
                    byte[] bytes=readBytes(is, 1024*1024);
                    restoreBackup(new JSONObject(new String(bytes,StandardCharsets.UTF_8)));
                    store();render();toast("Backup restaurado");
                }
            }
        } catch(Exception ex) {toast("Não foi possível processar o arquivo: "+ex.getClass().getSimpleName());}
    }
    private byte[] readBytes(InputStream is,int limit) throws Exception {
        java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
        byte[] buffer=new byte[4096];int n;
        while((n=is.read(buffer))!=-1){if(out.size()+n>limit)throw new IllegalArgumentException("Backup muito grande");out.write(buffer,0,n);}
        return out.toByteArray();
    }
    private JSONObject createBackup() throws Exception {
        JSONObject j=new JSONObject();j.put("schema",1);j.put("sceneIndex",sceneIndex);
        j.put("accent",accent);j.put("frontCamera",frontCamera);j.put("battleEnabled",battleEnabled);
        j.put("voiceEnabled",voiceEnabled);j.put("alertsEnabled",alertsEnabled);
        j.put("chatCount",chatCount);j.put("giftsCount",giftsCount);j.put("alertCount",alertCount);
        j.put("homeScore",homeScore);j.put("awayScore",awayScore);
        JSONArray s=new JSONArray();for(String value:scenes)s.put(value);j.put("scenes",s);
        JSONArray a=new JSONArray();for(LayerItem item:layers) {
            JSONObject o=new JSONObject();o.put("kind",item.kind);o.put("text",item.text);o.put("uri",item.uri);
            o.put("visible",item.visible);a.put(o);
        }
        j.put("layers",a);return j;
    }
    private void restoreBackup(JSONObject j) throws Exception {
        if(j.optInt("schema",0)!=1)throw new IllegalArgumentException("Schema incompatível");
        JSONArray s=j.getJSONArray("scenes");JSONArray a=j.getJSONArray("layers");
        if(s.length()>100 || a.length()>100)throw new IllegalArgumentException("Conteúdo muito grande");
        ArrayList<String> newScenes=new ArrayList<>();ArrayList<LayerItem> newLayers=new ArrayList<>();
        for(int i=0;i<s.length();i++)newScenes.add(s.getString(i));
        for(int i=0;i<a.length();i++) {
            JSONObject o=a.getJSONObject(i);
            newLayers.add(new LayerItem(o.getString("kind"),o.getString("text"),o.optString("uri",""),o.optBoolean("visible",true)));
        }
        if(newScenes.isEmpty())throw new IllegalArgumentException("Backup sem cenas");
        scenes.clear();scenes.addAll(newScenes);layers.clear();layers.addAll(newLayers);
        sceneIndex=Math.max(0,Math.min(scenes.size()-1,j.optInt("sceneIndex",0)));
        accent=j.optInt("accent",0xFF05E9F5);frontCamera=j.optBoolean("frontCamera",true);
        battleEnabled=j.optBoolean("battleEnabled",false);voiceEnabled=j.optBoolean("voiceEnabled",true);
        alertsEnabled=j.optBoolean("alertsEnabled",true);
        chatCount=Math.max(0,j.optInt("chatCount",0));giftsCount=Math.max(0,j.optInt("giftsCount",0));
        alertCount=Math.max(0,j.optInt("alertCount",0));homeScore=j.optInt("homeScore",0);awayScore=j.optInt("awayScore",0);
    }
    private void store() {
        try {
            prefs.edit().putString("backup",createBackup().toString()).putString("pilotMode",pilotMode)
                .putBoolean("loggedIn",loggedIn).apply();
        }catch(Exception ignored){}
    }
    private void load() {
        scenes.add("Principal");scenes.add("Bate-papo");scenes.add("Batalha");
        pilotMode=prefs.getString("pilotMode","Assistente");loggedIn=prefs.getBoolean("loggedIn",false);
        try {String backup=prefs.getString("backup",null);if(backup!=null)restoreBackup(new JSONObject(backup));}
        catch(Exception ignored){scenes.clear();scenes.add("Principal");scenes.add("Bate-papo");scenes.add("Batalha");layers.clear();sceneIndex=0;}
    }
    @Override protected void onDestroy() {
        stopPilot();if(cameraSurface!=null)cameraSurface.shutdown();
        if(tts!=null){tts.stop();tts.shutdown();}super.onDestroy();
    }
}
