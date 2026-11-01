'use strict';
const assert=require('node:assert/strict');
const motion=require('../app/src/main/assets/score-motion');
function roundedElement(){let top=0;return {scrollHeight:1000,clientHeight:100,get scrollTop(){return top;},set scrollTop(v){top=Math.round(Math.max(0,Math.min(900,v)));}};}
const a=roundedElement(),advance=motion.create();
for(let i=0;i<600;i++)advance(a,1/60);
assert.equal(a.scrollTop,10,'1 px/s must advance even when Android rounds scrollTop');
a.scrollTop=200;advance(a,0.2);assert.equal(a.scrollTop,200,'Manual scroll must reset stale progress');
for(let i=0;i<60;i++)advance(a,1/60);
assert.equal(a.scrollTop,201,'Slow scrolling must resume at the manual position');
const b=roundedElement();b.scrollTop=20;advance(b,1);assert.equal(b.scrollTop,21,'Switching between repertoire and stage preserves each position');
advance(b,5000);assert.equal(b.scrollTop,900,'Stop exactly at the bottom');
console.log('Score motion: integer WebView, 1 px/s, manual scrolling, stage switch and bottom passed');
