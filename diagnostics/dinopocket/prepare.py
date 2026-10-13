"""Reconstruct immutable sources; apply only limb geometry, never saved data."""
import argparse, hashlib, importlib.util, io, json, pathlib, subprocess, zipfile
from PIL import Image
BASE='74ad38a283df6d6799a2f1995981a894be99ebab'
FAILED='f6ee5118be3a3d8371660ff03d198c540a55bac3'
def extract(ref, target):
    data=subprocess.check_output(['git','show',ref+':DinoPocket_Bip6_PRONTO_PARA_NUVEM.zip'])
    z=zipfile.ZipFile(io.BytesIO(data)); assert z.testzip() is None
    assert all(not pathlib.PurePosixPath(n).is_absolute() and '..' not in pathlib.PurePosixPath(n).parts for n in z.namelist())
    target.mkdir(parents=True,exist_ok=False); z.extractall(target)
    return target

def fix(root):
    script=root/'scripts/make_v15_sprites.py'; text=script.read_text()
    # Keep body, eyes, mouth, feet, effects, canvas, timing and scale unchanged.
    replacements={
      'poly([(46,33),(35,26),(32,20),(37,18),(42,24),(51,30)],skin)': 'poly([(40,38),(32,33),(28,26),(32,24),(37,30),(45,35)],skin)',
      'poly([(65,33),(80,24),(84,18),(87,24),(79,35)],skin)': 'poly([(65,40),(80,38),(87,31),(91,26),(93,30),(88,39),(73,44)],skin)',
      'poly([(62,34),(73,37),(81,34),(81,40),(70,43)],skin)': 'poly([(62,40),(73,43),(81,41),(81,47),(70,47)],skin)',
      'poly([(48,32),(60,35),(58,41),(49,39)],skin)': 'poly([(41,37),(51,39),(53,43),(43,44)],skin)',
      'poly([(65,32),(73,35),(73,39),(61,41)],skin)': 'poly([(64,40),(73,40),(73,44),(62,45)],skin)',
      'poly([(61,36),(71,37),(80,31),(82,35),(73,44),(63,42)],skin)': 'poly([(62,40),(72,42),(80,35),(82,39),(74,46),(63,45)],skin)',
      'ell((41,32,50,40),skin)': 'ell((38,36,47,43),skin)',
      'ell((63,34,73,41),skin)': 'ell((62,40,73,46),skin)',
      'line([(45,39),(43,41)],spike,1)': 'line([(42,41),(40,43)],spike,1)',
      'line([(68,39),(69,41)],spike,1)': 'line([(68,44),(69,46)],spike,1)',
      'ell((81,27,93,39),skin)': 'ell((81,34,93,46),skin)',
      'for y in (30,34):line([(84,y),(90,y)],spike,1)': 'for y in (37,41):line([(84,y),(90,y)],spike,1)',
      'poly([(81,38),(80,19),(83,18),(85,29),(86,17),(88,17),(89,30),(90,20),(92,21),(92,38)],skin)': 'poly([(81,45),(80,26),(83,25),(85,36),(86,24),(88,24),(89,37),(90,27),(92,28),(92,45)],skin)',
      'poly([(80,39),(80,27),(78,19),(81,18),(85,28),(87,16),(90,16),(88,30),(94,36),(91,40)],skin)': 'poly([(80,46),(80,34),(78,26),(81,25),(85,35),(87,23),(90,23),(88,37),(94,43),(91,47)],skin)',
      'line([(82,31),(87,36)],spike,1)': 'line([(82,38),(87,43)],spike,1)',
    }
    for old,new in replacements.items():
        assert text.count(old)==1,old
        text=text.replace(old,new)
    spec=importlib.util.spec_from_file_location('baseline_sprites',script)
    original=importlib.util.module_from_spec(spec);spec.loader.exec_module(original)
    namespace={'__file__':str(script),'__name__':'limb_patch'};exec(compile(text,str(script),'exec'),namespace)
    changed=[]
    for stem in original.STEMS:
      for pose in original.POSES:
        for frame,tick in enumerate((0,2,4,6)):
          path=root/'assets/390x450-bip6/anim'/stem/pose/f'frame_{frame}.png'
          before=Image.open(path).convert('RGBA'); expected=original.render(stem,pose,tick)
          assert before.tobytes()==expected.tobytes(),str(path)
          after=namespace['render'](stem,pose,tick)
          assert after.size==before.size==(288,164)
          # Upper face is outside the permitted limb edit region.
          assert after.crop((0,0,288,40)).tobytes()==before.crop((0,0,288,40)).tobytes()
          if before.tobytes()!=after.tobytes():
            after.save(path,optimize=True);changed.append(str(path.relative_to(root)))
    # Renderer is fixed too, but its main() still generates 8 frames; do not use
    # it for builds. This patch maps only the existing four baseline frames.
    script.write_text(text)
    return changed

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',default='build-audit');p.add_argument('--candidate',action='store_true');p.add_argument('--watch-control-passed',action='store_true');a=p.parse_args()
    out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
    root=extract(BASE,out/'control');extract(FAILED,out/'failed')
    changed=fix(extract(BASE,out/'limb-preview'))
    # Exact runtime and storage bytes are mandatory, not just matching schema.
    protected=['app.js','app.json','page/index.js','app-side/index.js','setting/index.js']
    for f in protected:
      if (root/f).exists(): assert (root/f).read_bytes()==(out/'limb-preview'/f).read_bytes(),f
    for f in root.rglob('*.js'):
      if 'tests' not in f.parts:assert f.read_bytes()==(out/'limb-preview'/f.relative_to(root)).read_bytes(),str(f)
    report={'baseline_commit':BASE,'failed_commit':FAILED,'changed_sprites':changed,'runtime_identical':True,'app_id':29318764,'candidate_built':False}
    if a.candidate:
      assert a.watch_control_passed,'Physical control success is required before a candidate build'
      candidate=out/'limb-preview';app=json.loads((candidate/'app.json').read_text());app['app']['version']={'code':15,'name':'1.5.2-limbfix'};(candidate/'app.json').write_text(json.dumps(app,indent=2)+'\n')
      pkg=json.loads((candidate/'package.json').read_text());pkg['version']='1.5.2-limbfix';(candidate/'package.json').write_text(json.dumps(pkg,indent=2)+'\n')
      report['candidate_build_authorized']=True
    (out/'source-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(f'{len(changed)} limb-only frames; runtime/storage identical; 288x164 retained')
if __name__=='__main__':main()
