"""Reconstruct the pinned CarLink source plus the Jarvis changes in a NEW directory."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination',type=Path)
parser.add_argument('--source',help='Optional local mirror for offline reconstruction')
args=parser.parse_args()
package=Path(__file__).resolve().parent
manifest=json.loads((package/'UPSTREAM.json').read_text(encoding='utf-8'))
destination=args.destination.resolve()
if destination.exists(): raise SystemExit('Destination already exists; choose a new directory.')
git=['git']+(['-c','http.sslBackend=openssl'] if os.name=='nt' else [])
def run(*items): subprocess.run([*git,*map(str,items)],check=True)
run('init',destination)
source=str(Path(args.source).resolve()) if args.source else manifest['repository']
run('-C',destination,'fetch','--depth=1',source,manifest['commit'])
run('-C',destination,'checkout','--detach','FETCH_HEAD')
actual=subprocess.check_output([*git,'-C',str(destination),'rev-parse','HEAD'],text=True).strip()
if actual!=manifest['commit']: raise SystemExit('Unexpected upstream revision')
for name,digest in manifest['overlay_sha256'].items():
    source=(package/'changes'/name).resolve()
    target=(destination/name).resolve()
    if not source.is_relative_to(package/'changes') or not target.is_relative_to(destination):
        raise SystemExit('Invalid overlay path')
    if hashlib.sha256(source.read_bytes()).hexdigest()!=digest: raise SystemExit('Overlay checksum mismatch: '+name)
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,target)
run('-C',destination,'add','--all')
run('-C',destination,'-c','user.name=CarLink Jarvis Build','-c','user.email=jarvis-build@local.invalid',
    'commit','-m','Apply Jarvis development overlay from APP-S')
print('Prepared source:',destination)
