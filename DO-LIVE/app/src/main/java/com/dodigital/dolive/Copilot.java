package com.dodigital.dolive;

import java.text.Normalizer;
import java.util.Locale;

/** Offline demo: deterministic, not a language model or TikTok integration. */
final class Copilot {
    static String reply(String viewer, String message) {
        String input = Normalizer.normalize(message.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String name = (viewer == null || viewer.trim().isEmpty()) ? "pessoal" : viewer.trim();
        if (input.contains("oi") || input.contains("ola") || input.contains("boa noite") || input.contains("bom dia"))
            return "Oi, " + name + "! Eu sou o copiloto virtual do DO LIVE. Seja bem-vindo à transmissão!";
        if (input.contains("musica") || input.contains("tocar") || input.contains("cantar"))
            return "Boa ideia, " + name + "! Vou deixar a sugestão de música anotada para o apresentador.";
        if (input.contains("presente") || input.contains("gift"))
            return "Obrigado pelo carinho, " + name + "! O apresentador agradece muito seu apoio.";
        if (input.contains("batalha") || input.contains("placar"))
            return "O quadro de batalhas está disponível no painel do DO LIVE. Este teste não consulta placares do TikTok.";
        if (input.contains("onde") || input.contains("cadê") || input.contains("cade"))
            return "O apresentador está ocupado por um momento. Sou o copiloto virtual e estou aqui para acompanhar vocês.";
        return "Valeu pela mensagem, " + name + "! Sou o assistente virtual do DO LIVE. Assim que puder, o apresentador acompanha a conversa.";
    }
    static String gift(String viewer) {
        return "Obrigado pelo presente, " + viewer + "! Aqui é o copiloto virtual do DO LIVE.";
    }
}
