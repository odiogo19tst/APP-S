"""Extract interoperability facts only from the user-supplied editor; no executable/artwork is distributed."""
import re,json,sys,html,pathlib,hashlib
raw=pathlib.Path(sys.argv[1]).read_bytes();text=raw.decode('latin1')
def tag(s,n):
 m=re.search(r'<'+n+r'>(.*?)</'+n+r'>',s,re.S);return html.unescape(m[1].strip()) if m else ''
scope=next(v for v in re.findall(r'<structType>(.*?)</structType>',text,re.S) if tag(v,'type')=='PatchCommonMFX')
values={tag(v,'name'):v for v in re.findall(r'<value>(.*?)</value>',scope,re.S)}
tables={tag(v,'name'):[x.strip() for x in tag(v,'table').split(',')] for v in re.findall(r'<stringTable>(.*?)</stringTable>',text,re.S)}
refs={}
for c in re.findall(r'<control>(.*?)</control>',text,re.S):
 ref=tag(c,'valueRef');t=tag(c,'stringTableRef')
 if ref.startswith('$mfx.') and t in tables:refs[ref[5:]]=tables[t]
paths=tables['mfxValuePathTable'];groups=[];group=[]
for item in paths:
 if item=='DELIMITER':groups.append(group);group=[]
 elif item:group.append(item)
assert len(groups)>=79
out=[[]];bounds=[]
for effect,group in enumerate(groups[1:79],1):
 params=[]
 for path in group:
  name=path[4:];v=values[name];assert tag(v,'type')=='int4x4'
  a=[int(x,16) for x in tag(v,'address').split()];offset=a[0]*128+a[1];lo,hi=map(int,tag(v,'range').split(','));default=int(tag(v,'default'));assert (offset-17)%4==0 and 17<=offset<=141 and 12768<=lo<=hi<=52768, (name,offset,lo,default,hi)
  default=max(lo,min(hi,default))
  p={'id':name,'label':re.sub(r'([a-z])([A-Z])',r'\1 \2',name.split('-',1)[1]),'parameter':(offset-17)//4,'min':lo,'max':hi,'default':default}
  labels=refs.get(name)
  if labels and lo>=32768 and len(labels)>=hi-32768+1:p['labels']=labels[lo-32768:hi-32768+1]
  params.append(p);bounds.append((effect,p['parameter'],lo,hi))
 assert len({p['parameter'] for p in params})==len(params)
 out.append(params)
base=pathlib.Path(__file__).resolve().parents[1]
pool=[];lookup={};compact=[]
for params in out:
 rows=[]
 for p in params:
  key=json.dumps(p.get('labels'));index=-1
  if 'labels' in p:
   if key not in lookup:lookup[key]=len(pool);pool.append(p['labels'])
   index=lookup[key]
  rows.append([p['id'],p['parameter'],p['min'],p['max'],index])
 compact.append(rows)
(base/'app/src/main/assets/mfx-params.js').write_text('// Interoperability metadata; scripts/extract_mfx.py.\n(()=>{const labels='+json.dumps(pool,separators=(',',':'))+';window.XPS_MFX_PARAMS='+json.dumps(compact,separators=(',',':'))+'.map(ps=>ps.map(([id,parameter,min,max,table])=>({id,label:id.split(\"-\").slice(1).join(\"-\").replace(/([a-z])([A-Z])/g,\"$1 $2\"),parameter,min,max,...(table>=0?{labels:labels[table]}:{})})));})();\n')
java='package br.com.doapps.grauelive;\n/** Bounds extracted from the supplied editor; addresses verified against Roland MIDI e01. */\npublic final class MfxParameters {\n private static final int[][] RANGES={'+','.join('{'+','.join(map(str,b))+'}' for b in bounds)+'};\n public static int address(int unit,int type,int parameter,int value){if(unit<0||unit>2)throw new IllegalArgumentException("Unidade MFX inválida");for(int[] r:RANGES)if(r[0]==type&&r[1]==parameter&&value>=r[2]&&value<=r[3])return XpsProtocol.block("mfx",unit).start+17+4*parameter;throw new IllegalArgumentException("Parâmetro MFX fora da faixa documentada");}\n public static int[] nibbles(int v){return new int[]{(v>>12)&15,(v>>8)&15,(v>>4)&15,v&15};}\n}\n'
(base/'app/src/main/java/br/com/doapps/grauelive/MfxParameters.java').write_text(java)
print('Effects:',len(out)-1,'parameters:',len(bounds),'source SHA256:',hashlib.sha256(raw).hexdigest())
