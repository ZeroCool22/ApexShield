import assert from 'node:assert/strict';
import { captureWorkspace, restoreWorkspace } from '../src/recovery.js';

const nodes = Object.fromEntries(['sourceEditor', 'outputEditor', 'rngCFF', 'valCFF', 'chkCFF', 'chkStrings', 'chkMangle', 'chkDeadCode', 'chkProps', 'chkSelfDef', 'chkAntiDebug', 'chkDisableConsole'].map(id => [id, {type:id.startsWith('chk')?'checkbox':'text',value:'',checked:false}]));
nodes.sourceEditor.value = 'const saludo = "hola 😀";';
nodes.outputEditor.value = 'return 42;';
nodes.rngCFF.value = '55';
nodes.chkCFF.checked = true;
const radio = {value:'confusable',checked:false};
const doc = {
  getElementById: id => nodes[id],
  querySelector: selector => selector === '.preset-btn.active' ? {dataset:{preset:'armored'}} : radio
};
const saved = JSON.parse(JSON.stringify(captureWorkspace(doc)));
nodes.sourceEditor.value = '';
nodes.outputEditor.value = '';
nodes.rngCFF.value = '80';
nodes.chkCFF.checked = false;
let preset;
assert.equal(restoreWorkspace(saved,key=>{preset=key;},doc),true);
assert.equal(nodes.sourceEditor.value,'const saludo = "hola 😀";');
assert.equal(nodes.outputEditor.value,'return 42;');
assert.equal(nodes.rngCFF.value,'55');
assert.equal(nodes.chkCFF.checked,true);
assert.equal(nodes.valCFF.textContent,'55%');
assert.equal(radio.checked,true);
assert.equal(preset,'armored');
assert.equal(restoreWorkspace({version:2},()=>{},doc),false);
assert.equal(restoreWorkspace({version:1,source:42,output:''},()=>{},doc),false);
console.log('Recuperación: fuente, salida, preset, opciones y Unicode restaurados; versiones inválidas rechazadas.');
