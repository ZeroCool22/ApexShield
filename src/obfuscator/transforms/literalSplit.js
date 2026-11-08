import * as t from '@babel/types';

/**
 * Transforma números y booleanos en expresiones matemáticas/lógicas opacas.
 * Ejemplo: 10 -> (0x12 ^ 0x18) o ((0x5 * 0x2))
 * true -> !0
 * false -> !1
 */
export function transformLiterals(ast, traverse, rng, options = {}) {
  if (!options.numbers && !options.booleans) return;

  traverse(ast, {
    NumericLiteral(path) {
      if (!options.numbers) return;
      // Evitar transformar números dentro de casos de switch generados o ya procesados
      if (path.parentPath.isSwitchCase() && path.key === 'test') return;
      if (path.parentPath.isUnaryExpression({ operator: '-' })) return;
      
      if (path.key === 'key' && !path.parent.computed) return;
      const val = path.node.value;
      if (!Number.isInteger(val) || Math.abs(val) > 0xFFFFFF) return;

      const method = rng.nextInt(0, 2);
      let expr;

      if (method === 0) {
        // XOR: val = (val ^ mask) ^ mask
        const mask = rng.nextInt(0x10, 0xFF);
        const a = val ^ mask;
        expr = t.binaryExpression(
          '^',
          t.numericLiteral(a),
          t.numericLiteral(mask)
        );
      } else if (method === 1) {
        // Suma/Resta: val = (val + delta) - delta
        const delta = rng.nextInt(1, 100);
        expr = t.binaryExpression(
          '-',
          t.numericLiteral(val + delta),
          t.numericLiteral(delta)
        );
      } else {
        // Multiplicación/División o bitwise OR con 0
        const mask = rng.nextInt(1, 10);
        expr = t.binaryExpression(
          '|',
          t.numericLiteral(val),
          t.numericLiteral(0)
        );
      }

      path.replaceWith(expr);
      path.skip();
    },

    BooleanLiteral(path) {
      if (!options.booleans) return;
      // true -> !0, false -> !1
      const expr = t.unaryExpression(
        '!',
        t.numericLiteral(path.node.value ? 0 : 1)
      );
      path.replaceWith(expr);
      path.skip();
    }
  });
}
