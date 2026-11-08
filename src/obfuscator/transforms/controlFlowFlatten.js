import * as t from '@babel/types';

/**
 * Control Flow Flattening (CFF)
 * Convierte el flujo de ejecución secuencial en una máquina de estados
 * con un switch dentro de un bucle while infinito manejado por un vector de despacho aleatorio.
 */
export function transformControlFlow(ast, traverse, rng, options = {}) {
  if (!options.controlFlow) return;

  const threshold = options.controlFlowThreshold ?? 0.75;

  function flattenBlock(blockPath) {
    const statements = blockPath.node.body;
    if (!statements || statements.length < 3) return;
    if (rng.nextFloat() >= threshold) return;
    let unsafe = false;
    blockPath.traverse({
      VariableDeclaration(path) { if (path.node.kind !== 'var') unsafe = true; },
      FunctionDeclaration() { unsafe = true; },
      ClassDeclaration() { unsafe = true; },
      BreakStatement() { unsafe = true; },
      ContinueStatement() { unsafe = true; }
    });
    if (unsafe) return;

    // Verificar si hay return tempranos o imports/exports
    const hoistedDeclarations = [];
    const caseStatements = [];

    // Desarmar declaraciones de variables para elevarlas y evitar TDZ en switch cases
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // No aplanar si ya es un switch de CFF
      if (t.isWhileStatement(stmt) && t.isBooleanLiteral(stmt.test, { value: true })) {
        return;
      }

      if (t.isVariableDeclaration(stmt)) {
        const assignments = [];
        for (const decl of stmt.declarations) {
          if (t.isIdentifier(decl.id)) {
            hoistedDeclarations.push(t.variableDeclarator(decl.id));
            if (decl.init) {
              assignments.push(t.expressionStatement(
                t.assignmentExpression('=', decl.id, decl.init)
              ));
            }
          } else {
            // Desestructuración compleja: no tocamos este bloque para no romper semántica
            return;
          }
        }
        if (assignments.length > 0) {
          caseStatements.push(...assignments);
        }
      } else {
        caseStatements.push(stmt);
      }
    }

    if (caseStatements.length < 2) return;

    // Generar índices y barajar orden
    const indices = caseStatements.map((_, idx) => idx);
    const shuffledIndices = rng.shuffle(indices);
    const dispatchOrder = indices.join('|');

    const orderVar = rng.hexId(4);
    const idxVar = rng.hexId(4);

    // Crear cases para cada sentencia
    const cases = shuffledIndices.map(stepIndex => {
      const stmt = caseStatements[stepIndex];
      const caseBody = [stmt];

      // Si la sentencia no es un return ni throw, añadir continue para saltar al siguiente estado
      if (!t.isReturnStatement(stmt) && !t.isThrowStatement(stmt)) {
        caseBody.push(t.continueStatement());
      }

      return t.switchCase(t.stringLiteral(stepIndex.toString()), caseBody);
    });

    // while (true) { switch(_0xorder[_0xidx++]) { ... } break; }
    const switchStmt = t.switchStatement(
      t.memberExpression(
        t.identifier(orderVar),
        t.updateExpression('++', t.identifier(idxVar)),
        true
      ),
      cases
    );

    const whileLoop = t.whileStatement(t.booleanLiteral(true), t.blockStatement([
      switchStmt,
      t.breakStatement()
    ]));

    // Inicialización del vector de despacho:
    // var _0xorder = '0|1|2|...'.split('|'), _0xidx = 0;
    const initOrderDecl = t.variableDeclaration('var', [
      t.variableDeclarator(
        t.identifier(orderVar),
        t.callExpression(
          t.memberExpression(t.stringLiteral(dispatchOrder), t.identifier('split')),
          [t.stringLiteral('|')]
        )
      ),
      t.variableDeclarator(t.identifier(idxVar), t.numericLiteral(0))
    ]);

    const newBody = [];
    if (hoistedDeclarations.length > 0) {
      newBody.push(t.variableDeclaration('var', hoistedDeclarations));
    }
    newBody.push(initOrderDecl);
    newBody.push(whileLoop);

    blockPath.node.body = newBody;
  }

  traverse(ast, {
    FunctionDeclaration(path) {
      flattenBlock(path.get('body'));
    },
    FunctionExpression(path) {
      flattenBlock(path.get('body'));
    },
    ArrowFunctionExpression(path) {
      if (path.node.body.type === 'BlockStatement') {
        flattenBlock(path.get('body'));
      }
    }
  });
}
