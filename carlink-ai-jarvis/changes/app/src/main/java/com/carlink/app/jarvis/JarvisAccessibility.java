package com.carlink.app.jarvis;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.*;
import java.util.*;

/** On-demand semantic inspection only; no screenshots, event logs, passwords or cloud upload. */
public final class JarvisAccessibility extends AccessibilityService {
    @Override protected void onServiceConnected() { JarvisState.accessibility=this; }
    @Override public void onAccessibilityEvent(AccessibilityEvent e) {}
    @Override public void onInterrupt() { JarvisState.GATE.stop(); }
    @Override public void onDestroy() { JarvisState.accessibility=null; JarvisState.GATE.stop(); super.onDestroy(); }

    String operate(String cmd, String allowedIds) {
        if (!JarvisState.GATE.allowsUi(JarvisState.now())) return "Bloqueado: confirme estacionamento e conecte velocidade OBD válida.";
        if (cmd.equals("HOME")) return performGlobalAction(GLOBAL_ACTION_HOME) ? "Tela inicial aberta." : "Ação indisponível.";
        if (cmd.equals("BACK")) return performGlobalAction(GLOBAL_ACTION_BACK) ? "Voltei." : "Ação indisponível.";
        AccessibilityNodeInfo root=getRootInActiveWindow();
        if(root==null) return "Sem árvore de acessibilidade. A projeção Android Auto não expõe seus elementos aqui.";
        try {
            String pkg=String.valueOf(root.getPackageName());
            if(!pkg.equals("com.google.android.apps.maps") && !pkg.equals("com.spotify.music")) return "Aplicativo fora da lista permitida.";
            Set<String> ids=new HashSet<>(Arrays.asList(allowedIds.split("\\s+")));
            if(cmd.startsWith("CLICK ")) {
                String id=cmd.substring(6);
                if(!id.startsWith(pkg+":id/") || !ids.contains(id)) return "Elemento não autorizado localmente.";
                List<AccessibilityNodeInfo> nodes=root.findAccessibilityNodeInfosByViewId(id);
                boolean result=false;
                try {
                    if(nodes.size()!=1) return "Elemento ausente ou ambíguo.";
                    AccessibilityNodeInfo n=nodes.get(0);
                    if(n.isVisibleToUser() && n.isEnabled() && n.isClickable() && !n.isPassword() && !n.isEditable())
                        result=n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                } finally { for(AccessibilityNodeInfo n:nodes) n.recycle(); }
                return result ? "Elemento acionado." : "Elemento não acionável.";
            }
            // Report IDs only, filtered to visible, approved controls. Never arbitrary screen text.
            StringBuilder report=new StringBuilder("Controles autorizados visíveis: ");
            int count=0;
            for(String id:ids) {
                if(!id.startsWith(pkg+":id/")) continue;
                List<AccessibilityNodeInfo> nodes=root.findAccessibilityNodeInfosByViewId(id);
                try {
                    if(count<6 && nodes.size()==1 && nodes.get(0).isVisibleToUser() && !nodes.get(0).isPassword()) {
                        if(report.length()+id.length()>450) break;
                        report.append(id).append(' '); count++;
                    }
                } finally { for(AccessibilityNodeInfo n:nodes) n.recycle(); }
            }
            return report.toString();
        } finally { root.recycle(); }
    }
}
