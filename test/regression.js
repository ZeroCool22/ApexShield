import assert from 'node:assert/strict';
import vm from 'node:vm';
import { obfuscate, PRESETS } from '../src/obfuscator/index.js';

const cases = [
  'return { 1: true, 2: false }[1];',
  'class A { 1() { return 9; } }; return new A()[1]();',
  'return "á漢字😀\\ud800\\udfff";',
  'function f(){ return g(); function g(){ return 42; } } return f();',
  'function f(){ let x=1; const g=()=>x; x++; return g(); } return f();',
  'function f(){ var v; try {v=x;} catch(e) {v=e.name;} let x=2; return v; } return f();',
  'function f(){ var s=0; for(var i=0;i<3;i++){s++;if(i===1)continue;s+=2;}return s;}return f();',
  'function f(){var x=7; return eval("x");} return f();',
  'var _0x1234=3; function f(a){var b=a+1; b*=2; return b;} return f(_0x1234);',
  'class A { #x=4; get value(){return this.#x;} } return new A().value;',
  'function f(){var a=1;var b=2;return a+b;}return f();',
  'class A { static x="ok"; field="test"; method(){return this.field+A.x;} } return new A().method();',
  'var x={a:3}; return x?.a ?? 4;',
  'return Object.is(-0,-0);',
  'return {"__proto__":null, "a":3}.a;',
  'function f(){"use strict";return this===undefined;}return f();'
];
const context = () => ({ atob, btoa, setInterval: () => ({ unref() {} }), console: {log(){}} });
let count = 0;
for (const preset of Object.keys(PRESETS)) {
  for (let seed=0;seed<25;seed++) {
    for (const source of cases) {
      const expected = vm.runInNewContext(`(function(){${source}})()`, context(), {timeout:1000});
      const {code} = obfuscate(source, {preset,seed});
      const actual = vm.runInNewContext(`(function(){${code}})()`, context(), {timeout:1000});
      assert.equal(actual,expected,`${preset}/${seed}: ${source}`);
      count++;
    }
  }
}
const source = 'export const greeting="hola"; export function sum(a,b){return a+b;}';
for (const preset of Object.keys(PRESETS)) {
  const {code} = obfuscate(source,{preset,seed:42,antiDebug:false,disableConsole:false});
  const module = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  assert.equal(module.greeting,'hola');
  assert.equal(module.sum(2,3),5);
}
assert.equal(obfuscate('return "á";', {preset:'tactical'}).stats.originalSize,12);
assert.equal(obfuscate('var x=1;', {seed:42}).code, obfuscate('var x=1;', {seed:42}).code);
assert.throws(()=>obfuscate('const x: number = 1;'));
assert.throws(()=>obfuscate('const x=<div/>;'));
console.log(`${count} ejecuciones equivalentes + módulos, Unicode, determinismo y errores: OK`);
// La auto-defensa debe aceptar salida normal y detectar su reformateo.
const { default: generateModule } = await import('@babel/generator');
const { parse } = await import('@babel/parser');
const generate = generateModule.default || generateModule;
const defended = obfuscate('return 42;', {preset:'armored',seed:7}).code;
assert.equal(vm.runInNewContext(`(function(){${defended}})()`,context()),42);
const formatted = generate(parse(defended,{allowReturnOutsideFunction:true}),{compact:false}).code;
assert.throws(()=>vm.runInNewContext(`(function(){${formatted}})()`,context()),/formato/);
assert.equal(vm.runInNewContext(`(function(){${obfuscate('return 42;', {preset:'armored',compact:false}).code}})()`,context()),42);
const withSource = 'var x=1;var o={x:7};with(o){x++;}return o.x;';
assert.equal(vm.runInNewContext(`(function(){${obfuscate(withSource,{seed:8}).code}})()`,context()),8);
console.log('Auto-defensa, salida expandida y alcance dinámico: OK');
