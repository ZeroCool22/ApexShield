#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { obfuscate, PRESETS } from '../src/obfuscator/index.js';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║             APEX SHIELD - OFUSCADOR JS MILITAR                 ║
╚════════════════════════════════════════════════════════════════╝

Uso:
  apex-obfuscate [opciones]
  pnpm cli -i <entrada.js> -o <salida.js> [opciones]

Opciones:
  -i, --input <archivo>       Archivo JS fuente a ofuscar (requerido)
  -o, --output <archivo>      Archivo destino (opcional, default: <archivo>.obf.js)
  -p, --preset <nivel>        Preset: tactical | armored | military | paranoid (default: military)
  --seed <numero>             Semilla aleatoria determinística (opcional)
  --no-cff                    Desactivar Control Flow Flattening
  --no-strings                Desactivar Cifrado de Strings
  --no-antitamper             Desactivar trampas Anti-Tamper y Self-Defending
  -h, --help                  Muestra este menú de ayuda
  -v, --version               Versión de la herramienta
`);
}

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  console.log('Apex Shield Obfuscator v1.0.0 (Military Grade)');
  process.exit(0);
}

let inputFile = null;
let outputFile = null;
let preset = 'military';
let seed = undefined;
let controlFlow;
let strings;
let antiTamper;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-i' || arg === '--input') {
    inputFile = args[++i];
  } else if (arg === '-o' || arg === '--output') {
    outputFile = args[++i];
  } else if (arg === '-p' || arg === '--preset') {
    preset = args[++i];
  } else if (arg === '--seed') {
    seed = Number(args[++i]);
    if (!Number.isInteger(seed)) { console.error('Semilla inválida'); process.exit(1); }
  } else if (arg === '--no-cff') {
    controlFlow = false;
  } else if (arg === '--no-strings') {
    strings = false;
  } else if (arg === '--no-antitamper') {
    antiTamper = false;
  } else if (!inputFile && !arg.startsWith('-')) {
    inputFile = arg;
  } else {
    console.error('Opción desconocida: ' + arg);
    process.exit(1);
  }
}

if (!Object.hasOwn(PRESETS, preset)) {
  console.error('Preset desconocido: ' + preset);
  process.exit(1);
}

if (!inputFile) {
  console.error('\x1b[31m[ERROR]\x1b[0m Debes especificar un archivo de entrada con -i <archivo>');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(inputPath)) {
  console.error(`\x1b[31m[ERROR]\x1b[0m Archivo no encontrado: ${inputPath}`);
  process.exit(1);
}

let sourceCode;
try { sourceCode = fs.readFileSync(inputPath, 'utf8'); }
catch (err) { console.error(err.message); process.exit(1); }

if (!outputFile) {
  const ext = path.extname(inputPath);
  const base = ext ? inputPath.slice(0, -ext.length) : inputPath;
  outputFile = `${base}.obf.js`;
}
const outputPath = path.resolve(process.cwd(), outputFile);

console.log(`\x1b[36m[APEX SHIELD]\x1b[0m Iniciando protocolo de ofuscación de grado militar...`);
console.log(`  Archivo origen:  ${inputPath}`);
console.log(`  Preset activo:   ${preset.toUpperCase()}`);

if (outputPath.toLowerCase() === inputPath.toLowerCase()) {
  console.error('El destino debe ser distinto al archivo original');
  process.exit(1);
}

try {
  const result = obfuscate(sourceCode, {
    preset,
    seed,
    controlFlow,
    strings,
    selfDefending: antiTamper,
    antiDebug: antiTamper
  });

  fs.writeFileSync(outputPath, result.code, 'utf8');

  console.log(`\x1b[32m[LISTO]\x1b[0m Archivo ofuscado generado con éxito:`);
  console.log(`  Destino:         ${outputPath}`);
  console.log(`  Tamaño original: ${result.stats.originalSize} B (Entropía: ${result.stats.originalEntropy})`);
  console.log(`  Tamaño blindado: ${result.stats.obfuscatedSize} B (Entropía: ${result.stats.obfuscatedEntropy})`);
  console.log(`  Expansión:       ${result.stats.ratio}`);
  console.log(`  Tiempo de proc:  ${result.stats.durationMs} ms`);

} catch (err) {
  console.error('[ERROR] ' + err.message);
  process.exit(1);
}
