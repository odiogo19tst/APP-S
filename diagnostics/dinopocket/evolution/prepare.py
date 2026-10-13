"""Rebuild 1.5.9 only from the immutable, hash-checked 1.5.8 archive."""
import argparse, hashlib, json, pathlib, subprocess, zipfile

BASE = 'f6ee5118be3a3d8371660ff03d198c540a55bac3'
BASE_SHA256 = 'f21af3225411a68bc499e05257e54e1516cd26ee732fce49b621d519e8fe2b2e'
SOURCE = 'DinoPocket_Bip6_PRONTO_PARA_NUVEM.zip'
HERE = pathlib.Path(__file__).resolve().parent

def replace_once(text, old, new):
    assert text.count(old) == 1, f'Unexpected base for replacement: {old[:70]}'
    return text.replace(old, new, 1)

def prepare(archive, out):
    data = archive.read_bytes()
    assert hashlib.sha256(data).hexdigest() == BASE_SHA256, 'Base ZIP differs from required commit'
    out.mkdir(parents=True, exist_ok=False)
    with zipfile.ZipFile(archive) as z:
        original = {i.filename:z.read(i) for i in z.infolist() if not i.is_dir()}
        for name in original:
            assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
        z.extractall(out)
    manifest_path=out/'app.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    assert manifest['app']['appId']==29318764 and manifest['app']['version']=={'code':14,'name':'1.5.8'}
    manifest['app']['version']={'code':16,'name':'1.5.9'}
    manifest['app']['description']='DinoPocket 1.5.9: avanço manual de uma fase em Menu > Mais > Testes.'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    pkg_path=out/'package.json'
    pkg=json.loads(pkg_path.read_text(encoding='utf-8'));pkg['version']='1.5.9'
    pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    page=out/'page/index.js'
    text=page.read_text(encoding='utf-8')
    text=replace_once(text,"import { LocalStorage } from '@zos/storage'", "import { LocalStorage } from '@zos/storage'\nimport { advanceForTest } from '../src/advance_for_test'")
    text=replace_once(text,"  tap('RELOGIO',48,282,294,43,()=>go('clock'))", "  tap('RELOGIO',48,282,294,43,()=>go('clock'))\n  tap('TESTES',48,333,294,35,()=>go('tests'),false,15)")
    text=replace_once(text,'function alertSettings(){', '''function testsScreen(){
  backdrop('TESTES DE EVOLUCAO')
  const phases=['OVO','BEBE','FILHOTE','JOVEM','ADULTO']
  txt('FASE: '+phases[pet.stage],43,91,304,35,22)
  txt('Cada toque avanca uma fase.',43,146,304,30,17)
  txt('Cuidados e conquistas mantidos.',38,183,314,30,16)
  if(pet.dead) txt('Dino sem vida: teste indisponivel.',38,251,314,40,16)
  else if(pet.stage>=4) txt('ADULTO - ciclo concluido.',38,251,314,40,18)
  else tap('AVANCAR EVOLUCAO',43,246,304,54,()=>{
    const prior=pet
    pet=adjustNaturalEvolution(prior,advanceForTest(pet,Date.now()),dinoConfig)
    save();render()
  },false,16)
  bottom('MAIS','more')
}
function alertSettings(){''')
    text=replace_once(text,"  else if(screen==='more') moreScreen()", "  else if(screen==='more') moreScreen()\n  else if(screen==='tests') testsScreen()")
    page.write_text(text,encoding='utf-8')
    (out/'src/advance_for_test.js').write_bytes((HERE/'advance_for_test.js').read_bytes())
    (out/'tests/evolution.test.js').write_bytes((HERE/'evolution.test.js').read_bytes())
    test=out/'tests/features_v15.test.js'
    test.write_text(replace_once(test.read_text(encoding='utf-8'),"app.app.version.name,'1.5.8'","app.app.version.name,'1.5.9'"),encoding='utf-8')
    allowed={'app.json','package.json','page/index.js','tests/features_v15.test.js'}
    changed=[name for name,content in original.items() if (out/name).read_bytes()!=content]
    assert set(changed)==allowed, changed
    report={'base_commit':BASE,'base_zip_sha256':BASE_SHA256,'app_id':29318764,'version':'1.5.9','code':16,
            'changed_base_files':changed,'unchanged_base_files':len(original)-len(changed),
            'save_key':'dinopocket.state.v1','schema':1}
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base-zip',type=pathlib.Path);p.add_argument('--out',type=pathlib.Path,required=True)
    a=p.parse_args()
    archive=a.base_zip
    if archive is None:
        archive=a.out.parent/'base-1.5.8.zip'
        assert not archive.exists(), 'Use a new output area'
        archive.parent.mkdir(parents=True,exist_ok=True)
        archive.write_bytes(subprocess.check_output(['git','show',BASE+':'+SOURCE]))
    report=prepare(archive,a.out)
    (a.out.parent/'provenance.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
