package br.com.doapps.grauelive;

import java.io.IOException;
import java.util.Arrays;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Read-only research preview for a specifically identified JUNO-Di Editor JXE
 * record. A numerical value inside an XPS-10 range does NOT establish
 * equivalent waveforms, effects, SysEx destinations, or audible compatibility.
 *
 * Deliberately contains no MIDI transport, packet creation, or USER/SVD writes.
 */
public final class KoaJxeCompatibility {
    private static final int[] OFFSETS = {0, 392, 433, 587, 741, 895};
    private static final int[] LENGTHS = {80, 41, 154, 154, 154, 154};
    private static final String[] SECTIONS = {"common","tmt","tone1","tone2","tone3","tone4"};
    private static final String[] FOCUS = {
        "common_patch_level", "common_patch_pan", "common_matrix_control_1_source",
        "tmt_tmt1_tone_switch", "tmt_tmt1_keyboard_range_lower",
        "tone_wave_number_l_mono", "tone_wave_number_r", "tone_wave_gain",
        "tone_tvf_filter_type", "tone_tvf_cutoff_frequency", "tone_tvf_resonance",
        "tone_tva_env_time_1", "tone_tva_env_time_4",
        "tone_lfo1_waveform", "tone_lfo1_rate", "tone_lfo_step1"
    };

    private KoaJxeCompatibility() {}

    public static JSONObject inspect(byte[] source, int patchStart) throws Exception {
        if (source == null || patchStart < 0 ||
            patchStart > source.length - KoaJxePatchLayout.PATCH_BYTES)
            throw new IOException("Patch JXE incompleto para prévia");
        JSONArray sample = new JSONArray(), warnings = new JSONArray();
        int readable = 0, outOfRange = 0, zeroLfoSteps = 0;
        for (int sectionIndex = 0; sectionIndex < SECTIONS.length; sectionIndex++) {
            final String section = SECTIONS[sectionIndex];
            final String mapSection = section.startsWith("tone") ? "tone" : section;
            final int relative = OFFSETS[sectionIndex], length = LENGTHS[sectionIndex];
            int[] block = new int[length];
            for (int i = 0; i < length; i++) {
                block[i] = source[patchStart + relative + i] & 255;
                if (block[i] > 127) throw new IOException("JXE fora da faixa de 7 bits");
            }
            if (mapSection.equals("tone")) {
                // 0 is outside the XPS-10 stepped-LFO range 28..100. Do not
                // silently coerce zero to 64: it may encode a JUNO-Di default.
                for (int step = 138; step <= 153; step++)
                    if (block[step] == 0) zeroLfoSteps++;
            }
            for (String id : FOCUS) {
                PatchParameters.Def def = PatchParameters.get(id);
                if (!def.section.equals(mapSection)) continue;
                final int start = def.offset;
                int[] raw = Arrays.copyOfRange(block, start, start + def.width);
                JSONObject entry = new JSONObject()
                    .put("section", section)
                    .put("parameter", id)
                    .put("sourceOffset", patchStart + relative + start)
                    .put("rawBytes", new JSONArray(raw));
                try {
                    int value = PatchParameters.decode(def, block, start);
                    entry.put("valueCandidate", value).put("inXpsRange", true);
                    readable++;
                } catch (IllegalArgumentException invalid) {
                    entry.put("valueCandidate", JSONObject.NULL)
                         .put("inXpsRange", false)
                         .put("issue", "Fora da codificação/faixa documentada no mapa XPS-10");
                    outOfRange++;
                }
                // The app intentionally does not calculate a MIDI destination.
                entry.put("sysExDestinationValidated", false);
                sample.put(entry);
            }
        }
        warnings.put("Arquivo originado do estado do editor JUNO-Di, não de uma exportação SysEx XPS-10 validada");
        warnings.put("Índices de ondas PCM podem corresponder a sons diferentes no JUNO-Di e no XPS-10");
        warnings.put("MFX, Chorus e Reverb foram reconhecidos por tamanho, não por semântica ou endereço");
        if (zeroLfoSteps > 0)
            warnings.put(zeroLfoSteps + " valores de LFO Step são zero; fora da faixa XPS-10 de 28..100. Nenhuma correção automática foi aplicada");
        return new JSONObject()
            .put("sourceModel", "JUNO-Di Editor")
            .put("targetModel", "XPS-10")
            .put("comparisonType", "offline_parameter_sample")
            .put("parameterSamples", sample)
            .put("samplesInRange", readable)
            .put("samplesOutOfRange", outOfRange)
            .put("zeroLfoStepValues", zeroLfoSteps)
            .put("requiresWaveTableVerification", true)
            .put("requiresEffectMapVerification", true)
            .put("requiresLiveReadback", true)
            .put("warnings", warnings)
            .put("sysExConversionValidated", false)
            .put("canTransmitMidi", false)
            .put("canWriteUser", false)
            .put("canModifySvd", false);
    }
}
