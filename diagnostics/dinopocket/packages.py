"""Check every archive layer and compare compiled runtime and resource budgets."""
import argparse, collections, hashlib, io, json, pathlib, re, zipfile

def checked(data):
 z=zipfile.ZipFile(io.BytesIO(data));assert z.testzip() is None,'CRC failure'
 names=z.namelist();assert len(names)==len(set(names)),'Duplicate paths'
 for n in names:
  p=pathlib.PurePosixPath(n);assert not p.is_absolute() and '..' not in p.parts,n
 for n in z.infolist():assert n.compress_type in (0,8) and not n.flag_bits&1,'Unsupported/encrypted ZIP'
 return z

def inspect(path):
 b=pathlib.Path(path).read_bytes();outer=checked(b);m=json.loads(outer.read('manifest.json'));assert m['configVersion']=='v3';assert len(m['zpks'])==1
 e=m['zpks'][0];payload=outer.read(e['name']);assert hashlib.md5(payload).hexdigest()==e['md5']==pathlib.Path(e['name']).stem,'ZPK digest mismatch'
 checked(outer.read(m['bundleInfo']['csc']));zpk=checked(payload);assert set(zpk.namelist())=={'device.zip','app-side.zip'}
 device=checked(zpk.read('device.zip'));side=checked(zpk.read('app-side.zip'));app=json.loads(device.read('app.json'))
 return {'path':str(path),'sha256':hashlib.sha256(b).hexdigest(),'zab_bytes':len(b),'zpk_bytes':len(payload),'device_zip_bytes':len(zpk.read('device.zip')),'device_uncompressed_bytes':sum(x.file_size for x in device.infolist()),'entries':len(device.infolist()),'compression':dict(collections.Counter(x.compress_type for x in device.infolist())),'manifest':m,'device_app':app,'crc_all_layers':'PASS'},device,side

def main():
 p=argparse.ArgumentParser();p.add_argument('baseline');p.add_argument('other');p.add_argument('--strict',action='store_true');p.add_argument('--report',required=True);a=p.parse_args()
 base,bd,bs=inspect(a.baseline);other,od,os=inspect(a.other)
 normalize=lambda b: re.sub(rb'/tmp/zpm-[A-Za-z0-9]{6}',b'/tmp/zpm-XXXXXX',b)
 runtime={n:normalize(bd.read(n))==normalize(od.read(n)) for n in ('app.bin','page/index.bin')}
 runtime.update({n:bs.read(n)==os.read(n) for n in ('setting.js','app-side.js')})
 changed=[n for n in bd.namelist() if n in od.namelist() and not n.endswith('/') and bd.read(n)!=od.read(n)]
 report={'baseline':base,'comparison':other,'compiled_runtime_identical':runtime,'changed_device_files':changed,'physical_install':'NOT_TESTED','bridge_root_cause':'UNCONFIRMED; CRC/MD5 valid does not prove device unzip succeeds'}
 if a.strict:
  assert all(runtime.values()),runtime
  assert set(bd.namelist())==set(od.namelist()),'Package file set changed'
  assert other['device_uncompressed_bytes']<=base['device_uncompressed_bytes']+1024,'Resource budget grew'
 pathlib.Path(a.report).write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({k:report[k] for k in ('compiled_runtime_identical','physical_install','bridge_root_cause')},indent=2))
if __name__=='__main__':main()
