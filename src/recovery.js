const SESSION_KEY = 'apex_workspace_v1';
const CONTROL_IDS = ['chkCFF', 'rngCFF', 'chkStrings', 'chkMangle', 'chkDeadCode', 'chkProps', 'chkSelfDef', 'chkAntiDebug', 'chkDisableConsole'];

export function captureWorkspace(doc = document) {
  return {
    version: 1,
    source: doc.getElementById('sourceEditor').value,
    output: doc.getElementById('outputEditor').value,
    preset: doc.querySelector('.preset-btn.active')?.dataset.preset || 'military',
    mangleMode: doc.querySelector('input[name="mangleMode"]:checked')?.value || 'hexadecimal',
    controls: Object.fromEntries(CONTROL_IDS.map(id => {
      const input = doc.getElementById(id);
      return [id, input.type === 'checkbox' ? input.checked : input.value];
    }))
  };
}

export function restoreWorkspace(saved, applyPreset, doc = document) {
  if (saved?.version !== 1 || typeof saved.source !== 'string' || typeof saved.output !== 'string') return false;
  if (['tactical', 'armored', 'military', 'paranoid'].includes(saved.preset)) applyPreset(saved.preset);
  doc.getElementById('sourceEditor').value = saved.source;
  doc.getElementById('outputEditor').value = saved.output;
  for (const id of CONTROL_IDS) {
    const input = doc.getElementById(id);
    const value = saved.controls?.[id];
    if (input.type === 'checkbox' && typeof value === 'boolean') input.checked = value;
    else if (id === 'rngCFF' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100) input.value = value;
  }
  if (['hexadecimal', 'confusable'].includes(saved.mangleMode)) {
    const radio = doc.querySelector(`input[name="mangleMode"][value="${saved.mangleMode}"]`);
    if (radio) radio.checked = true;
  }
  doc.getElementById('valCFF').textContent = doc.getElementById('rngCFF').value + '%';
  return true;
}

export async function startRecovery() {
  const invoke = window.__TAURI__?.core.invoke;
  const reportSaveError = (err) => {
    console.error('No se pudo guardar la sesión:', err);
    const status = document.getElementById('statStatus');
    if (status) status.textContent = 'GUARDADO PENDIENTE';
  };
  try {
    window.__APEX_SAVED_WORKSPACE__ = invoke ? await invoke('load_workspace') : JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (err) { reportSaveError(err); }

  let ready = false;
  let lastSaved = '';
  let saving = false;
  let pending = false;
  const save = async () => {
    if (!ready) return;
    if (saving) { pending = true; return; }
    saving = true;
    try {
      do {
        pending = false;
        const workspace = captureWorkspace();
        const serialized = JSON.stringify(workspace);
        if (serialized !== lastSaved) {
          if (invoke) await invoke('save_workspace', { workspace });
          else localStorage.setItem(SESSION_KEY, serialized);
          lastSaved = serialized;
        }
      } while (pending);
    } catch (err) { reportSaveError(err); }
    finally { saving = false; }
  };
  let saveTimer;
  document.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 200);
  });
  document.addEventListener('change', save);
  window.addEventListener('blur', save);
  const heartbeat = async () => {
    if (!ready) return;
    await save();
    if (invoke) {
      try { await invoke('ui_heartbeat'); }
      catch (err) { console.error('No se pudo confirmar el estado de la interfaz:', err); }
    }
  };
  setInterval(heartbeat, 3000);
  return {
    ready() { ready = true; heartbeat(); },
    failed() {
      // The native watchdog remains active even when this script cannot load.
      document.body.style.backgroundColor = '#06090e';
      if (invoke) invoke('ui_failed').catch(console.error);
    }
  };
}
