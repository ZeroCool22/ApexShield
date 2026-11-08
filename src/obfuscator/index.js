import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import { Random } from './random.js';
import { PRESETS } from './presets.js';
import { transformLiterals } from './transforms/literalSplit.js';
import { transformMemberExpressions } from './transforms/memberToComputed.js';
import { transformDeadCode } from './transforms/deadCodeInjection.js';
import { transformControlFlow } from './transforms/controlFlowFlatten.js';
import { transformMangling } from './transforms/mangling.js';
import { transformStringConceal } from './transforms/stringConceal.js';
import { transformAntiTamper } from './transforms/antiTamper.js';

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;

/**
 * Calcula la entropía de Shannon (bits por byte) de un texto
 */
export function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  const bytes = new TextEncoder().encode(str);
  const frequencies = {};
  for (let i = 0; i < bytes.length; i++) {
    const char = bytes[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = bytes.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

/**
 * Pipeline principal del Ofuscador de Grado Militar
 */
export function obfuscate(sourceCode, userOptions = {}) {
  const startTime = performance.now();
  const rng = new Random(userOptions.seed);

  // Fusionar preset base con opciones personalizadas
  const presetKey = userOptions.preset || 'military';
  const basePreset = PRESETS[presetKey] || PRESETS.military;
  const options = { ...basePreset, ...Object.fromEntries(
    Object.entries(userOptions).filter(([, value]) => value !== undefined)
  ) };
  if (!Object.hasOwn(PRESETS, presetKey)) throw new Error('Preset desconocido: ' + presetKey);

  // Parsear código fuente con Babel
  const ast = parse(sourceCode, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    plugins: ['asyncGenerators', 'dynamicImport']
  });

  traverse(ast, {
    Identifier(path) { rng.reserved.add(path.node.name); },
    WithStatement() {
      options.mangle = false;
      options.controlFlow = false;
    },
    CallExpression(path) {
      if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'eval') {
        options.mangle = false;
        options.controlFlow = false;
      }
    }
  });

  // Pasada 1: Convertir miembros en propiedades calculadas
  transformMemberExpressions(ast, traverse, rng, options);

  // Pasada 2: Desestructuración y aritmética opaca en literales
  transformLiterals(ast, traverse, rng, options);

  // Pasada 3: Inyección de código muerto y predicados opacos
  transformDeadCode(ast, traverse, rng, options);

  // Pasada 4: Aplanamiento de flujo de control (CFF)
  transformControlFlow(ast, traverse, rng, options);

  // Pasada 5: Mangling de identificadores
  transformMangling(ast, traverse, rng, options);

  // Pasada 6: Extracción, cifrado RC4 y rotación de strings
  transformStringConceal(ast, traverse, rng, options);

  // Pasada 7: Escudos de auto-defensa, anti-beautify y anti-debugging
  transformAntiTamper(ast, traverse, rng, options);

  // Generación de código final
  const output = generate(ast, {
    compact: options.compact !== false,
    minified: options.compact !== false,
    comments: false
  });

  const duration = (performance.now() - startTime).toFixed(1);

  return {
    code: output.code,
    stats: {
      durationMs: Number(duration),
      originalSize: new TextEncoder().encode(sourceCode).length,
      obfuscatedSize: new TextEncoder().encode(output.code).length,
      ratio: ((new TextEncoder().encode(output.code).length / (new TextEncoder().encode(sourceCode).length || 1)) * 100).toFixed(0) + '%',
      originalEntropy: calculateEntropy(sourceCode),
      obfuscatedEntropy: calculateEntropy(output.code)
    }
  };
}

export { PRESETS };
