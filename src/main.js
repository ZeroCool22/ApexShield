import { restoreWorkspace } from './recovery.js';
import { PRESETS } from './obfuscator/presets.js';
import { obfuscateAsync } from './obfuscateAsync.js';

async function openGithub() {
  try {
    if (window.__TAURI__) {
      await window.__TAURI__.core.invoke('open_github');
    } else {
      window.open('https://github.com/ZeroCool22', '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    alert('No se pudo abrir GitHub: ' + err);
  }
}

document.getElementById('btnGithub').addEventListener('click', openGithub);

// Muestras tácticas precargadas
const SAMPLES = {
  auth: `// Módulo de Autenticación de Misión Crítica
function verifySessionToken(token, secretKey) {
  var header = "Bearer " + secretKey;
  var isValid = false;
  var checksum = 0xAA55;
  
  if (token.length > 16) {
    for (var i = 0; i < token.length; i++) {
      checksum = (checksum ^ token.charCodeAt(i)) + (i * 3);
    }
    isValid = (checksum % 7) === 0;
  }
  
  var payload = {
    user: "operative_zero",
    role: "commander",
    level: 5,
    authorized: isValid,
    signature: checksum.toString(16)
  };
  
  return payload;
}

return verifySessionToken("X98f-4421-Omega-Secure-Key-99", "SECRET_KEY_ALPHA");`,

  game: `// Motor de Licencia y Anti-Cheat
function validateLicense(key, hardwareHash) {
  var salt = "ApexShield2026";
  var combined = key + "@" + hardwareHash + ":" + salt;
  var digest = 0;
  
  for (var i = 0; i < combined.length; i++) {
    digest = ((digest << 5) - digest) + combined.charCodeAt(i);
    digest |= 0;
  }
  
  var isTampered = false;
  if (typeof window !== "undefined" && window.__devtools_open__) {
    isTampered = true;
  }
  
  return {
    valid: digest > 0 && !isTampered,
    fingerprint: Math.abs(digest).toString(36).toUpperCase()
  };
}

return validateLicense("MIL-KEY-7788-9900", "HWID-8839-XF");`,

  crypto: `// Algoritmo de Encriptación de Bloques Ligero
function encryptPacket(plainText, key) {
  var encrypted = [];
  var sbox = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5];
  
  for (var i = 0; i < plainText.length; i++) {
    var charCode = plainText.charCodeAt(i);
    var keyChar = key.charCodeAt(i % key.length);
    var sub = sbox[(charCode ^ keyChar) % sbox.length];
    encrypted.push(sub.toString(16).padStart(2, '0'));
  }
  
  return encrypted.join(":");
}

return encryptPacket("TOP_SECRET_COORDINATES:45.123,-73.456", "CIPHER_KEY");`
};

// Elementos DOM
const sourceEditor = document.getElementById('sourceEditor');
const outputEditor = document.getElementById('outputEditor');
const sourceStats = document.getElementById('sourceStats');
const btnObfuscate = document.getElementById('btnObfuscate');
const sampleSelect = document.getElementById('sampleSelect');
const fileInput = document.getElementById('fileInput');
const btnClearSource = document.getElementById('btnClearSource');
const btnClearOutput = document.getElementById('btnClearOutput');
const btnToggleWrap = document.getElementById('btnToggleWrap');
const btnCopy = document.getElementById('btnCopy');
const btnDownload = document.getElementById('btnDownload');
const btnRunSandbox = document.getElementById('btnRunSandbox');
const btnCloseSandbox = document.getElementById('btnCloseSandbox');
const sandboxDrawer = document.getElementById('sandboxDrawer');
const sandboxConsole = document.getElementById('sandboxConsole');

// Presets y Switches
const presetButtons = document.querySelectorAll('.preset-btn');
const chkCFF = document.getElementById('chkCFF');
const rngCFF = document.getElementById('rngCFF');
const valCFF = document.getElementById('valCFF');
const chkStrings = document.getElementById('chkStrings');
const chkMangle = document.getElementById('chkMangle');
const chkDeadCode = document.getElementById('chkDeadCode');
const chkProps = document.getElementById('chkProps');
const chkSelfDef = document.getElementById('chkSelfDef');
const chkAntiDebug = document.getElementById('chkAntiDebug');
const chkDisableConsole = document.getElementById('chkDisableConsole');

// Telemetría
const statTime = document.getElementById('statTime');
const statRatio = document.getElementById('statRatio');
const statEntropy = document.getElementById('statEntropy');
const statWrap = document.getElementById('statWrap');
const statStatus = document.getElementById('statStatus');

let currentPresetKey = 'military';

// Inicializar con muestra por defecto
sourceEditor.value = SAMPLES.auth;
updateSourceStats();

// Sincronizar UI con preset
function applyPresetToUI(presetKey) {
  currentPresetKey = presetKey;
  const p = PRESETS[presetKey];
  if (!p) return;

  presetButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === presetKey);
  });

  chkCFF.checked = p.controlFlow;
  rngCFF.value = Math.round((p.controlFlowThreshold ?? 0.8) * 100);
  valCFF.textContent = rngCFF.value + '%';
  chkStrings.checked = p.strings;
  chkMangle.checked = p.mangle;
  
  const radio = document.querySelector(`input[name="mangleMode"][value="${p.mangleMode}"]`);
  if (radio) radio.checked = true;

  chkDeadCode.checked = p.deadCode;
  chkProps.checked = p.memberExpressions;
  chkSelfDef.checked = p.selfDefending;
  chkAntiDebug.checked = p.antiDebug;
  chkDisableConsole.checked = p.disableConsole;
}

presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    applyPresetToUI(btn.dataset.preset);
  });
});

rngCFF.addEventListener('input', (e) => {
  valCFF.textContent = e.target.value + '%';
});

function updateSourceStats() {
  const text = sourceEditor.value;
  const lines = text ? text.split('\n').length : 0;
  const chars = text.length;
  sourceStats.textContent = `${lines} Líneas | ${chars} Caracteres`;
  document.dispatchEvent(new Event('change'));
}

sourceEditor.addEventListener('input', updateSourceStats);

sampleSelect.addEventListener('change', (e) => {
  if (SAMPLES[e.target.value]) {
    sourceEditor.value = SAMPLES[e.target.value];
    updateSourceStats();
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      sourceEditor.value = ev.target.result;
      updateSourceStats();
    };
    reader.readAsText(file);
  }
});

btnClearSource.addEventListener('click', () => {
  sourceEditor.value = '';
  updateSourceStats();
});

// Acción de Ofuscar
function runObfuscation() {
  const src = sourceEditor.value.trim();
  if (!src) {
    alert('Ingresa código JavaScript antes de ofuscar.');
    return;
  }

  statStatus.textContent = 'MUTANDO AST...';
  statStatus.className = 'val badge-ready';
  statStatus.style.borderColor = 'var(--accent-amber)';
  statStatus.style.color = 'var(--accent-amber)';

  btnObfuscate.disabled = true;
  setTimeout(async () => {
    try {
      const mangleMode = document.querySelector('input[name="mangleMode"]:checked')?.value || 'hexadecimal';
      const cffThreshold = parseInt(rngCFF.value, 10) / 100;

      const userOpts = {
        preset: currentPresetKey,
        controlFlow: chkCFF.checked,
        controlFlowThreshold: cffThreshold,
        strings: chkStrings.checked,
        mangle: chkMangle.checked,
        mangleMode: mangleMode,
        deadCode: chkDeadCode.checked,
        memberExpressions: chkProps.checked,
        selfDefending: chkSelfDef.checked,
        antiDebug: chkAntiDebug.checked,
        disableConsole: chkDisableConsole.checked,
        compact: true
      };

      const result = await obfuscateAsync(src, userOpts);

      outputEditor.value = result.code;
      document.dispatchEvent(new Event('change'));
      statTime.textContent = result.stats.durationMs + ' ms';
      statRatio.textContent = result.stats.ratio;
      statEntropy.textContent = `${result.stats.originalEntropy} → ${result.stats.obfuscatedEntropy} b/B`;

      statStatus.textContent = 'BLINDADO';
      statStatus.style.borderColor = 'var(--accent-green)';
      statStatus.style.color = 'var(--accent-green)';
    } catch (err) {
      console.error(err);

      const locMatch = err.message.match(/\((\d+):(\d+)\)/);
      const line = err.loc?.line || (locMatch ? locMatch[1] : null);
      const col = err.loc?.column || (locMatch ? locMatch[2] : null);

      let diagnosis = 'El parser de JavaScript detectó una anomalía en el código fuente.';
      if (err.message.includes('Unexpected token')) {
        diagnosis = 'Estructura sintáctica incompleta o no balanceada.\nEs muy probable que te haya faltado cerrar una llave "}", corchete "]" o paréntesis ")".';
      } else if (err.message.includes('Unterminated')) {
        diagnosis = 'Existe una cadena de texto, plantilla literal (backtick) o comentario sin cerrar.';
      }

      const locationStr = line ? `Línea ${line}, Columna ${col}` : 'Ubicación no precisada';

      statStatus.textContent = line ? `ERROR SINTAXIS (L${line})` : 'ERROR EN AST';
      statStatus.style.borderColor = 'var(--accent-crimson)';
      statStatus.style.color = 'var(--accent-crimson)';

      outputEditor.value = [
        `// ====================================================================`,
        `// [ERROR DE ANÁLISIS SINTÁCTICO DE CÓDIGO FUENTE]`,
        `// ====================================================================`,
        `// Mensaje: ${err.message.split('\n')[0]}`,
        `// Ubicación: ${locationStr}`,
        `//`,
        `// DIAGNÓSTICO TÁCTICO:`,
        `// ${diagnosis.replace(/\n/g, '\n// ')}`,
        `// ====================================================================`
      ].join('\n');
    } finally {
      btnObfuscate.disabled = false;
    }
  }, 30);
}

