package br.com.doapps.grauelive;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Read-only layout recognition of the actual observed ImperialV3.jxe variant.
 *
 * WARNING: these boundaries were inferred empirically from ONE real file.
 * The 18 patch records are not proof of 18 user patches or 18 physical parts.
 * No proprietary values are interpreted as XPS-10 SysEx; never use these
 * records as MIDI messages or to modify a USER/SVD backup.
 */
public final class KoaJxeCatalog {
    static final int FILE_SIZE = 336127;
    private static final int PREAMBLE = 2425;
    private static final int PATCH_SIZE = 1049;
    private static final int RHYTHM_SIZE = 17490;
    private static final int MAIN_SLOTS = 16;
    private static final int EXTRA_SLOTS = 2;
    private static final int RHYTHM_NOTE_SLOTS = 88;
    private static final int RHYTHM_NOTE_SIZE = 195;
    private static final int RHYTHM_COMMON_SIZE = 330;
    private static final String MAGIC = "KoaDataFile00001fm";
    private static final String MODEL = "JUNO-Di         ";

    private KoaJxeCatalog() {}

    private static boolean at(byte[] data, int offset, String magic) {
        if (data == null || offset < 0 || offset + magic.length() > data.length)
            return false;
        byte[] expected = magic.getBytes(StandardCharsets.US_ASCII);
        for (int i = 0; i < expected.length; i++)
            if (data[offset + i] != expected[i]) return false;
        return true;
    }

    static boolean isKoaJunoDi(byte[] prefix) {
        return at(prefix, 0, MAGIC) && at(prefix, 80, MODEL);
    }

    private static String printableName(byte[] data, int offset, int length) throws IOException {
        if (offset < 0 || length <= 0 || offset + length > data.length)
            throw new IOException("Nome ultrapassa o tamanho do arquivo");
        for (int i = offset; i < offset + length; i++) {
            int b = data[i] & 0xff;
            if (b < 32 || b > 126)
                throw new IOException("Registro não reconhecido: nome binário na posição " + offset);
        }
        return new String(data, offset, length, StandardCharsets.US_ASCII).trim();
    }

    private static String digest(byte[] data, int offset, int length) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(data, offset, length);
        byte[] hash = md.digest();
        StringBuilder out = new StringBuilder(64);
        for (byte b : hash) out.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        return out.toString();
    }

    private static JSONObject record(byte[] data, int offset, int size,
                                     int slot, boolean additional) throws Exception {
        if (offset < 0 || size <= 0 || offset + size > data.length)
            throw new IOException("Bloco JXE incompleto");
        return new JSONObject()
            .put("index", slot)
            .put("group", additional ? "adicional" : "principal")
            .put("name", printableName(data, offset, 12))
            .put("offset", offset)
            .put("length", size)
            .put("sha256Block", digest(data, offset, size))
            .put("midiVerified", false);
    }

    /** A reliable inventory, not a converter or MIDI decoder. */
    static JSONObject parse(byte[] data) throws Exception {
        if (data == null || data.length != FILE_SIZE || !isKoaJunoDi(data))
            throw new IOException("Variante JXE não reconhecida: não é seguro inferir o layout");
        if (RHYTHM_COMMON_SIZE + RHYTHM_NOTE_SLOTS * RHYTHM_NOTE_SIZE != RHYTHM_SIZE ||
            PREAMBLE + (MAIN_SLOTS + EXTRA_SLOTS) * (PATCH_SIZE + RHYTHM_SIZE) != FILE_SIZE)
            throw new IOException("Constantes do catálogo JXE inconsistentes");

        String performance = printableName(data, 328, 12);
        JSONArray patches = new JSONArray(), rhythms = new JSONArray();
        Set<String> distinctPatches = new HashSet<>(), distinctRhythms = new HashSet<>();
        int mainRhythmOffset = PREAMBLE + MAIN_SLOTS * PATCH_SIZE;
        int extraPatchOffset = mainRhythmOffset + MAIN_SLOTS * RHYTHM_SIZE;
        int extraRhythmOffset = extraPatchOffset + EXTRA_SLOTS * PATCH_SIZE;

        for (int i = 0; i < MAIN_SLOTS + EXTRA_SLOTS; i++) {
            int off = i < MAIN_SLOTS ? PREAMBLE + i * PATCH_SIZE
                : extraPatchOffset + (i - MAIN_SLOTS) * PATCH_SIZE;
            JSONObject entry = record(data, off, PATCH_SIZE, i + 1, i >= MAIN_SLOTS);
            patches.put(entry);
            distinctPatches.add(entry.getString("sha256Block"));
        }
        for (int i = 0; i < MAIN_SLOTS + EXTRA_SLOTS; i++) {
            int off = i < MAIN_SLOTS ? mainRhythmOffset + i * RHYTHM_SIZE
                : extraRhythmOffset + (i - MAIN_SLOTS) * RHYTHM_SIZE;
            JSONObject entry = record(data, off, RHYTHM_SIZE, i + 1, i >= MAIN_SLOTS);
            rhythms.put(entry);
            distinctRhythms.add(entry.getString("sha256Block"));
        }
        // No assumptions about which editor record actually plays on the XPS.
        return new JSONObject()
            .put("recognized", true)
            .put("evidenceLevel", "empirical_one_sample")
            .put("signature", MAGIC)
            .put("editorModel", "JUNO-Di")
            .put("performanceNameCandidate", performance)
            .put("patchRecordBytes", PATCH_SIZE)
            .put("rhythmRecordBytes", RHYTHM_SIZE)
            .put("rhythmNoteSlotCount", RHYTHM_NOTE_SLOTS)
            .put("rhythmNoteRecordBytes", RHYTHM_NOTE_SIZE)
            .put("mainRecordCount", MAIN_SLOTS)
            .put("auxiliaryRecordCount", EXTRA_SLOTS)
            .put("patchRecordCount", patches.length())
            .put("distinctPatchRecords", distinctPatches.size())
            .put("rhythmRecordCount", rhythms.length())
            .put("distinctRhythmRecords", distinctRhythms.size())
            .put("patches", patches)
            .put("rhythms", rhythms)
            .put("canApplyToKeyboard", false)
            .put("canConvertToPerformance", false)
            .put("canUpdateSvdBackup", false)
            .put("note", "Inventário extraído da estrutura deste exemplar JXE. Registros não são SysEx pronto nem mapeamento USER validado.");
    }
}
