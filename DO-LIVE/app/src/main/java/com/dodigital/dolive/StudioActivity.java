package com.dodigital.dolive;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.VideoView;
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
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.Collections;

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
    private ScrollView mainScroll;
    private int editorScrollY = 0;
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
    private int selectedLayer = -1;
    private int settingTab = 0;
    private final Map<LayerItem,View> sourceViews = new IdentityHashMap<>();
    private final Map<LayerItem,View> sourceContent = new IdentityHashMap<>();
    private int previewWidth = 0, previewHeight = 0;
    private boolean snap = true, guides = true, mirrorFront = true;
    private int canvasWidth = 1080, canvasHeight = 1920;
    private int outputHeight = 720, fps = 30, videoBitrate = 3500, audioBitrate = 128, audioSampleRate = 48000;
    private int micGain = 100;

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
        String kind, text, uri;
        int scene;
        boolean visible = true, locked = false;
        float x, y, w, h, rotation, opacity = 1f, volume = 1f;
        float cropLeft, cropTop, cropRight, cropBottom;
        LayerItem(String kind, String text, String uri, boolean visible, int scene) {
            this.kind=kind; this.text=text; this.uri=uri; this.visible=visible; this.scene=scene;
            if(kind.equals("câmera") || kind.equals("cor")){x=0;y=0;w=1;h=1;}
            else if(kind.equals("imagem") || kind.equals("vídeo")){x=.2f;y=.27f;w=.60f;h=.40f;}
            else {x=.12f;y=.42f;w=.76f;h=.10f;}
        }
        LayerItem duplicate() {
            LayerItem n=new LayerItem(kind,text,uri,visible,scene);
            n.x=x+.03f;n.y=y+.03f;n.w=w;n.h=h;n.rotation=rotation;n.opacity=opacity;
            n.cropLeft=cropLeft;n.cropTop=cropTop;n.cropRight=cropRight;n.cropBottom=cropBottom;
            n.volume=volume;n.locked=false;return n;
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
    private void navigate(int destination) { page=destination; editorScrollY=0; render(); }

    private void render() {
        if(mainScroll!=null && page==4)editorScrollY=mainScroll.getScrollY();
        if(cameraSurface!=null) { cameraSurface.shutdown(); cameraSurface=null; }
        previewFrame=null; battleBadge=null; sceneBadge=null; sourceViews.clear(); sourceContent.clear();
        LinearLayout root=vertical(); root.setBackgroundColor(0xFF090D18);
        LinearLayout header=vertical(); header.setPadding(dp(18),dp(13),dp(18),dp(10));
        TextView brand=text("◉  DO LIVE     |     DO Digital",20,true); brand.setTextColor(accent); header.addView(brand);
        TextView state=muted("PRÉVIA LOCAL • TikTok não conectado • v0.2.0"); header.addView(state);
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
        ScrollView scroll=new ScrollView(this);mainScroll=scroll;scroll.setFillViewport(true);
        body=vertical();body.setPadding(dp(18),dp(8),dp(18),dp(26));
        scroll.addView(body);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        TextView footer=muted("Estúdio local • Sem transmissão/encoder");
        footer.setGravity(Gravity.CENTER);footer.setTextSize(11);footer.setPadding(0,dp(10),0,dp(12));
        root.addView(footer);
        setContentView(root);
        switch(page) {
            case 0: login();break; case 1: home();break;case 2: show();break;
            case 3: scenes();break;case 4: layers();break;case 5: chat();break;
            case 6: battles();break;case 7: alerts();break;case 8: themes();break;
            case 9: statistics();break;case 10: settings();break;case 11: copilot();break;
        }
        if(page==4 && editorScrollY>0)scroll.post(()->scroll.scrollTo(0,editorScrollY));
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
        button("▣ EDITAR CAMADAS E POSIÇÕES",()->navigate(4));
        button("◉ Gerenciar cenas",()->navigate(3));
        button("⚙ Configurar vídeo e áudio",()->navigate(10));
        panel(body,"Resumo deste aparelho", "Cenas: "+scenes.size()+"    Camadas: "+layers.size()+"\nComentários de teste: "+chatCount+"    Presentes de teste: "+giftsCount);
        notice("Batalhas, presentes, comentários e alertas atualmente funcionam com dados de teste. Não representam espectadores reais.");
    }
    private void show() {
        title("Modo Show", "Visualização vertical 9:16 de sua composição de cena.");
        notice("PRÉVIA LOCAL — ainda não existe transmissão, captura de saída ou encoder.");
        addPreview(body,false);
        button("✎ Editar fontes e posições",()->navigate(4));
        button("↻ Alternar câmera",()->{frontCamera=!frontCamera;if(cameraSurface!=null)cameraSurface.restart(frontCamera);store();});
        button("⚔ Placar da batalha (local)",()->{battleEnabled=!battleEnabled;store();render();});
        button("➜ Próxima cena",()->{sceneIndex=(sceneIndex+1)%scenes.size();selectedLayer=-1;store();render();});
        button("⚙ Vídeo / Áudio / Saída",()->navigate(10));
        button("Copiloto IA",()->navigate(11));
    }
    private LayerItem newSource(String kind, String content, String uri) {
        LayerItem item=new LayerItem(kind,content,uri,true,sceneIndex);
        if(kind.equals("câmera"))for(LayerItem old:layers)if(old.scene==sceneIndex && old.kind.equals("câmera")){
            toast("Já existe câmera nesta cena");return old;
        }
        if(layers.size()>=150){toast("Limite de 150 fontes por projeto");return item;}
        if(kind.equals("cor"))layers.add(0,item);
        else layers.add(item);
        selectedLayer=layers.indexOf(item);store();return item;
    }
    private void addPreview(LinearLayout target, boolean editing) {
        TextView label=text("● "+scenes.get(sceneIndex)+"   •   "+canvasWidth+"×"+canvasHeight+" (9:16)",12,true);
        label.setTextColor(accent);target.addView(label);gap(target,8);
        FrameLayout frame=new FrameLayout(this);previewFrame=frame;
        frame.setBackground(shape(0xFF121A2D,accent,12));frame.setClipChildren(true);frame.setClipToPadding(true);
        int width=Math.min(getResources().getDisplayMetrics().widthPixels-dp(48),dp(editing?305:285));
        int height=Math.round(width*16f/9f);
        previewWidth=width;previewHeight=height;
        LinearLayout.LayoutParams prm=new LinearLayout.LayoutParams(width,height);prm.gravity=Gravity.CENTER_HORIZONTAL;
        target.addView(frame,prm);
        TextView canvasHint=text("ÁREA DE COMPOSIÇÃO",12,true);canvasHint.setGravity(Gravity.CENTER);
        canvasHint.setTextColor(0xFF55677E);frame.addView(canvasHint,new FrameLayout.LayoutParams(-1,-1));
        // Render bottom-to-top; higher sources are painted above lower sources.
        for(LayerItem item:layers)if(item.scene==sceneIndex && item.visible) {
            FrameLayout shell=new FrameLayout(this);
            shell.setClipChildren(true);shell.setClipToPadding(true);
            View content=makeSourceView(item,shell);
            frame.addView(shell);
            sourceViews.put(item,shell);sourceContent.put(item,content);
            applyLayerGeometry(item);
            if(editing)enableTouchTransform(shell,item);
        }
        if(guides && editing) {
            View margin=new View(this);
            GradientDrawable outline=new GradientDrawable();outline.setColor(Color.TRANSPARENT);
            outline.setStroke(dp(1),0x884BDAFF);margin.setBackground(outline);
            FrameLayout.LayoutParams mp=new FrameLayout.LayoutParams(width-dp(28),height-dp(50),Gravity.CENTER);
            frame.addView(margin,mp);margin.setClickable(false);
        }
        if(battleEnabled) {
            battleBadge=text("⚔ BATALHA DE TESTE    "+homeScore+" × "+awayScore,13,true);
            battleBadge.setTextColor(Color.WHITE);battleBadge.setGravity(Gravity.CENTER);
            battleBadge.setBackgroundColor(0xCC872050);
            frame.addView(battleBadge,new FrameLayout.LayoutParams(-1,dp(36),Gravity.BOTTOM));
        }
        if(editing) {
            TextView hint=muted("Toque para selecionar • arraste para mover • use ◢ para dimensionar");
            hint.setTextSize(11);hint.setPadding(0,dp(8),0,dp(10));target.addView(hint);
        } else gap(target,14);
    }
    private View makeSourceView(LayerItem item,FrameLayout shell) {
        View content;
        if(item.kind.equals("câmera")) {
            if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED && cameraSurface==null) {
                cameraSurface=new CameraSurface(this);
                cameraSurface.setScaleX((frontCamera && mirrorFront)?-1f:1f);
                cameraSurface.restart(frontCamera);
                content=cameraSurface;
            } else {
                TextView placeholder=text("📷  Câmera",12,true);placeholder.setGravity(Gravity.CENTER);
                placeholder.setBackgroundColor(0xFF203248);content=placeholder;
            }
        } else if(item.kind.equals("imagem")) {
            ImageView image=new ImageView(this);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            try {image.setImageURI(Uri.parse(item.uri));}catch(Exception ignored){}
            content=image;
        } else if(item.kind.equals("vídeo")) {
            VideoView video=new VideoView(this);
            try {
                video.setVideoURI(Uri.parse(item.uri));
                video.setOnPreparedListener(mp->{mp.setLooping(true);mp.setVolume(item.volume,item.volume);video.start();});
            }catch(Exception ignored){}
            content=video;
        } else {
            TextView t=text(item.kind.equals("relógio")?new java.text.SimpleDateFormat("HH:mm",Locale.getDefault()).format(new java.util.Date()):item.kind.equals("cor")?"":item.text,16,true);
            t.setGravity(Gravity.CENTER);
            t.setTextColor(Color.WHITE);
            t.setBackgroundColor(item.kind.equals("cor")?0xFF2744AB:0x99000A1B);
            t.setPadding(dp(4),dp(2),dp(4),dp(2));content=t;
        }
        shell.addView(content,new FrameLayout.LayoutParams(-1,-1));
        return content;
    }
    private void applyLayerGeometry(LayerItem item) {
        View shell=sourceViews.get(item);
        if(shell==null)return;
        int width=Math.max(dp(20),Math.round(previewWidth*item.w));
        int height=Math.max(dp(20),Math.round(previewHeight*item.h));
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(width,height);
        lp.leftMargin=Math.round(previewWidth*item.x);lp.topMargin=Math.round(previewHeight*item.y);
        shell.setLayoutParams(lp);shell.setRotation(item.rotation);shell.setAlpha(item.opacity);
        shell.setForeground(null);
        View content=sourceContent.get(item);
        if(content!=null){
            int l=Math.round(width*item.cropLeft),t=Math.round(height*item.cropTop);
            int r=Math.round(width*(1-item.cropRight)),b=Math.round(height*(1-item.cropBottom));
            content.setClipBounds(new Rect(l,t,Math.max(l+1,r),Math.max(t+1,b)));
        }
        if(page==4 && layers.indexOf(item)==selectedLayer) {
            GradientDrawable outline=new GradientDrawable();outline.setColor(Color.TRANSPARENT);
            outline.setStroke(dp(2),accent);shell.setForeground(outline);
        }
    }
    private float cap(float v,float min,float max){return Math.max(min,Math.min(max,v));}
    private void enableTouchTransform(FrameLayout shell,LayerItem item) {
        shell.setOnTouchListener(new View.OnTouchListener(){
            float downX,downY,startX,startY;
            boolean moved;
            @Override public boolean onTouch(View v,MotionEvent event){
                switch(event.getActionMasked()){
                    case MotionEvent.ACTION_DOWN:
                        downX=event.getRawX();downY=event.getRawY();startX=item.x;startY=item.y;moved=false;
                        if(selectedLayer!=layers.indexOf(item)) {selectedLayer=layers.indexOf(item);render();return true;}
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        if(item.locked)return true;
                        float dx=(event.getRawX()-downX)/previewWidth;
                        float dy=(event.getRawY()-downY)/previewHeight;
                        if(Math.abs(dx)+Math.abs(dy)>.003f)moved=true;
                        item.x=cap(startX+dx,0,1-item.w);item.y=cap(startY+dy,0,1-item.h);
                        if(snap){item.x=Math.round(item.x*40)/40f;item.y=Math.round(item.y*40)/40f;}
                        applyLayerGeometry(item);return true;
                    case MotionEvent.ACTION_UP:store();if(moved)render();return true;
                }
                return true;
            }
        });
        if(layers.indexOf(item)==selectedLayer && !item.locked){
            TextView handle=text("◢",18,true);handle.setGravity(Gravity.CENTER);
            handle.setTextColor(Color.BLACK);handle.setBackground(shape(accent,accent,5));
            FrameLayout.LayoutParams hp=new FrameLayout.LayoutParams(dp(30),dp(30),Gravity.BOTTOM|Gravity.RIGHT);
            shell.addView(handle,hp);
            handle.setOnTouchListener(new View.OnTouchListener(){
                float downX,downY,w,h;
                @Override public boolean onTouch(View v,MotionEvent e){
                    switch(e.getActionMasked()){
                        case MotionEvent.ACTION_DOWN:downX=e.getRawX();downY=e.getRawY();w=item.w;h=item.h;return true;
                        case MotionEvent.ACTION_MOVE:
                            item.w=cap(w+(e.getRawX()-downX)/previewWidth,.07f,1-item.x);
                            item.h=cap(h+(e.getRawY()-downY)/previewHeight,.04f,1-item.y);
                            applyLayerGeometry(item);return true;
                        case MotionEvent.ACTION_UP:store();render();return true;
                    }return true;
                }
            });
        }
    }
    private void scenes() {
        title("Cenas", "Cada cena mantém suas próprias camadas e posições.");
        for(int i=0;i<scenes.size();i++){
            int pos=i;int count=0;for(LayerItem l:layers)if(l.scene==i)count++;
            panel(body,(sceneIndex==i?"●  ":"○  ")+scenes.get(i),count+" fontes nesta cena");
            button("Editar cena: "+scenes.get(i),()->{sceneIndex=pos;selectedLayer=-1;store();navigate(4);});
        }
        edit("Nome da nova cena",name->{
            if(scenes.size()>=20){toast("Limite de 20 cenas");return;}
            scenes.add(name.substring(0,Math.min(40,name.length())));
            sceneIndex=scenes.size()-1;newSource("câmera","Câmera frontal","");selectedLayer=-1;store();navigate(4);
        },"+ Criar cena com câmera");
        if(scenes.size()>1)button("Excluir cena atual (com suas fontes)",()->new AlertDialog.Builder(this)
            .setTitle("Excluir "+scenes.get(sceneIndex)+"?").setMessage("As camadas desta cena também serão apagadas.")
            .setNegativeButton("Cancelar",null).setPositiveButton("Excluir",(d,w)->{
                int old=sceneIndex;layers.removeIf(l->l.scene==old);
                for(LayerItem l:layers)if(l.scene>old)l.scene--;
                scenes.remove(old);sceneIndex=Math.max(0,Math.min(old,scenes.size()-1));selectedLayer=-1;store();render();
            }).show());
    }
    private void editorSlider(String label,int max,int value,java.util.function.IntConsumer onChange) {
        TextView readout=muted(label+": "+value);body.addView(readout);
        SeekBar slider=new SeekBar(this);slider.setMax(max);slider.setProgress(value);
        slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            @Override public void onProgressChanged(SeekBar bar,int progress,boolean fromUser){
                if(fromUser){readout.setText(label+": "+progress);onChange.accept(progress);}
            }
            @Override public void onStartTrackingTouch(SeekBar b){}
            @Override public void onStopTrackingTouch(SeekBar b){store();}
        });body.addView(slider);
    }
    private void layers() {
        title("Editor de fontes / camadas", "Agora você pode selecionar, mover, redimensionar e organizar cada fonte.");
        addPreview(body,true);
        if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)
            button("Permitir acesso à câmera",()->requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_REQUEST));
        section("Adicionar fontes à cena");
        button("+ TEXTO",()->editTextDialog(null));
        button("+ IMAGEM do celular",()->openMedia("image/*",PICK_IMAGE));
        button("+ VÍDEO local",()->openMedia("video/*",PICK_VIDEO));
        button("+ CÂMERA",()->{newSource("câmera","Câmera","");render();});
        button("+ COR / FUNDO",()->{newSource("cor","Cor sólida","");render();});
        button("+ RELÓGIO",()->{newSource("relógio","Hora","");render();});
        section("Camadas (de cima para baixo)");
        boolean any=false;
        for(int i=layers.size()-1;i>=0;i--){
            LayerItem item=layers.get(i);if(item.scene!=sceneIndex)continue;
            any=true;final int ix=i;
            Button choose=button((selectedLayer==i?"▣ ":"▢ ")+(item.visible?"👁 ":"⊘ ")+
                (item.locked?"🔒 ":"")+item.kind.toUpperCase(Locale.ROOT)+" • "+item.text,()->{selectedLayer=ix;render();});
            if(selectedLayer==i)choose.setTextColor(accent);
        }
        if(!any)notice("Cena vazia: adicione câmera, texto, imagem ou vídeo usando os botões acima.");
        if(selectedLayer<0 || selectedLayer>=layers.size() || layers.get(selectedLayer).scene!=sceneIndex)return;
        LayerItem item=layers.get(selectedLayer);
        section("Propriedades: "+item.text);
        toggle("Fonte visível",item.visible,v->{item.visible=v;store();render();});
        toggle("Bloquear posição",item.locked,v->{item.locked=v;store();render();});
        button("✎ Nome / texto",()->editTextDialog(item));
        button("↑ Subir camada",()->reorder(item,+1));
        button("↓ Descer camada",()->reorder(item,-1));
        button("⧉ Duplicar camada",()->{layers.add(item.duplicate());selectedLayer=layers.size()-1;store();render();});
        button("⌖ Centralizar",()->{item.x=(1-item.w)/2;item.y=(1-item.h)/2;store();render();});
        button("▣ Ajustar à tela",()->{item.x=0;item.y=0;item.w=1;item.h=1;item.rotation=0;store();render();});
        button("↺ Resetar transformações",()->{LayerItem fresh=new LayerItem(item.kind,item.text,item.uri,item.visible,item.scene);
            item.x=fresh.x;item.y=fresh.y;item.w=fresh.w;item.h=fresh.h;item.rotation=0;
            item.cropLeft=item.cropTop=item.cropRight=item.cropBottom=0;item.opacity=1;store();render();});
        section("Transformar • porcentagens da tela");
        if(item.locked)notice("Camada bloqueada: desbloqueie para alterar a geometria.");
        else {
            editorSlider("X (%)",100,Math.round(item.x*100),v->{item.x=cap(v/100f,0,1-item.w);applyLayerGeometry(item);});
            editorSlider("Y (%)",100,Math.round(item.y*100),v->{item.y=cap(v/100f,0,1-item.h);applyLayerGeometry(item);});
            editorSlider("Largura (%)",100,Math.round(item.w*100),v->{item.w=cap(v/100f,.07f,1-item.x);applyLayerGeometry(item);});
            editorSlider("Altura (%)",100,Math.round(item.h*100),v->{item.h=cap(v/100f,.04f,1-item.y);applyLayerGeometry(item);});
            editorSlider("Rotação (graus)",360,Math.round(item.rotation+180),v->{item.rotation=v-180;applyLayerGeometry(item);});
        }
        editorSlider("Opacidade (%)",100,Math.round(item.opacity*100),v->{item.opacity=v/100f;applyLayerGeometry(item);});
        section("Recorte de fonte (%)");
        editorSlider("Esquerda",45,Math.round(item.cropLeft*100),v->{item.cropLeft=v/100f;applyLayerGeometry(item);});
        editorSlider("Topo",45,Math.round(item.cropTop*100),v->{item.cropTop=v/100f;applyLayerGeometry(item);});
        editorSlider("Direita",45,Math.round(item.cropRight*100),v->{item.cropRight=v/100f;applyLayerGeometry(item);});
        editorSlider("Base",45,Math.round(item.cropBottom*100),v->{item.cropBottom=v/100f;applyLayerGeometry(item);});
        if(item.kind.equals("vídeo"))editorSlider("Volume da prévia (%)",100,Math.round(item.volume*100),v->{item.volume=v/100f;});
        button("🗑 Excluir esta camada",()->new AlertDialog.Builder(this).setTitle("Apagar fonte?")
            .setNegativeButton("Cancelar",null).setPositiveButton("Apagar",(d,w)->{layers.remove(item);selectedLayer=-1;store();render();}).show());
        notice("A ordem das camadas, recorte, tamanho, posição e opacidade são aplicados na prévia local e salvos neste aparelho.");
    }
    private void reorder(LayerItem item,int dir) {
        int old=layers.indexOf(item),other=old+dir;
        while(other>=0 && other<layers.size() && layers.get(other).scene!=sceneIndex)other+=dir;
        if(other>=0 && other<layers.size()){
            Collections.swap(layers,old,other);selectedLayer=other;store();render();
        } else toast("A fonte já está no limite da pilha");
    }
    private void editTextDialog(LayerItem item) {
        EditText e=new EditText(this);e.setSingleLine(false);e.setTextColor(Color.BLACK);
        e.setText(item==null?"Minha live":item.text);
        new AlertDialog.Builder(this).setTitle(item==null?"Adicionar texto":"Editar conteúdo")
            .setView(e).setNegativeButton("Cancelar",null).setPositiveButton("Salvar",(d,w)->{
                String value=e.getText().toString().trim();if(value.length()==0)return;
                if(item==null)newSource("texto",value.substring(0,Math.min(180,value.length())),"");
                else item.text=value.substring(0,Math.min(180,value.length()));
                store();render();
            }).show();
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
        title("Configurações OBS-style", "Parâmetros organizados por categoria, adaptados ao Android.");
        String[] menus={"GERAL","VÍDEO","ÁUDIO","SAÍDA","PROJETOS"};
        LinearLayout bar=new LinearLayout(this);bar.setOrientation(LinearLayout.HORIZONTAL);
        HorizontalScrollView wrap=new HorizontalScrollView(this);wrap.setHorizontalScrollBarEnabled(false);
        for(int k=0;k<menus.length;k++){
            final int ix=k;Button b=tinyButton(menus[k],()->{settingTab=ix;render();});
            if(k==settingTab)b.setTextColor(accent);
            LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(103),dp(42));lp.rightMargin=dp(5);bar.addView(b,lp);
        }
        wrap.addView(bar);body.addView(wrap);gap(body,15);
        if(settingTab==0){
            section("Geral / Editor");
            toggle("Encaixar fontes na grade",snap,v->{snap=v;store();});
            toggle("Mostrar guias de enquadramento",guides,v->{guides=v;store();});
            toggle("Espelhar prévia da câmera frontal",mirrorFront,v->{mirrorFront=v;store();});
            toggle("Alertas de eventos locais",alertsEnabled,v->{alertsEnabled=v;store();});
            button("Abrir editor de camadas",()->navigate(4));
        } else if(settingTab==1){
            section("Vídeo / Canvas");
            panel(body,"Base (Canvas)",canvasWidth+" × "+canvasHeight+" • vertical 9:16");
            button("Alternar canvas 720p / 1080p",()->{
                canvasWidth=canvasWidth==1080?720:1080;canvasHeight=canvasWidth*16/9;store();render();
            });
            panel(body,"Resolução de saída planejada",outputHeight+"p • ainda sem encoder");
            button("Alternar saída 720p / 1080p",()->{outputHeight=outputHeight==720?1080:720;store();render();});
            panel(body,"FPS planejado",fps+" quadros por segundo");
            button("Alternar FPS 24 / 30 / 60",()->{fps=fps==24?30:fps==30?60:24;store();render();});
            notice("O editor usa um canvas vertical normalizado, preservando a posição das fontes ao mudar a resolução-base. FPS/saída são presets ainda não aplicados a um encoder.");
        } else if(settingTab==2){
            section("Áudio / Prévia");
            toggle("Voz do copiloto no alto-falante",voiceEnabled,v->{voiceEnabled=v;store();});
            editorSlider("Ganho desejado de microfone (%)",200,micGain,v->{micGain=v;});
            button("Taxa de amostragem: "+audioSampleRate+" Hz",()->{
                audioSampleRate=audioSampleRate==48000?44100:48000;store();render();});
            notice("O ganho e a amostragem são preferências salvas para o futuro mixer. NÃO controlam ainda o microfone nem o áudio transmitido. A voz do copiloto sai no dispositivo.");
        } else if(settingTab==3){
            section("Saída / Encoder");
            panel(body,"Vídeo","H.264 via MediaCodec • planejado, não implementado");
            editorSlider("Bitrate alvo vídeo (× 100 kbps)",100,videoBitrate/100,v->{videoBitrate=Math.max(500,v*100);});
            panel(body,"Áudio","AAC • planejado, não implementado");
            button("Bitrate áudio: "+audioBitrate+" kbps",()->{audioBitrate=audioBitrate==128?160:audioBitrate==160?96:128;store();render();});
            notice("Nenhum RTMP, RTMPS, envio de vídeo, gravação ou transmissão TikTok é executado nesta versão. Estes valores são preparação de perfil.");
        } else {
            section("Projetos / Backup");
            button("Exportar backup JSON v2",()->{
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"do-live-backup-v2.json");
                startActivityForResult(intent,EXPORT_JSON);
            });
            button("Importar backup JSON v1/v2",()->{
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");startActivityForResult(intent,IMPORT_JSON);
            });
            panel(body,"Projeto neste aparelho",scenes.size()+" cenas • "+layers.size()+" camadas");
            notice("Fotos e vídeos não são embutidos no JSON. Seus URI locais requerem acesso continuado aos arquivos selecionados.");
        }
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
                newSource(kind,kind+" selecionado",uri.toString());render();
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
        JSONObject j=new JSONObject();j.put("schema",2);j.put("sceneIndex",sceneIndex);
        j.put("accent",accent);j.put("frontCamera",frontCamera);j.put("battleEnabled",battleEnabled);
        j.put("voiceEnabled",voiceEnabled);j.put("alertsEnabled",alertsEnabled);
        j.put("chatCount",chatCount);j.put("giftsCount",giftsCount);j.put("alertCount",alertCount);
        j.put("homeScore",homeScore);j.put("awayScore",awayScore);
        j.put("snap",snap);j.put("guides",guides);j.put("mirrorFront",mirrorFront);
        j.put("canvasWidth",canvasWidth);j.put("canvasHeight",canvasHeight);
        j.put("outputHeight",outputHeight);j.put("fps",fps);
        j.put("videoBitrate",videoBitrate);j.put("audioBitrate",audioBitrate);
        j.put("audioSampleRate",audioSampleRate);j.put("micGain",micGain);
        JSONArray scenesJson=new JSONArray();for(String scene:scenes)scenesJson.put(scene);j.put("scenes",scenesJson);
        JSONArray sourcesJson=new JSONArray();for(LayerItem item:layers) {
            JSONObject o=new JSONObject();o.put("kind",item.kind);o.put("text",item.text);o.put("uri",item.uri);
            o.put("visible",item.visible);o.put("locked",item.locked);o.put("scene",item.scene);
            o.put("x",item.x);o.put("y",item.y);o.put("w",item.w);o.put("h",item.h);
            o.put("rotation",item.rotation);o.put("opacity",item.opacity);o.put("volume",item.volume);
            o.put("cropLeft",item.cropLeft);o.put("cropTop",item.cropTop);
            o.put("cropRight",item.cropRight);o.put("cropBottom",item.cropBottom);
            sourcesJson.put(o);
        }
        j.put("layers",sourcesJson);return j;
    }
    private void restoreBackup(JSONObject j) throws Exception {
        int schema=j.optInt("schema",0);
        if(schema!=1 && schema!=2)throw new IllegalArgumentException("Schema incompatível");
        JSONArray ss=j.getJSONArray("scenes"),aa=j.getJSONArray("layers");
        if(ss.length()>100||aa.length()>300)throw new IllegalArgumentException("Conteúdo muito grande");
        ArrayList<String> names=new ArrayList<>();ArrayList<LayerItem> items=new ArrayList<>();
        for(int i=0;i<ss.length();i++)names.add(ss.getString(i));
        if(names.isEmpty())throw new IllegalArgumentException("Backup sem cenas");
        for(int i=0;i<aa.length();i++){
            JSONObject o=aa.getJSONObject(i);int sc=schema==2?o.optInt("scene",0):0;
            if(sc<0||sc>=names.size())continue;
            LayerItem item=new LayerItem(o.getString("kind"),o.getString("text"),o.optString("uri",""),o.optBoolean("visible",true),sc);
            item.locked=o.optBoolean("locked",false);
            if(schema==2){
                item.x=(float)cap((float)o.optDouble("x",item.x),0,.95f);
                item.y=(float)cap((float)o.optDouble("y",item.y),0,.95f);
                item.w=(float)cap((float)o.optDouble("w",item.w),.07f,1-item.x);
                item.h=(float)cap((float)o.optDouble("h",item.h),.04f,1-item.y);
                item.rotation=(float)cap((float)o.optDouble("rotation",0),-180,180);
                item.opacity=(float)cap((float)o.optDouble("opacity",1),0,1);
                item.volume=(float)cap((float)o.optDouble("volume",1),0,1);
                item.cropLeft=(float)cap((float)o.optDouble("cropLeft",0),0,.45f);
                item.cropTop=(float)cap((float)o.optDouble("cropTop",0),0,.45f);
                item.cropRight=(float)cap((float)o.optDouble("cropRight",0),0,.45f);
                item.cropBottom=(float)cap((float)o.optDouble("cropBottom",0),0,.45f);
            }
            items.add(item);
        }
        // Migration: v1 always showed camera as a non-editable backdrop; now a configurable source.
        if(schema==1)for(int i=0;i<names.size();i++){
            LayerItem cam=new LayerItem("câmera","Câmera", "",true,i);
            items.add(0,cam);
        }
        scenes.clear();scenes.addAll(names);layers.clear();layers.addAll(items);
        sceneIndex=Math.max(0,Math.min(scenes.size()-1,j.optInt("sceneIndex",0)));
        selectedLayer=-1;
        accent=j.optInt("accent",0xFF05E9F5);frontCamera=j.optBoolean("frontCamera",true);
        battleEnabled=j.optBoolean("battleEnabled",false);voiceEnabled=j.optBoolean("voiceEnabled",true);
        alertsEnabled=j.optBoolean("alertsEnabled",true);
        snap=j.optBoolean("snap",true);guides=j.optBoolean("guides",true);mirrorFront=j.optBoolean("mirrorFront",true);
        canvasWidth=j.optInt("canvasWidth",1080);canvasHeight=canvasWidth*16/9;
        outputHeight=j.optInt("outputHeight",720);fps=j.optInt("fps",30);
        videoBitrate=j.optInt("videoBitrate",3500);audioBitrate=j.optInt("audioBitrate",128);
        audioSampleRate=j.optInt("audioSampleRate",48000);micGain=j.optInt("micGain",100);
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
        layers.add(new LayerItem("câmera","Câmera principal","",true,0));
        layers.add(new LayerItem("texto","Bem-vindos à live!","",true,0));
        layers.add(new LayerItem("câmera","Câmera de conversa","",true,1));
        layers.add(new LayerItem("câmera","Câmera de batalha","",true,2));
        pilotMode=prefs.getString("pilotMode","Assistente");loggedIn=prefs.getBoolean("loggedIn",false);
        try {String backup=prefs.getString("backup",null);if(backup!=null)restoreBackup(new JSONObject(backup));}
        catch(Exception ignored){scenes.clear();scenes.add("Principal");scenes.add("Bate-papo");scenes.add("Batalha");layers.clear();layers.add(new LayerItem("câmera","Câmera principal","",true,0));sceneIndex=0;}
    }
    @Override protected void onDestroy() {
        stopPilot();if(cameraSurface!=null)cameraSurface.shutdown();
        if(tts!=null){tts.stop();tts.shutdown();}super.onDestroy();
    }
}