btnObfuscate.addEventListener('click', runObfuscation);

// Limpiar salida
btnClearOutput.addEventListener('click', () => {
  outputEditor.value = '';
  document.dispatchEvent(new Event('change'));
  statTime.textContent = '0 ms';
  statRatio.textContent = '0%';
  statEntropy.textContent = '0.00 → 0.00 b/B';
  statStatus.textContent = 'LISTO';
  statStatus.className = 'val badge-ready';
  statStatus.style.borderColor = '';
  statStatus.style.color = '';
});

// Word Wrap Toggle para Salida Blindada
function setOutputWordWrap(enable) {
  outputEditor.classList.toggle('word-wrap', enable);
  btnToggleWrap.classList.toggle('active', enable);
  btnToggleWrap.setAttribute('aria-pressed', enable ? 'true' : 'false');
  btnToggleWrap.title = enable ? 'Desactivar Ajuste de Línea / Word Wrap (Alt+Z)' : 'Activar Ajuste de Línea / Word Wrap (Alt+Z)';
  if (statWrap) {
    statWrap.textContent = enable ? 'ON' : 'OFF';
    statWrap.className = enable ? 'val text-cyan' : 'val text-dim';
  }
  try {
    localStorage.setItem('apex_output_word_wrap', enable ? '1' : '0');
  } catch (_) {}
}

const savedWrap = (() => {
  try {
    return localStorage.getItem('apex_output_word_wrap');
  } catch (_) {
    return null;
  }
})();

setOutputWordWrap(savedWrap === '1');

btnToggleWrap.addEventListener('click', () => {
  const isWrapped = outputEditor.classList.contains('word-wrap');
  setOutputWordWrap(!isWrapped);
});

