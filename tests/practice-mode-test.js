'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class Element {
  constructor(id) { this.id=id; this.textContent=''; this.disabled=false; this.hidden=false; this.dataset={}; this.handlers={}; this.src=''; this.alt=''; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  click() { for (const fn of this.handlers.click || []) fn(); }
}
function environment(saved=new Map()) {
 const ids = ['quiz-target','quiz-target-caption','quiz-hint-button','quiz-hint-image','quiz-live-guess','quiz-state-label','quiz-feedback-message','quiz-eligibility','quiz-start-button','quiz-record-motion-button','quiz-check-button','quiz-retry-button','quiz-next-button','quiz-stop-button','quiz-clear-history','quiz-total-attempts','quiz-total-matches','quiz-match-rate','quiz-storage-note'];
 const dom = Object.fromEntries(ids.map(id=>[id,new Element(id)]));
 const handlers={}; let tick=0; let trained=[]; let motion=[]; let camera=false;
 const window = {
  SignLabPracticeBridge:{getTrainedLetters:()=>trained,isCameraOn:()=>camera},
  SignLabMotion:{getTrainedMotionLetters:()=>motion, start:(letter,mode)=>{ window.dispatchEvent({type:'signlab:motion-complete',detail:{mode,target:letter,predictedLetter:letter,valid:true}}); return true; }},
  addEventListener(type,fn) { (handlers[type] ||= []).push(fn); },
  dispatchEvent(e) { (handlers[e.type] || []).forEach(fn=>fn(e)); },
  confirm:()=>true
 };
 const context = {window,document:{getElementById:id=>dom[id]},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}, performance:{now:()=>tick},Date,Math, console,
  CustomEvent: class {constructor(type,opts){this.type=type;this.detail=opts?.detail;}}};
 vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '..', 'practice.js'),'utf8'),context,{filename:'practice.js'});
 return {dom,window,saved,setTick:v=>{tick=v;},setTraining:v=>{trained=v;window.dispatchEvent({type:'signlab:training',detail:{trainedLetters:v}});},setMotion:v=>{motion=v;window.dispatchEvent({type:'signlab:motion-training'});},sendFrame:pred=>{camera=true;window.dispatchEvent({type:'signlab:frame',detail:{cameraOn:true,handVisible:true,predictedLetter:pred}});},cameraOff:()=>{camera=false;window.dispatchEvent({type:'signlab:frame',detail:{cameraOn:false,handVisible:false,predictedLetter:null}});}};
}
let x=environment();
assert(x.dom['quiz-start-button'].disabled,'should require two trained letters');
x.setTraining(['A','B']);
assert(!x.dom['quiz-start-button'].disabled);
x.dom['quiz-start-button'].click();
const t=x.dom['quiz-target'].textContent;
assert(['A','B'].includes(t));
for(let i=0;i<8;i++) x.sendFrame(t);
assert(x.dom['quiz-check-button'].disabled,'no guess can be checked before time threshold');
x.setTick(550);
x.sendFrame(t);
assert(!x.dom['quiz-check-button'].disabled,'steady match enables checking');
x.dom['quiz-check-button'].click();
assert.equal(x.dom['quiz-total-attempts'].textContent,'1');
assert.equal(x.dom['quiz-total-matches'].textContent,'1');
assert.equal(x.dom['quiz-match-rate'].textContent,'100%');
x.dom['quiz-check-button'].click();
assert.equal(x.dom['quiz-total-attempts'].textContent,'1','cannot score twice');
x.dom['quiz-hint-button'].click();
assert.equal(x.dom['quiz-hint-image'].hidden,false);
x.dom['quiz-next-button'].click();
assert.notEqual(x.dom['quiz-target'].textContent,t,'non repeating consecutive target');
let other=x.dom['quiz-target'].textContent;
// The app may guess the wrong class, which must produce an honest mismatch.
x.setTick(1000);
x.sendFrame(t);
x.setTick(1600);
for(let i=0;i<7;i++) x.sendFrame(t);
assert(!x.dom['quiz-check-button'].disabled);
x.dom['quiz-check-button'].click();
assert.equal(x.dom['quiz-total-attempts'].textContent,'2');
assert.equal(x.dom['quiz-total-matches'].textContent,'1');
assert.equal(x.dom['quiz-match-rate'].textContent,'50%');
assert.match(x.dom['quiz-feedback-message'].textContent,/Different guess/);
x.dom['quiz-retry-button'].click();
assert(x.dom['quiz-check-button'].disabled);
// History should survive a new page load. Not the live session.
const y=environment(x.saved);
assert.equal(y.dom['quiz-total-attempts'].textContent,'2');
assert.equal(y.dom['quiz-total-matches'].textContent,'1');
y.setTraining(['J','Z']);
assert(y.dom['quiz-start-button'].disabled,'static J/Z handshape examples cannot be scored');
y.setMotion(['J','Z']);
assert(!y.dom['quiz-start-button'].disabled,'two trained motion letters should enable practice');
y.sendFrame(null);
y.dom['quiz-start-button'].click();
assert(['J','Z'].includes(y.dom['quiz-target'].textContent));
y.dom['quiz-record-motion-button'].click();
assert(!y.dom['quiz-check-button'].disabled,'a recorded motion guess can be checked');
y.dom['quiz-check-button'].click();
assert.equal(y.dom['quiz-total-attempts'].textContent,'3');
y.setTraining(['A','B']);
y.dom['quiz-clear-history'].click();
assert.equal(y.dom['quiz-total-attempts'].textContent,'0');
assert(y.dom['quiz-clear-history'].disabled);
console.log('Passed: training requirement, stable-frame gate, match/mismatch, no double count, hint, next, retry, persistence, J/Z motion, clear history.');
