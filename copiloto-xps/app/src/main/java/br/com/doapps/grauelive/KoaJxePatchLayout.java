package br.com.doapps.grauelive;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Offline-only interpretation of the empirically observed 1049-byte JXE Patch.
 * Layout matches sizes in XPS-10 MIDI Implementation but is not proof that
 * JUNO-Di source bytes may be written to XPS-10 destination addresses.
 * No MIDI or SVD/USER writing API is present in this class.
 */
public final class KoaJxePatchLayout {
    public static final int PATCH_BYTES = 1049;
    private static final String[] SECTIONS = {
        "common", "mfx", "chorus", "reverb", "tmt",
        "tone1", "tone2", "tone3", "tone4"
    };
    private static final int[] OFFSETS = {0, 80, 225, 309, 392, 433, 587, 741, 895};
    private static final int[] LENGTHS = {80, 145, 84, 83, 41, 154, 154, 154, 154};
    private KoaJxePatchLayout() {}

    static {
        if (OFFSETS.length != SECTIONS.length || LENGTHS.length != SECTIONS.length)
            throw new IllegalStateException("Mapa JXE incompleto");
        int expected = 0;
        for (int i = 0; i < SECTIONS.length; i++) {
            if (OFFSETS[i] != expected || LENGTHS[i] < 1)
                throw new IllegalStateException("Mapa JXE desalinhado");
            expected += LENGTHS[i];
        }
        if (expected != PATCH_BYTES) throw new IllegalStateException("Tamanho JXE incompatível");
    }

    private static String hash(byte[] source, int start, int count) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        digest.update(source, start, count);
        StringBuilder out = new StringBuilder(64);
        for (byte b : digest.digest()) out.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        return out.toString();
    }

    /** Preview the exact observed layout. Never constructs or sends SysEx packets. */
    public static JSONObject inspect(byte[] source, int patchStart) throws Exception {
        if (source == null || patchStart < 0 || patchStart > source.length - PATCH_BYTES)
            throw new IOException("Registro de Patch incompleto");
        JSONArray components = new JSONArray(), mismatches = new JSONArray();
        int checked = 0, passed = 0, mismatched = 0;
        for (int index = 0; index < SECTIONS.length; index++) {
            final String section = SECTIONS[index];
            final int relative = OFFSETS[index], length = LENGTHS[index];
            final int absolute = patchStart + relative;
            int[] values = new int[length];
            for (int i = 0; i < length; i++) {
                values[i] = source[absolute+i] & 0xff;
                if (values[i] > 127)
                    throw new IOException("Dado JXE acima da faixa MIDI de 7 bits em " + section);
            }
            // Structural checks are cross-checked with the existing XPS-10 map.
            int expectedSize = -1;
            if (section.equals("common")) expectedSize = PatchParameters.block("common",0,1).size;
            else if (section.equals("tmt")) expectedSize = PatchParameters.block("tmt",0,1).size;
            else if (section.startsWith("tone")) expectedSize = PatchParameters.block("tone",0,Integer.parseInt(section.substring(4))).size;
            else if (section.equals("mfx")) expectedSize = XpsProtocol.block("mfx",0).size;
            else if (section.equals("chorus")) expectedSize = XpsProtocol.block("chorus",0).size;
            else if (section.equals("reverb")) expectedSize = XpsProtocol.block("reverb",0).size;
            if (expectedSize != length)
                throw new IOException("Bloco " + section + " diverge do mapa interno XPS-10");

            // Only Common/TMT/Tones have parameter-level definitions for a
            // deeply edited patch. FX match by block SIZE, not address/content.
            String mapSection = section.startsWith("tone") ? "tone" : section;
            int verifiedInBlock = 0, mismatchesInBlock = 0;
            if (mapSection.equals("common") || mapSection.equals("tmt") || mapSection.equals("tone")) {
                for (PatchParameters.Def def : PatchParameters.all()) {
                    if (!def.section.equals(mapSection)) continue;
                    checked++;
                    try {
                        PatchParameters.decode(def, values, def.offset);
                        passed++;verifiedInBlock++;
                    } catch (IllegalArgumentException problem) {
                        mismatched++;mismatchesInBlock++;
                        if (mismatches.length() < 32) {
                            JSONArray actual = new JSONArray();
                            for (int i = 0; i < def.width && def.offset + i < values.length; i++)
                                actual.put(values[def.offset+i]);
                            mismatches.put(new JSONObject()
                                .put("section", section).put("parameter", def.id)
                                .put("offset", def.offset).put("actualBytes", actual)
                                .put("reason", "Incompatível com a faixa/codificação atual do XPS-10"));
                        }
                    }
                }
            }
            components.put(new JSONObject()
                .put("section", section).put("relativeOffset", relative)
                .put("absoluteOffset", absolute).put("bytes", length)
                .put("sha256Block", hash(source, absolute, length))
                .put("parametersChecked", verifiedInBlock + mismatchesInBlock)
                .put("parametersInRange", verifiedInBlock)
                .put("parametersToReview", mismatchesInBlock)
                .put("hasProvenSysExDestination", false));
        }
        return new JSONObject()
            .put("byteLength", PATCH_BYTES)
            .put("components", components)
            .put("parameterChecks", checked)
            .put("parameterChecksInRange", passed)
            .put("parameterChecksToReview", mismatched)
            .put("exampleMismatches", mismatches)
            .put("effectBlocksVerifiedBySizeOnly", true)
            .put("midiDeviceReadbackValidated", false)
            .put("safeToTransmit", false)
            .put("safeToWriteUserMemory", false)
            .put("safeToModifySvd", false)
            .put("status", "Candidato estrutural completo; ainda exige validação de SysEx e leitura do instrumento");
    }
}
