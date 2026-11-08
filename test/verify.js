import { obfuscate } from '../src/obfuscator/index.js';

console.log('--- INICIANDO PROTOCOLO DE TESTEO DE OFUSCADOR MILITAR ---');

const testCases = [
  {
    name: 'Aritmética básica y variables',
    code: `
      function calc(a, b) {
        var x = a * 2;
        var y = b + 10;
        return x + y;
      }
      return calc(5, 10);
    `,
    expected: 30
  },
  {
    name: 'Strings, arrays y bucles',
    code: `
      function processNames() {
        var list = ["Alpha", "Bravo", "Charlie"];
        var res = "";
        for (var i = 0; i < list.length; i++) {
          res += list[i] + "-";
        }
        return res;
      }
      return processNames();
    `,
    expected: "Alpha-Bravo-Charlie-"
  },
  {
    name: 'Closures y control flow complejo',
    code: `
      function makeCounter(init) {
        var val = init;
        return function(increment) {
          val = val + increment;
          var status = "OK";
          if (val > 100) {
            status = "MAX";
          }
          return val + ":" + status;
        };
      }
      var counter = makeCounter(40);
      counter(20);
      return counter(50);
    `,
    expected: "110:MAX"
  },
  {
    name: 'Clases ES6, métodos y scoping de variables (Caso Pong)',
    code: `
      class Entity {
        constructor(x, y, w, h, color) {
          this.x = x; this.y = y; this.w = w; this.h = h;
          this.color = color;
        }
        area() {
          return this.w * this.h;
        }
      }
      const player = new Entity(20, 185, 10, 80, '#22d3ee');
      let target = player.y + 10;
      target += 5;
      return player.area() + ":" + target + ":" + player.color;
    `,
    expected: "800:200:#22d3ee"
  }
];

let passed = 0;

for (const tc of testCases) {
  console.log(`\nProbando caso: [${tc.name}]`);
  try {
    const wrappedOriginal = `(function() { ${tc.code} })()`;
    const origResult = eval(wrappedOriginal);

    // Probamos con preset militar (sin antiDebug para que no pause node)
    const result = obfuscate(tc.code, {
      preset: 'military',
      antiDebug: false // Desactivado solo para tests en Node
    });

    console.log(`  Entropía: ${result.stats.originalEntropy} -> ${result.stats.obfuscatedEntropy} bits/byte`);
    console.log(`  Tamaño: ${result.stats.originalSize}B -> ${result.stats.obfuscatedSize}B (${result.stats.ratio})`);
    console.log(`  Tiempo: ${result.stats.durationMs}ms`);

    const wrappedObfuscated = `(function() { ${result.code} })()`;
    const obfResult = eval(wrappedObfuscated);

    if (obfResult === tc.expected && obfResult === origResult) {
      console.log(`  [PASS] Resultado exacto: ${JSON.stringify(obfResult)}`);
      passed++;
    } else {
      console.error(`  [FAIL] Esperado ${tc.expected}, pero obtuvo ${obfResult}`);
    }
  } catch (err) {
    console.error(`  [ERROR] Falló ejecución:`, err);
  }
}

console.log(`\n========================================`);
console.log(`RESULTADO FINAL: ${passed}/${testCases.length} TESTS SUPERADOS`);
console.log(`========================================`);

if (passed !== testCases.length) {
  process.exit(1);
}
