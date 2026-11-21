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
