import hashlib, io, json, pathlib, sys, zipfile

def checked(data):
    z=zipfile.ZipFile(io.BytesIO(data))
    assert z.testzip() is None, 'CRC failure'
    assert len(z.namelist())==len(set(z.namelist())), 'Duplicate entries'
    for n in z.namelist():
        p=pathlib.PurePosixPath(n)
        assert not p.is_absolute() and '..' not in p.parts
    return z

root=pathlib.Path(sys.argv[1]);files=list((root/'app/dist').rglob('*.zab'))
assert len(files)==1, files
data=files[0].read_bytes();outer=checked(data)
manifest=json.loads(outer.read('manifest.json'))
assert manifest['configVersion']=='v3'
assert len(manifest['zpks'])==1
entry=manifest['zpks'][0];payload=outer.read(entry['name'])
assert hashlib.md5(payload).hexdigest()==entry['md5']==pathlib.Path(entry['name']).stem
checked(outer.read(manifest['bundleInfo']['csc']))
zpk=checked(payload);device=checked(zpk.read('device.zip'));checked(zpk.read('app-side.zip'))
app=json.loads(device.read('app.json'))
assert app['app']['appId']==29318764
assert app['app']['version']=={'code':16,'name':'1.5.9'}, app['app']['version']
assert device.read('page/index.bin') and device.read('app.bin')
report={'package':files[0].name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),
        'app_id':29318764,'version':'1.5.9','code':16,'crc_all_layers':'PASS',
        'installation':'PENDING_DEVICE_CONFIRMATION','update_root_cause':'UNCONFIRMED'}
(root/'package-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
