const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../app/src/main/assets');
const css=fs.readFileSync(path.join(dir,'ux-v2.css'),'utf8');
const ui=fs.readFileSync(path.join(dir,'ux-v2.js'),'utf8');
assert(ui.includes('id="gx-perf-name"'));
assert(ui.includes('id="gx-performance-source"'));
for(const token of [
 '#gx-shell .gx-perf-row{',
 'display:grid;',
 'grid-template-columns:repeat(2,minmax(0,1fr))',
 '#gx-shell .gx-perf-row > #gx-perf-name{',
 'grid-column:1/-1;',
 'overflow-wrap:break-word;',
 'word-break:normal;',
 '#gx-shell .gx-perf-row > #gx-performance-source{',
 'min-height:44px;',
 '@media (min-width:850px) and (orientation:landscape)'
])assert(css.includes(token),'Missing portrait/landscape overflow protection: '+token);
const tail=css.slice(css.lastIndexOf('/* 1.14'));
assert(!tail.includes('overflow-wrap:anywhere'),'Performance name must never force per-letter wrapping');
console.log('Grauê 1.14: card da Performance não comprime nome para uma letra por linha');
