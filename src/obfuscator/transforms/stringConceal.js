import * as t from '@babel/types';
import { parse } from '@babel/parser';

// RC4 encryptor para strings
function rc4Encrypt(key, str) {
  const s = [];
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    [s[i], s[j]] = [s[j], s[i]];
  }
  let i = 0;
  j = 0;
  let res = '';
  for (let k = 0; k < str.length; k++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    const c = str.charCodeAt(k) ^ s[(s[i] + s[j]) % 256];
    res += String.fromCharCode(c & 255, c >>> 8);
  }
  return btoa(res);
}

/**
 * String Concealing & Dynamic Decryption Array
 * Extrae cadenas literales, las cifra con RC4, las almacena en una tabla,
 * inyecta un IIFE rotador en tiempo de ejecución y un des-cifrador con caché.
 */
export function transformStringConceal(ast, traverse, rng, options = {}) {
  if (!options.strings) return;

  const rawStrings = [];
  const stringPaths = [];

  traverse(ast, {
    StringLiteral(path) {
      if (path.parentPath.isDirective()) return;
      if (path.parentPath.isImportAttribute() || path.parentPath.isExportSpecifier() ||
          path.parentPath.isImportSpecifier() || path.parentPath.isTSLiteralType()) return;
      if (path.parentPath.isImportDeclaration()) return;
      if (path.parentPath.isExportNamedDeclaration()) return;
      if (path.parentPath.isExportAllDeclaration()) return;
      if (path.parentPath.isObjectProperty({ key: path.node, computed: false })) return;
      if (path.parentPath.isClassMethod({ key: path.node, computed: false })) return;
      if (path.parentPath.isClassProperty({ key: path.node, computed: false })) return;
      if (path.parentPath.isObjectMethod({ key: path.node, computed: false })) return;
      if (path.node.value.length === 0) return;

      rawStrings.push(path.node.value);
      stringPaths.push(path);
    }
  });

  if (rawStrings.length === 0) return;

  const arrayId = rng.hexId(5);
  const getterId = rng.hexId(5);
  const rc4Key = rng.hexId(8);

  // Cifrar strings
  const encryptedTable = rawStrings.map(str => rc4Encrypt(rc4Key, str));

  // Cantidad de desplazamientos para el rotador dinámico en runtime
  const shiftAmount = rng.nextInt(7, 31);
  const total = rawStrings.length;

  // Reemplazar cada StringLiteral por getterId(shiftedIndex, rc4Key)
  stringPaths.forEach((path, originalIndex) => {
    // Al rotar hacia la izquierda en runtime `shiftAmount` veces,
    // el elemento originalIndex queda en (originalIndex - (shiftAmount % total) + total) % total
    const shiftedIndex = (originalIndex - (shiftAmount % total) + total) % total;

    const callExpr = t.callExpression(t.identifier(getterId), [
      t.numericLiteral(shiftedIndex),
      t.stringLiteral(rc4Key)
    ]);
    path.replaceWith(callExpr);
  });

  // Runtime decrypter & Rotator
  const runtimeCode = `
    var ${arrayId} = ${JSON.stringify(encryptedTable)};
    (function(_0xarr, _0xcount) {
      var _0xrot = function(_0xdelta) {
        while (--_0xdelta) {
          _0xarr['push'](_0xarr['shift']());
        }
      };
      _0xrot(++_0xcount);
    })(${arrayId}, ${shiftAmount});

    var ${getterId} = (function() {
      var _0xcache = {};
      return function(_0xidx, _0xk) {
        var _0xentry = _0xidx + '|' + _0xk;
        if (_0xcache[_0xentry]) return _0xcache[_0xentry];

        var _0xenc = ${arrayId}[_0xidx];
        var _0xraw = atob(_0xenc);
        var _0xs = [], _0xj = 0, _0xres = '';
        for (var _0xi = 0; _0xi < 256; _0xi++) _0xs[_0xi] = _0xi;
        for (var _0xi = 0; _0xi < 256; _0xi++) {
          _0xj = (_0xj + _0xs[_0xi] + _0xk.charCodeAt(_0xi % _0xk.length)) % 256;
          var _0xtmp = _0xs[_0xi]; _0xs[_0xi] = _0xs[_0xj]; _0xs[_0xj] = _0xtmp;
        }
        var _0xi = 0; _0xj = 0;
        for (var _0xkIdx = 0; _0xkIdx < _0xraw.length; _0xkIdx += 2) {
          _0xi = (_0xi + 1) % 256;
          _0xj = (_0xj + _0xs[_0xi]) % 256;
          var _0xtmp = _0xs[_0xi]; _0xs[_0xi] = _0xs[_0xj]; _0xs[_0xj] = _0xtmp;
          _0xres += String.fromCharCode((_0xraw.charCodeAt(_0xkIdx) | (_0xraw.charCodeAt(_0xkIdx + 1) << 8)) ^ _0xs[(_0xs[_0xi] + _0xs[_0xj]) % 256]);
        }
        _0xcache[_0xentry] = _0xres;
        return _0xres;
      };
    })();
  `;

  const runtimeAst = parse(runtimeCode, { sourceType: 'module' });
  ast.program.body.unshift(...runtimeAst.program.body);
}
