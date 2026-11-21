'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app/src/main');
const java=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/ToneFileInspector.java'),'utf8');
const activity=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const ux=fs.readFileSync(path.join(root,'assets/ux-v2.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/layout-v3.css'),'utf8');
const expected=[
 'public final class ToneFileInspector','MAX_PROBE = 65536','probe(byte[] data',
 '"canApplyToKeyboard", false','"convertedToPatch", false','"convertedToPerformance", false',
 '"midiSent", false','"userWrite", false',
 '"JXE_BINARY_OR_UNKNOWN"','"SMF_HEADER_VALID"','"SVD_HEADER"','"ZIP_CONTAINER"',
 'at(data,length,0,"MThd")','be32(data,4) == 6','be16(data,10) > 0',
 '"O cabeçalho SMF é plausível, mas o conteúdo SysEx e o modelo Roland NÃO foram validados."',
 '"Não renomear JXE como SVD nem executar WRITE USER a partir deste relatório."',
 'public static JSONObject analyze(File original',
 'try (FileInputStream in = new FileInputStream(original))'
];
for(const item of expected)assert(java.includes(item),'Missing guarded diagnostic: '+item);
assert(!java.includes('editHardware(')&&!java.includes('writePatch(')&&!java.includes('sendMidi('),'Probing must have zero MIDI transmission');
assert(activity.includes('public void inspectStoreToneFile(String sha)'));
assert(activity.includes('toneImports.file(sha)'),'Only verified immutable originals may be analyzed');
assert(activity.includes('emit("toneFileInspection",report)'));
assert(ux.includes('id="gx-store-binary-report"'));
assert(ux.includes('id="gx-store-binary-data"'));
assert(ux.includes('id="gx-store-export-report"'));
assert(ux.includes("analyzeButton.textContent='Analisar JXE/MIDI'"));
assert(ux.includes('window.Native.inspectStoreToneFile(String(item.sha256'));
assert(ux.includes("kind==='toneFileInspection'"));
assert(ux.includes("window.Native.exportFile(JSON.stringify(toneFileReport,null,2))"));
assert(css.includes('.gx-store-binary-report'));
console.log('JXE research: bounded-read, SMF header check, immutable source, no MIDI/USER write, exportable JSON PASS');


const koa=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/KoaJxeCatalog.java'),'utf8');
for(const expected of [
 'public final class KoaJxeCatalog','FILE_SIZE = 336127','PREAMBLE = 2425','PATCH_SIZE = 1049',
 'RHYTHM_SIZE = 17490','MAIN_SLOTS = 16','EXTRA_SLOTS = 2','RHYTHM_NOTE_SLOTS = 88',
 'RHYTHM_NOTE_SIZE = 195','RHYTHM_COMMON_SIZE = 330','KoaDataFile00001fm',
 'JUNO-Di         ','static boolean isKoaJunoDi','static JSONObject parse(byte[] data)',
 'printableName(data, 328, 12)','distinctPatchRecords','distinctRhythmRecords',
 '"canApplyToKeyboard", false','"canConvertToPerformance", false','"canUpdateSvdBackup", false',
 'MessageDigest.getInstance("SHA-256")','"empirical_one_sample"'
])assert(koa.includes(expected),'Koa JXE read-only layout probe is missing: '+expected);
assert(!koa.includes('sendMidi(')&&!koa.includes('editHardware(')&&!koa.includes('WRITE_USER'),
 'JXE layout recognition must never issue MIDI or USER WRITE');
assert(java.includes('KoaJxeCatalog.isKoaJunoDi(prefix)'));
assert(java.includes('report.put("koa", KoaJxeCatalog.parse(complete))'));
assert(java.includes('report.put("identifiedAs", "KOA_JUNO_DI_EDITOR_STATE")'));
assert(java.includes('original.length() == KoaJxeCatalog.FILE_SIZE'),
 'Unknown JXE variants must never be parsed with the empirical fixed offsets');
assert(ux.includes('id="gx-store-koa-inventory"'));
assert(ux.includes('function renderKoaInventory(report)'));
assert(ux.includes('renderKoaInventory(toneFileReport)'));
assert(ux.includes('performanceNameCandidate'));
assert(ux.includes('koa.patches.slice(0,24)'));
assert(ux.includes('koa.rhythms.slice(0,24)'));
assert(css.includes('.gx-store-koa-inventory'));
console.log('Koa JXE catalog: empirical 18 patch and 18 rhythm records, read-only preview and no MIDI PASS');


const layout=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/KoaJxePatchLayout.java'),'utf8');
for(const marker of [
 'public final class KoaJxePatchLayout','PATCH_BYTES = 1049',
 '0, 80, 225, 309, 392, 433, 587, 741, 895',
 '80, 145, 84, 83, 41, 154, 154, 154, 154',
 'PatchParameters.block("common",0,1).size',
 'PatchParameters.block("tmt",0,1).size',
 'PatchParameters.block("tone",0,Integer.parseInt(section.substring(4))).size',
 'XpsProtocol.block("mfx",0).size',
 'XpsProtocol.block("chorus",0).size',
 'XpsProtocol.block("reverb",0).size',
 'PatchParameters.decode(def, values, def.offset)',
 '"parameterChecksToReview"','"exampleMismatches"',
 '"effectBlocksVerifiedBySizeOnly", true',
 '"midiDeviceReadbackValidated", false',
 '"safeToTransmit", false','"safeToWriteUserMemory", false','"safeToModifySvd", false'
])assert(layout.includes(marker),'Missing deterministic pre-transmission check: '+marker);
assert(koa.includes('KoaJxePatchLayout.inspect(data, off)'), 'Every patch must include full segmented compatibility preflight');
assert(!layout.includes('packet(')&&!layout.includes('editHardware(')&&!layout.includes('sendMidi('),
 'Pre-conversion must never construct a packet or transmit MIDI');
assert(ux.includes('Ver 9 blocos do Patch e alertas'));
assert(ux.includes('layout.parameterChecksToReview'));
assert(ux.includes('layout.components.slice(0,9)'));
console.log('Koa 1.36.1: exact 80/145/84/83/41/4×154 segmentation, spec ranges, no MIDI PASS');

const compatibility=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/KoaJxeCompatibility.java'),'utf8');
for(const marker of [
 'public final class KoaJxeCompatibility','KoaJxePatchLayout.PATCH_BYTES',
 'PatchParameters.decode(def, block, start)','"parameterSamples"',
 '"samplesOutOfRange"','"zeroLfoStepValues"','"requiresWaveTableVerification", true',
 '"requiresEffectMapVerification", true','"requiresLiveReadback", true',
 '"sysExConversionValidated", false','"canTransmitMidi", false',
 '"canWriteUser", false','"canModifySvd", false'
]) assert(compatibility.includes(marker),'Missing JXE compatibility guard: '+marker);
assert(!/sendMidi\s*\(|editHardware\s*\(|XpsProtocol\.packet\s*\(|WRITE_USER/.test(compatibility),
 'Compatibility preview must not use MIDI transmission/write code');
assert(koa.includes('entry.put("compatibility", KoaJxeCompatibility.inspect(data, off))'));
assert(ux.includes('Prévia dos parâmetros WG, TVF, TVA, LFO e alertas'));
assert(ux.includes('preview.parameterSamples.slice(0,80)'));
console.log('Koa 1.36.2: read-only per-tone preview, LFO anomalies, wave/effect warnings PASS');
