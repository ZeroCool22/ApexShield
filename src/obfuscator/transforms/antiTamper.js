import { parse } from '@babel/parser';

/**
 * Anti-Tamper, Self-Defending & Anti-Debugging
 * Inyecta defensas de grado militar:
 * 1. Anti-Beautify / Anti-Formateo: detecta si el código fue embellecido con Prettier o DevTools
 * 2. Anti-Debugging: bucle continuo de trampas debugger
 * 3. Protección de Consola: neutraliza console.log/warn/error para evitar inspección dinámica
 */
export function transformAntiTamper(ast, traverse, rng, options = {}) {
  const injectedCode = [];

  if (options.selfDefending) {
    const fnId = rng.hexId(5);
    const selfDefCode = `
      (function() {
        function ${fnId}() { return '${rng.hexId(8)}'; }
        if (${options.compact !== false} && /[\\r\\n]/.test(Function.prototype.toString.call(${fnId}))) {
          throw new Error('ApexShield: formato del código alterado');
        }
      })();
    `;
    injectedCode.push(selfDefCode);
  }

  if (options.antiDebug) {
    const debugCode = `
      (function() {
        var _0xdeb = function() {
          var _0xinit = true;
          return function(_0xcontext, _0xhandler) {
            var _0xdbg = _0xinit ? function() {
              if (_0xhandler) {
                var _0xout = _0xhandler.apply(_0xcontext, arguments);
                _0xhandler = null;
                return _0xout;
              }
            } : function() {};
            _0xinit = false;
            return _0xdbg;
          };
        }();

        var _0xtimer = setInterval(function() {
          (function() {
            return false;
          }['constructor']('debugger')['call']('action'));
        }, 4000);
        if (_0xtimer && typeof _0xtimer.unref === 'function') _0xtimer.unref();
      })();
    `;
    injectedCode.push(debugCode);
  }

  if (options.disableConsole) {
    const consoleCode = `
      (function() {
        var _0xmethods = ['log', 'warn', 'info', 'error', 'exception', 'table', 'trace'];
        for (var _0xi = 0; _0xi < _0xmethods.length; _0xi++) {
          try {
            console[_0xmethods[_0xi]] = function() {};
          } catch(_0xe) {}
        }
      })();
    `;
    injectedCode.push(consoleCode);
  }

  if (injectedCode.length > 0) {
    for (const snippet of injectedCode.reverse()) {
      const parsed = parse(snippet, { sourceType: 'script' });
      ast.program.body.unshift(...parsed.program.body);
    }
  }
}
