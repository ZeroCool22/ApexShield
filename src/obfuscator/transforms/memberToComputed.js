import * as t from '@babel/types';

/**
 * Convierte accesos a propiedades punto `obj.prop` en calculados `obj['prop']`.
 * De esta forma, la pasada de Strings posterior encripta los nombres de métodos y propiedades.
 */
export function transformMemberExpressions(ast, traverse, rng, options = {}) {
  if (!options.memberExpressions) return;

  traverse(ast, {
    MemberExpression(path) {
      if (path.node.computed) return;

      const prop = path.node.property;
      if (t.isIdentifier(prop)) {
        // Ignorar propiedades privadas (#foo) o super
        if (path.node.property.type === 'PrivateName') return;

        path.node.computed = true;
        path.node.property = t.stringLiteral(prop.name);
      }
    },

    ClassMethod(path) {
      // Nunca transformar el constructor a computado (prohibido por la especificación de JS)
      if (path.node.kind === 'constructor') return;
      if (path.node.computed) return;
      if (path.node.key.type === 'PrivateName') return;

      if (t.isIdentifier(path.node.key)) {
        path.node.computed = true;
        path.node.key = t.stringLiteral(path.node.key.name);
      } else if (t.isStringLiteral(path.node.key)) {
        path.node.computed = true;
      }
    },

    ClassProperty(path) {
      if (path.node.computed) return;
      if (path.node.key.type === 'PrivateName') return;

      if (t.isIdentifier(path.node.key)) {
        path.node.computed = true;
        path.node.key = t.stringLiteral(path.node.key.name);
      } else if (t.isStringLiteral(path.node.key)) {
        path.node.computed = true;
      }
    },

    ObjectMethod(path) {
      if (path.node.computed) return;
      if (t.isIdentifier(path.node.key)) {
        path.node.computed = true;
        path.node.key = t.stringLiteral(path.node.key.name);
      } else if (t.isStringLiteral(path.node.key)) {
        path.node.computed = true;
      }
    }
  });
}
