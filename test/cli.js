import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'apex-test-'));
const cli = path.resolve('bin/cli.js');
const run = (...args) => spawnSync(process.execPath,[cli,...args],{cwd:dir,encoding:'utf8',timeout:10000});
try {
  fs.writeFileSync(path.join(dir,'input'), 'return "hola";');
  assert.equal(run('-i','input','-p','tactical').status,0);
  assert.equal(fs.readFileSync(path.join(dir,'input.obf.js'),'utf8'),'return"hola";');
  for (const args of [['--seed','bad'],['-p','bad'],['--what'],['-o','input'],['-p']]) {
    assert.equal(run('-i','input',...args).status,1,args.join(' '));
  }
  assert.equal(fs.readFileSync(path.join(dir,'input'),'utf8'),'return "hola";');
  fs.writeFileSync(path.join(dir,'bad.js'),'var = ;');
  assert.equal(run('-i','bad.js').status,1);
  console.log('CLI: presets, argumentos, errores y preservación del original: OK');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
