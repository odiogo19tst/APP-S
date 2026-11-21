package br.com.doapps.grauelive;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Read-only research probe. It does not decode proprietary JXE patch parameters,
 * send MIDI, create a Roland backup, or assume a MIDI-export is compatible
 * with the XPS-10 model. Only reads a bounded file prefix.
 */
public final class ToneFileInspector {
    private static final int MAX_PROBE = 65536;
    private ToneFileInspector() {}

    private static String hex(byte[] bytes, int length) {
        StringBuilder s = new StringBuilder(length * 2);
        for (int i = 0; i < length; i++) {
            int b = bytes[i] & 255;
            s.append(Character.forDigit(b >> 4, 16));
            s.append(Character.forDigit(b & 15, 16));
        }
        return s.toString().toUpperCase(Locale.ROOT);
    }
    private static int be16(byte[] b, int at) {
        return ((b[at] & 255) << 8) | (b[at + 1] & 255);
    }
    private static long be32(byte[] b, int at) {
        return ((long)(b[at] & 255) << 24) | ((long)(b[at + 1] & 255) << 16) |
            ((long)(b[at + 2] & 255) << 8) | (b[at + 3] & 255);
    }
    private static boolean at(byte[] b, int size, int offset, String marker) {
        byte[] signature = marker.getBytes(StandardCharsets.US_ASCII);
        if (offset < 0 || size - offset < signature.length) return false;
        for (int i = 0; i < signature.length; i++)
            if (b[offset + i] != signature[i]) return false;
        return true;
    }
    static JSONObject probe(byte[] data, int length, long size, String originalName) throws Exception {
        if (data == null || length < 0 || length > data.length || size < 0)
            throw new IOException("Amostra de arquivo inválida");
        String name = originalName == null ? "arquivo" : originalName;
        JSONObject result = new JSONObject();
        result.put("name", name).put("bytes", size)
          .put("sampleBytes", length).put("readOnly", true)
          .put("canApplyToKeyboard", false).put("convertedToPatch", false)
          .put("convertedToPerformance", false).put("midiSent", false).put("userWrite", false);
        result.put("prefixHex", hex(data, Math.min(length, 96)));
        boolean smf = at(data,length,0,"MThd") && length >= 14
            && be32(data,4) == 6 && be16(data,8) <= 2
            && be16(data,10) > 0 && be16(data,10) <= 1000;
        boolean zip = length >= 4 && data[0] == 80 && data[1] == 75
            && data[2] == 3 && data[3] == 4;
        boolean xml = at(data,length,0,"<?xml") || at(data,length,0,"<");
        boolean svd = at(data,length,2,"SVD1");
        boolean wav = at(data,length,0,"RIFF") && at(data,length,8,"WAVE");
        String kind = smf ? "SMF_HEADER_VALID" : zip ? "ZIP_CONTAINER" :
            wav ? "WAV_RIFF" : svd ? "SVD_HEADER" : xml ? "TEXT_POSSIBLE" :
            name.toLowerCase(Locale.ROOT).endsWith(".jxe") ? "JXE_BINARY_OR_UNKNOWN" :
            "UNKNOWN";
        result.put("identifiedAs", kind);
        if (smf) {
            JSONObject midi = new JSONObject();
            midi.put("format", be16(data,8));
            midi.put("tracks", be16(data,10));
            midi.put("divisionRaw", be16(data,12));
            midi.put("hasFirstTrackHeader", at(data,length,14,"MTrk"));
            midi.put("note", "O cabeçalho SMF é plausível, mas o conteúdo SysEx e o modelo Roland NÃO foram validados.");
            result.put("smf", midi);
        }
        JSONArray snippets = new JSONArray();
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < length && snippets.length() < 18; i++) {
            int b = data[i] & 255;
            if (b >= 32 && b <= 126) {
                if (token.length() < 100) token.append((char)b);
            } else {
                if (token.length() >= 5) snippets.put(token.toString());
                token.setLength(0);
            }
        }
        if (token.length() >= 5 && snippets.length() < 18) snippets.put(token.toString());
        result.put("printableSnippets", snippets);
        result.put("message", "Pré-análise, não conversão. Para mapear JXE é preciso comparar arquivos reais com os parâmetros SysEx e o XPS Editor.");
        result.put("guidance", "Não renomear JXE como SVD nem executar WRITE USER a partir deste relatório.");
        return result;
    }

    public static JSONObject analyze(File original, String filename, String sha256) throws Exception {
        if (original == null || !original.isFile()) throw new IOException("Original indisponível");
        if (sha256 == null || !sha256.matches("[0-9a-f]{64}"))
            throw new IOException("Identificador inválido");
        byte[] prefix = new byte[MAX_PROBE];
        int used = 0;
        try (FileInputStream in = new FileInputStream(original)) {
            while (used < prefix.length) {
                int read = in.read(prefix,used,prefix.length-used);
                if (read < 0) break;
                if (read == 0) continue;
                used += read;
            }
        }
        JSONObject report = probe(prefix,used,original.length(),filename);
        report.put("sha256",sha256);
        if (KoaJxeCatalog.isKoaJunoDi(prefix)) {
            report.put("identifiedAs", "KOA_JUNO_DI_EDITOR_STATE");
            if (original.length() == KoaJxeCatalog.FILE_SIZE) {
                // Bounded by the exact size of the layout empirically observed.
                byte[] complete = new byte[KoaJxeCatalog.FILE_SIZE];
                int received = 0;
                try (FileInputStream in = new FileInputStream(original)) {
                    while (received < complete.length) {
                        int n = in.read(complete, received, complete.length - received);
                        if (n < 0) break;
                        if (n == 0) continue;
                        received += n;
                    }
                }
                if (received == complete.length) {
                    try {
                        report.put("koa", KoaJxeCatalog.parse(complete));
                        report.put("message", "Catalogação JXE concluída: nomes de Performance, Patches e ritmos reconhecidos. Ainda não é conversão MIDI.");
                    } catch (Exception e) {
                        report.put("koaWarning", "Layout não validado neste arquivo: " + e.getMessage());
                    }
                } else {
                    report.put("koaWarning", "Arquivo incompleto durante a leitura. Nenhum Patch extraído.");
                }
            } else {
                report.put("koaWarning", "Assinatura Koa/JUNO-Di identificada, mas o tamanho é de outra variante. Sem extração por offsets.");
            }
        }
        return report;
    }
}
