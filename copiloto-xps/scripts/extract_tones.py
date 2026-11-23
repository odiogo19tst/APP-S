"""Extract factual bank/program lookup from Roland XPS-10 Tone List eng02.
Usage: python extract_tones.py /path/to/XPS-10_ToneList_eng02_W.pdf
Requires PyMuPDF. PDF is not redistributed.
"""
import fitz,re,json,sys
from pathlib import Path
rows=[]
for page in fitz.open(sys.argv[1]):
 for rect in [fitz.Rect(0,0,297,842),fitz.Rect(297,0,596,842)]:
  words=page.get_text('words',clip=rect);groups=[]
  for w in sorted(words,key=lambda w:(w[1],w[0])):
   if not groups or abs(w[1]-groups[-1][0])>2:groups.append([w[1],[]])
   groups[-1][1].append(w)
  for _,g in groups:
   line=' '.join(w[4] for w in sorted(g,key=lambda w:w[0]))
   m=re.fullmatch(r'(\d+)\s+([A-Za-z]{2}\d{3})\s+(.+?)\s+([A-Z]+)\s+(\d+)\s+(\d+)(?:\s+(\d+))?',line)
   drum=re.fullmatch(r'(\d+)\s+(Dr\d{3})\s+(.+?)\s+(086|120)\s+(\d+)\s+(\d+)',line)
   if drum:
    num,code,name,msb,lsb,pc=drum.groups();rows.append((num,code,name,'DRM',msb,lsb,pc))
   elif m:rows.append(m.groups())
rows.sort(key=lambda r:int(r[0]));assert [int(r[0]) for r in rows]==list(range(1,1565));tones=[];last=None
for number,code,name,category,msb,lsb,pc in rows:
 if pc:last=int(pc)
 if last is None:raise ValueError('Missing PC before '+code)
 tones.append(dict(code=code,name=name,category=category,msb=int(msb),lsb=int(lsb),program=last))
assert len({t['code'] for t in tones})==len(tones)
assert all(0<=t['msb']<=127 and 0<=t['lsb']<=127 and 1<=t['program']<=128 for t in tones)
out=Path(__file__).resolve().parents[1]/'app/src/main/assets/tones-data.js'
out.write_text('// Factual MIDI lookup: Roland XPS-10 Tone List eng02 (2017).\n// https://static.roland.com/assets/media/pdf/XPS-10_ToneList_eng02_W.pdf\nwindow.XPS_TONES='+json.dumps([[t[k] for k in ['code','name','category','msb','lsb','program']] for t in tones],ensure_ascii=False,separators=(',',':'))+'.map(([code,name,category,msb,lsb,program])=>({code,name,category,msb,lsb,program}));\n')
print('Tones:',len(tones),'first:',tones[:2],'last:',tones[-2:])
