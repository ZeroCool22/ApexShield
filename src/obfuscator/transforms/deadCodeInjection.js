import * as t from '@babel/types';

/**
 * Dead Code & Opaque Predicate Injection
 * Inyecta predicados opacos matemáticos (siempre verdaderos o falsos)
 * con ramas falsas llenas de señuelos (decoy crypto, falsos tokens) para desconcertar analistas.
 */
export function transformDeadCode(ast, traverse, rng, options = {}) {
  if (!options.deadCode) return;

  const threshold = options.deadCodeThreshold ?? 0.4;

  traverse(ast, {
    BlockStatement(path) {
      if (path.parentPath.isFunction() && rng.nextFloat() < threshold) {
        const statements = path.node.body;
        if (statements.length === 0) return;

        // Crear un predicado opaco: ((mask ^ mask) === 0) -> siempre true
        const mask = rng.nextInt(0x10, 0xFF);
        const opaqueCondition = t.binaryExpression(
          '===',
          t.binaryExpression('^', t.numericLiteral(mask), t.numericLiteral(mask)),
          t.numericLiteral(0)
        );

        // Generar bloque señuelo (dead code)
        const decoyVar = rng.hexId(4);
        const decoyBody = [
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier(decoyVar),
              t.binaryExpression('*', t.numericLiteral(rng.nextInt(10, 99)), t.numericLiteral(rng.nextInt(2, 8)))
            )
          ]),
          t.expressionStatement(
            t.assignmentExpression(
              '+=',
              t.identifier(decoyVar),
              t.numericLiteral(rng.nextInt(1, 10))
            )
          )
        ];

        // Buscar sentencias de expresión seguras para envolver.
        // NUNCA envolver declaraciones (let, const, var, function, class) ni sentencias de control (return, throw, break, continue)
        // porque rompen el alcance léxico (block scope) en tiempo de ejecución.
        const candidateIndices = [];
        for (let i = 0; i < statements.length; i++) {
          const s = statements[i];
          if (t.isExpressionStatement(s)) {
            candidateIndices.push(i);
          }
        }
        if (candidateIndices.length === 0) return;

        const targetIndex = candidateIndices[rng.nextInt(0, candidateIndices.length - 1)];
        const targetStmt = statements[targetIndex];

        const ifStmt = t.ifStatement(
          opaqueCondition,
          t.blockStatement([targetStmt]),
          t.blockStatement(decoyBody)
        );

        statements[targetIndex] = ifStmt;
      }
    }
  });
}
