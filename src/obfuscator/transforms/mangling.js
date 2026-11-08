/**
 * Identifier Mangling (Scope-Aware Renaming)
 * Renombra todas las variables locales, funciones y parámetros utilizando el sistema de scopes
 * de Babel con identificadores hexadecimales o confusos únicos.
 */
export function transformMangling(ast, traverse, rng, options = {}) {
  if (!options.mangle) return;

  const mode = options.mangleMode || 'hexadecimal';
  let counter = 0;

  function generateMangledName(scope) {
    let candidate;
    do {
      counter++;
      if (mode === 'confusable') {
        const chars = ['I', 'l', '1', 'O', '0'];
        let name = '_0x';
        for (let i = 0; i < 5; i++) {
          name += chars[rng.nextInt(0, chars.length - 1)];
        }
        candidate = name + counter.toString(16);
      } else {
        candidate = '_0x' + rng.nextInt(0x1000, 0xFFFF).toString(16) + counter.toString(16);
      }
    } while (rng.reserved.has(candidate) || scope.hasBinding(candidate) || scope.hasGlobal(candidate));

    rng.reserved.add(candidate);
    return candidate;
  }

  traverse(ast, {
    Scope(path) {
      // Babel crea un scope interno en ClassDeclaration que duplica el binding del scope padre.
      // Si se renombra aquí, se desincroniza el nombre de la clase con sus instanciaciones externas.
      if (path.isClassDeclaration()) return;

      const bindings = path.scope.bindings;
      for (const name in bindings) {
        // Ignorar variables ya ofuscadas (_0x...) o especiales del lenguaje
        if (name.startsWith('_0x') || name === 'arguments') continue;

        const newName = generateMangledName(path.scope);
        path.scope.rename(name, newName);
      }
    }
  });
}
