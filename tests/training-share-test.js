'use strict';
// Simulates browser fetch, localStorage, and training bridges without a webcam.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'training-share.js'), 'utf8');
const staticA = {letter:'A', features:Array(42).fill(0.3)};
const motionJ = {letter:'J', path:Array(48).fill(0.5), shape:[1.1,1.8]};
const starter = {format:'signlab-training', version:1, staticExamples:[staticA], motionExamples:[motionJ]};
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(initialStatic=[], initialMotion=[], response=starter) {
  const saved = new Map();
  let still = [...initialStatic], moving = [...initialMotion], fetchCalls = 0, confirmed=true, exported=null;
  const handlers = {};
  function el(id){return {id,disabled:false,hidden:false, textContent:'', value:'', files:[], handlers:{}, addEventListener(t,fn){(this.handlers[t] ||= []).push(fn);},click(){for(const f of this.handlers.click||[]) f();}, async change(){for(const f of this.handlers.change||[]) await f();}};}
  const dom = Object.fromEntries(['export-training-button','import-training-button','import-training-file','share-training-status'].map(id=>[id,el(id)]));
  const window = {SignLabTrainingBridge:{getExamples:()=>still,replaceExamples: a=>{still=[...a];}}, SignLabMotion:{getExamples:()=>moving,replaceExamples:a=>{moving=[...a];}},confirm:()=>confirmed};
  const context = {window,document:{getElementById:id=>dom[id],createElement:()=>({remove(){},click(){}}),body:{append(){}}},
    localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
    fetch:async ()=>{fetchCalls++;return response?{ok:true,text:async()=>JSON.stringify(response)}:{ok:false};},
    Blob:class {},URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL:()=>{}},setTimeout:fn=>fn(),Date,Math,console};
  vm.runInNewContext(source,context,{filename:'training-share.js'});
  return {dom,window,saved,fetchCalls:()=>fetchCalls,still:()=>still,moving:()=>moving,setConfirmed:b=>{confirmed=b;},exported:()=>exported};
}
(async()=>{
  const fresh=harness();await tick();
  assert.equal(fresh.fetchCalls(),1);
  assert.equal(fresh.still().length,1);
  assert.equal(fresh.moving().length,1);
  assert.equal(fresh.saved.get('signlab-starter-loaded-v1'),'1');
  const existing=harness([staticA]);await tick();
  assert.equal(existing.fetchCalls(),0,'preexisting data must not be overwritten');
  assert.equal(existing.moving().length,0);
  const noFile=harness([],[],null);await tick();
  assert.equal(noFile.still().length,0);
  assert.equal(noFile.saved.has('signlab-starter-loaded-v1'),false);
  const invalid=harness([],[],{...starter,staticExamples:[{letter:'Q',features:[1,2]}]});await tick();
  assert.equal(invalid.still().length,0);
  assert.equal(invalid.saved.has('signlab-starter-loaded-v1'),false);
  const manual=harness([staticA],[],null);await tick();
  manual.dom['import-training-file'].files=[{size:100,text:async()=>JSON.stringify(starter)}];
  manual.setConfirmed(false);
  await manual.dom['import-training-file'].change();
  assert.equal(manual.moving().length,0,'cancel must not overwrite current data');
  manual.setConfirmed(true);
  manual.dom['import-training-file'].files=[{size:100,text:async()=>JSON.stringify(starter)}];
  await manual.dom['import-training-file'].change();
  assert.equal(manual.moving().length,1,'manual import must include J/Z examples');
  assert.equal(manual.saved.get('signlab-starter-loaded-v1'),'1');
  console.log('Passed: first-visit starter load, preserve existing samples, missing/invalid dataset, import confirmation, J/Z import.');
})().catch(e=>{console.error(e);process.exit(1);});