// Atajo táctico estilo VS Code (Alt + Z)
window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    const isWrapped = outputEditor.classList.contains('word-wrap');
    setOutputWordWrap(!isWrapped);
  }
});

// Copiar
btnCopy.addEventListener('click', async () => {
  if (!outputEditor.value) return;
  try {
    await navigator.clipboard.writeText(outputEditor.value);
  } catch (err) {
    alert('No se pudo copiar: ' + err.message);
    return;
  }
  const orig = btnCopy.textContent;
  btnCopy.textContent = '¡COPIADO!';
  btnCopy.style.color = 'var(--accent-green)';
  setTimeout(() => {
    btnCopy.textContent = orig;
    btnCopy.style.color = '';
  }, 1500);
});

// Descargar
btnDownload.addEventListener('click', () => {
  if (!outputEditor.value) return;
  const blob = new Blob([outputEditor.value], { type: 'application/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'armored-payload.obf.js';
  a.click();
  URL.revokeObjectURL(url);
});

// Sandbox Runner
let sandboxWorker;
let sandboxTimeout;
function stopSandbox() {
  clearTimeout(sandboxTimeout);
  sandboxWorker?.terminate();
  sandboxWorker = null;
}

btnRunSandbox.addEventListener('click', () => {
  const code = outputEditor.value || sourceEditor.value;
  if (!code) return;
  stopSandbox();
  sandboxDrawer.classList.remove('closed');
  sandboxConsole.textContent = '';
  const appendLog = (msg, type = 'log') => {
    const div = document.createElement('div');
    div.className = `console-line ${type}`;
    div.textContent = msg;
    sandboxConsole.appendChild(div);
    sandboxConsole.scrollTop = sandboxConsole.scrollHeight;
  };
  appendLog('[SANDBOX] Ejecución separada, sin DOM (máximo 5 segundos).', 'system');
  sandboxWorker = new Worker(new URL('./sandbox.worker.js', import.meta.url), { type: 'module' });
  sandboxWorker.onmessage = ({ data }) => {
    appendLog(data.message, data.type);
    if (data.done) stopSandbox();
  };
  sandboxWorker.onerror = (err) => {
    appendLog('[ERROR] ' + err.message, 'error');
    stopSandbox();
  };
  sandboxTimeout = setTimeout(() => {
    appendLog('[ERROR] Tiempo máximo de ejecución excedido.', 'error');
    stopSandbox();
  }, 5000);
  sandboxWorker.postMessage(code);
});

btnCloseSandbox.addEventListener('click', () => {
  stopSandbox();
  sandboxDrawer.classList.add('closed');
});

// Canvas Cyber Matrix Grid Effect
const canvas = document.getElementById('cyberGridCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const dots = [];
for (let i = 0; i < 45; i++) {
  dots.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 2 + 1
  });
}

function animateGrid() {
  if (!ctx || ctx.isContextLost?.()) return;
  ctx.clearRect(0, 0, width, height);

  // Cuadrícula táctica sutil
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.025)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Puntos flotantes conectados
  ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < 0 || d.x > width) d.vx *= -1;
    if (d.y < 0 || d.y > height) d.vy *= -1;

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();

    for (let j = i + 1; j < dots.length; j++) {
      const d2 = dots[j];
      const dist = Math.hypot(d.x - d2.x, d.y - d2.y);
      if (dist < 120) {
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - dist / 120)})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(animateGrid);
}
canvas.addEventListener('contextrestored', animateGrid);
animateGrid();

// Aplicar preset militar por defecto
applyPresetToUI('military');

if (restoreWorkspace(window.__APEX_SAVED_WORKSPACE__, applyPresetToUI)) {
  updateSourceStats();
  statStatus.textContent = 'SESIÓN RESTAURADA';
}
delete window.__APEX_SAVED_WORKSPACE__;
