'use strict';
// Simulated landmark-sequence tests; real-camera testing is still required.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
class Element {
  constructor(value='') {this.value=value;this.disabled=false;this.hidden=false;this.textContent='';this.handlers={};}
  addEventListener(type, fn) {(this.handlers[type] ||= []).push(fn);}
}
const dom = {
  'motion-status':new Element(), 'motion-capture-button':new Element(),
  'motion-cancel-button':new Element(), 'letter-select':new Element('J'),
  'start-button':new Element(), 'stop-button':new Element()
};
const listeners = {};
const saved = new Map();
let lastMotion = null;
const window = {
  SignLabPracticeBridge: {isCameraOn:()=>true},
  addEventListener: (t, fn) => (listeners[t] ||= []).push(fn),
  dispatchEvent(event) {if(event.type==='signlab:motion-complete') lastMotion=event.detail; for(const fn of listeners[event.type] || []) fn(event);}
};
const ctx = {window, document:{getElementById:id=>dom[id]},localStorage:{getItem:k=>saved.get(k)||null, setItem:(k,v)=>saved.set(k,v)},
  CustomEvent:class {constructor(type, options){this.type=type;this.detail=options?.detail;}},Math,console,requestAnimationFrame:fn=>fn()};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','motion.js'),'utf8'),ctx);
const motion = window.SignLabMotion;
function landmarks(letter, p) {
  const k = Array.from({length:21},(_,i)=>({x:80+(i%5)*16,y:80+Math.floor(i/5)*20}));
  k[5]={x:75,y:105};k[17]={x:175,y:105};
  k[6]={x:120,y:105};k[8]={x:145,y:155};
  k[18]={x:170,y:125};k[20]={x:170,y:175};
  const pt=letter==='J' ? {x:180-85*p+22*Math.sin(Math.PI*p),y:155+102*p} :
    p<.333?{x:115+105*p*3,y:145}:{x:p<.666?220-105*(p-.333)*3:115+105*(p-.666)*3,y:145+110*p};
  k[letter==='J'?20:8]=pt;
  return k;
}
function train(letter) {
  assert(motion.start(letter,'train'));
  for(let i=0;i<22;i++) motion.onFrame(landmarks(letter,i/21),i*100);
  assert(lastMotion.valid, `Expected a valid ${letter} training recording`);
}
train('J'); train('Z');
assert.equal(motion.getCounts().J,1); assert.equal(motion.getCounts().Z,1);
for (const letter of ['J','Z']) {
  assert(motion.start(letter,'practice'));
  for(let i=0;i<22;i++) motion.onFrame(landmarks(letter,i/21),i*100);
  assert.equal(lastMotion.predictedLetter,letter, `Expected correct recorded motion match for ${letter}`);
}
assert(motion.start('Z','practice'));
for(let i=0;i<22;i++) motion.onFrame(landmarks('Z',0),i*100);
assert.equal(lastMotion.valid,false,'stationary fingertip should be rejected');
motion.reset('J'); assert.equal(motion.getCounts().J,0);
motion.clear(); assert.deepEqual(JSON.stringify(motion.getTrainedMotionLetters()),'[]');
console.log('Passed: J and Z training, synthetic motion matching, stationary rejection, per-letter reset, clear.');
