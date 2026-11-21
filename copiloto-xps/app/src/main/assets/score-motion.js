/* Keep subpixel progress even when a WebView rounds scrollTop to integer pixels. */
(function(root){
 'use strict';
 function create(){
  let node=null,target=0,written=0;
  return function advance(element,pixels){
   if(node!==element||Math.abs(element.scrollTop-written)>1){node=element;target=element.scrollTop;}
   target=Math.max(0,Math.min(element.scrollHeight-element.clientHeight,target+Math.max(0,pixels)));
   element.scrollTop=Math.round(target);
   written=element.scrollTop;
  };
 }
 const api={create};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GraueScoreMotion=api;
})(typeof window==='object'?window:globalThis);
