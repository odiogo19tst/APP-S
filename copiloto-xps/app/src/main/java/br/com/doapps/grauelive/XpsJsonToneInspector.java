package br.com.doapps.grauelive;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Offline inspector for the observed .xps JSON/Base64 Roland-style data file.
 *
 * Each key is four 7-bit address bytes separated by hyphens. Each Base64
 * value contains data bytes followed by the Roland address+data checksum.
 * The original contains neither the SysEx model/device ID nor F0/F7.
 * Consequently even a valid checksum is NOT permission to send to the XPS-10.
 */
public final class XpsJsonToneInspector {
    public static final int MAX_JSON_BYTES = 65536;
    private static final String[] AI_LEAD_KEYS = {
        "1F-00-00-00", "1F-00-02-00", "1F-00-04-00",
        "1F-00-06-00", "1F-00-10-00", "1F-00-20-00",
        "1F-00-22-00", "1F-00-24-00", "1F-00-26-00"
    };
    private static final String[] NAMES = {
        "common", "mfx", "chorus", "reverb", "tmt",
        "tone1", "tone2", "tone3", "tone4"
    };
    private static final int[] OBSERVED_DATA_LENGTHS = {
        80, 125, 84, 83, 41, 128, 128, 128, 128
    };

    private XpsJsonToneInspector() {}

    private static String section(String address) {
        for (int i = 0; i < AI_LEAD_KEYS.length; i++)
            if (AI_LEAD_KEYS[i].equals(address)) return NAMES[i];
        return "unmapped";
    }

    private static int expectedLength(String address) {
        for (int i = 0; i < AI_LEAD_KEYS.length; i++)
            if (AI_LEAD_KEYS[i].equals(address)) return OBSERVED_DATA_LENGTHS[i];
        return -1;
    }

    /**
     * Parses a bounded input and validates all source checksums. No SysEx header
     * is synthesized; no parameter address is remapped and no MIDI is sent.
     */
    public static JSONObject inspect(byte[] source, int length) throws Exception {
        if (source == null || length <= 0 || length > source.length ||
            length > MAX_JSON_BYTES)
            throw new IOException("Arquivo XPS vazio, incompleto ou maior que o limite de análise");
        String json = new String(source, 0, length, StandardCharsets.UTF_8).trim();
        if (!json.startsWith("{") || !json.endsWith("}"))
            throw new IOException("Esta variante XPS não é um objeto JSON");
        JSONObject object = new JSONObject(json);
        if (object.length() < 1 || object.length() > 24)
            throw new IOException("Quantidade de blocos XPS fora dos limites (1 a 24)");
        Map<String,byte[]> blocks = new HashMap<>();
        Map<String,Integer> lengths = new HashMap<>();
        Iterator<String> iterator = object.keys();
        int dataBytes = 0;
        while (iterator.hasNext()) {
            String rawKey = iterator.next();
            String key = rawKey.toUpperCase(Locale.ROOT);
            if (!key.matches("(?:[0-7][0-9A-F]-){3}[0-7][0-9A-F]"))
                throw new IOException("Endereço XPS inválido: " + key);
            if (blocks.containsKey(key)) throw new IOException("Bloco XPS repetido");
            Object encoded = object.get(rawKey);
            if (!(encoded instanceof String))
                throw new IOException("Conteúdo XPS não é Base64");
            byte[] bytes;
            try { bytes = Base64.getDecoder().decode((String) encoded); }
            catch (IllegalArgumentException e) { throw new IOException("Base64 XPS inválido: " + key); }
            if (bytes.length < 2 || bytes.length > 8192)
                throw new IOException("Bloco XPS muito pequeno ou excessivamente grande");
            String[] parts = key.split("-");
            int sum = 0;
            for (String p : parts) sum += Integer.parseInt(p, 16);
            for (byte b : bytes) {
                int v = b & 255;
                if (v > 127) throw new IOException("Byte de dados XPS fora do intervalo MIDI");
                sum += v;
            }
            if ((sum & 127) != 0)
                throw new IOException("Checksum Roland inválido no bloco " + key);
            blocks.put(key, bytes);
            lengths.put(key, bytes.length - 1); // final byte is checksum
            dataBytes += bytes.length - 1;
        }
        ArrayList<String> ordered = new ArrayList<>(blocks.keySet());
        Collections.sort(ordered);
        JSONArray entries = new JSONArray();
        boolean matchesObservedLayout = ordered.size() == AI_LEAD_KEYS.length;
        for (String key : ordered) {
            int size = lengths.get(key), knownLength = expectedLength(key);
            if (knownLength < 0 || knownLength != size)
                matchesObservedLayout = false;
            entries.put(new JSONObject()
                .put("address", key)
                .put("section", section(key))
                .put("dataBytes", size)
                .put("observedAiLeadBytes", knownLength >= 0 ? knownLength : JSONObject.NULL)
                .put("matchesObservedLength", knownLength == size)
                .put("checksumValid", true));
        }
        byte[] common = blocks.get("1F-00-00-00");
        String patchName = "";
        if (common != null && common.length >= 13) {
            boolean readable = true;
            for (int i = 0; i < 12; i++) {
                int c = common[i] & 255;
                if (c < 32 || c > 126) { readable = false; break; }
            }
            if (readable)
                patchName = new String(common, 0, 12, StandardCharsets.US_ASCII).trim();
        }
        JSONArray warnings = new JSONArray();
        warnings.put("Checksum válido confirma integridade aritmética, não compatibilidade com o XPS-10");
        warnings.put("O arquivo não inclui cabeçalho SysEx com fabricante, modelo e Device ID");
        warnings.put("Endereços 1F-xx indicam dados de Patch temporário em algumas famílias Roland; o destino no XPS-10 exige confirmação");
        warnings.put("Os tamanhos observados MFX (125) e Tone (128) são menores que os blocos completos mapeados no Grauê (145 e 154); não preencher nem enviar automaticamente");
        if (!matchesObservedLayout)
            warnings.put("Variante de arquivo diferente da amostra AiLead: validar seções e endereços separadamente");
        return new JSONObject()
            .put("recognized", true)
            .put("format", "XPS_JSON_BASE64_ROLAND_CHECKSUM")
            .put("patchName", patchName)
            .put("sectionCount", entries.length())
            .put("dataBytes", dataBytes)
            .put("checksumValidCount", entries.length())
            .put("matchesObservedAiLeadLayout", matchesObservedLayout)
            .put("modelIdEmbedded", false)
            .put("targetModelConfirmed", false)
            .put("payloadAddressCompatibilityVerified", false)
            .put("canApplyToKeyboard", false)
            .put("canWriteUserMemory", false)
            .put("blocks", entries)
            .put("warnings", warnings);
    }
}
