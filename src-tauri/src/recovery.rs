use serde::{Deserialize, Serialize};
use std::{
  fs::{self, OpenOptions},
  io::Write,
  path::PathBuf,
  sync::{atomic::{AtomicBool, Ordering}, Mutex},
  time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{menu::{Menu, MenuItem, Submenu}, Manager};

#[derive(Default, Deserialize, Serialize)]
struct Budget {
  attempts: u8,
  software: bool,
}

impl Budget {
  fn claim(&mut self, manual: bool) -> bool {
    if manual { self.attempts = 0; }
    if self.attempts >= 3 { return false; }
    self.attempts += 1;
    self.software = true;
    true
  }
}

pub struct Recovery {
  dir: PathBuf,
  budget: Mutex<Budget>,
  last_beat: Mutex<Instant>,
  healthy_since: Mutex<Option<Instant>>,
  restarting: AtomicBool,
  workspace_lock: Mutex<()>,
}

impl Recovery {
  fn log(&self, message: &str) {
    let path = self.dir.join("recovery.log");
    if fs::metadata(&path).is_ok_and(|meta| meta.len() > 256 * 1024) {
      let _ = fs::rename(&path, self.dir.join("recovery.previous.log"));
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
      let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
      let _ = writeln!(file, "{stamp} {message}");
    }
  }

  fn save_budget(&self, budget: &Budget) -> std::io::Result<()> {
    fs::write(self.dir.join("recovery.json"), serde_json::to_vec(budget)?)
  }
}

fn request(app: &tauri::AppHandle, reason: &str, manual: bool) {
  let state = app.state::<Recovery>();
  if state.restarting.swap(true, Ordering::SeqCst) { return; }
  let mut budget = state.budget.lock().unwrap();
  if !budget.claim(manual) {
    state.log("Automatic recovery paused after three attempts; use Interfaz > Recuperar interfaz.");
    // Keep the gate closed until a manual request or a healthy session resets it.
    return;
  }
  if let Err(err) = state.save_budget(&budget) {
    state.log(&format!("Recovery aborted: cannot persist retry budget: {err}"));
    return;
  }
  state.log(&format!("Recovery attempt {}: {reason}; software rendering enabled", budget.attempts));
  drop(budget);
  app.request_restart();
}

#[tauri::command]
pub fn ui_heartbeat(state: tauri::State<'_, Recovery>) {
  *state.last_beat.lock().unwrap() = Instant::now();
  state.healthy_since.lock().unwrap().get_or_insert_with(Instant::now);
}

#[tauri::command]
pub fn load_workspace(state: tauri::State<'_, Recovery>) -> Result<Option<serde_json::Value>, String> {
  let _guard = state.workspace_lock.lock().unwrap();
  let path = state.dir.join("workspace.json");
  match fs::read(path) {
    Ok(bytes) => serde_json::from_slice(&bytes).map(Some).map_err(|err| err.to_string()),
    Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
    Err(err) => Err(err.to_string()),
  }
}

#[tauri::command]
pub fn save_workspace(workspace: serde_json::Value, state: tauri::State<'_, Recovery>) -> Result<(), String> {
  let _guard = state.workspace_lock.lock().unwrap();
  let data = serde_json::to_vec(&workspace).map_err(|err| err.to_string())?;
  if data.len() > 32 * 1024 * 1024 { return Err("El trabajo supera el límite de guardado (32 MB).".into()); }
  // Retain the last complete draft if writing a new one is interrupted.
  let temporary = state.dir.join("workspace.pending.json");
  fs::write(&temporary, data).map_err(|err| err.to_string())?;
  fs::rename(temporary, state.dir.join("workspace.json")).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn ui_failed(app: tauri::AppHandle) {
  request(&app, "UI initialization failed", false);
}

#[tauri::command]
pub fn recover_interface(app: tauri::AppHandle) {
  app.state::<Recovery>().restarting.store(false, Ordering::SeqCst);
  request(&app, "manual recovery", true);
}

#[cfg(windows)]
fn watch_processes(window: &tauri::WebviewWindow) -> tauri::Result<()> {
  use webview2_com::{ProcessFailedEventHandler, Microsoft::Web::WebView2::Win32::*};
  let app = window.app_handle().clone();
  window.with_webview(move |platform| unsafe {
    let register = || -> Result<(), Box<dyn std::error::Error>> {
      let core = platform.controller().CoreWebView2()?;
      let handler = ProcessFailedEventHandler::create(Box::new(move |_, args| {
        if let Some(args) = args {
          let mut kind = COREWEBVIEW2_PROCESS_FAILED_KIND(0);
          args.ProcessFailedKind(&mut kind)?;
          app.state::<Recovery>().log(&format!("WebView2 ProcessFailed kind={}", kind.0));
          if kind == COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED ||
             kind == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED ||
             kind == COREWEBVIEW2_PROCESS_FAILED_KIND_GPU_PROCESS_EXITED {
            request(&app, &format!("WebView2 process failure {}", kind.0), false);
          }
          // Unresponsive renderers are handled by the heartbeat timeout to avoid
          // restarting during a short debugger pause or a busy system.
        }
        Ok(())
      }));
      let mut token = 0;
      core.add_ProcessFailed(&handler, &mut token)?;
      Ok(())
    };
    if let Err(err) = register() { log::error!("Cannot register WebView2 recovery: {err}"); }
  })
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let dir = app.path().app_local_data_dir()?;
  fs::create_dir_all(&dir)?;
  let budget: Budget = fs::read(dir.join("recovery.json")).ok()
    .and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default();
  let software = budget.software;
  app.manage(Recovery {
    dir, budget: Mutex::new(budget), last_beat: Mutex::new(Instant::now()),
    healthy_since: Mutex::new(None), restarting: AtomicBool::new(false), workspace_lock: Mutex::new(()),
  });
  let recover = MenuItem::with_id(app, "recover-interface", "Recuperar interfaz", true, Some("Ctrl+Shift+R"))?;
  let submenu = Submenu::with_items(app, "Interfaz", true, &[&recover])?;
  app.set_menu(Menu::with_items(app, &[&submenu])?)?;
  app.on_menu_event(|app, event| {
    if event.id().as_ref() == "recover-interface" { recover_interface(app.clone()); }
  });
  let mut builder = tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?;
  #[cfg(windows)]
  if software { builder = builder.additional_browser_args("--disable-gpu"); }
  let window = builder.build()?;
  #[cfg(windows)]
  watch_processes(&window)?;
  app.state::<Recovery>().log(if software { "Startup: software rendering" } else { "Startup: normal rendering" });
  let handle = app.handle().clone();
  std::thread::spawn(move || {
    let mut previous = Instant::now();
    loop {
      std::thread::sleep(Duration::from_secs(5));
      let Some(window) = handle.get_webview_window("main") else { break; };
      let state = handle.state::<Recovery>();
      let now = Instant::now();
      let sleeping = now.duration_since(previous) > Duration::from_secs(15);
      previous = now;
      #[cfg(debug_assertions)]
      let inspector_open = window.is_devtools_open();
      #[cfg(not(debug_assertions))]
      let inspector_open = false;
      // Minimized/hidden windows and a resumed PC can throttle timers legitimately.
      if sleeping || window.is_minimized().unwrap_or(false) || !window.is_visible().unwrap_or(true) || inspector_open {
        *state.last_beat.lock().unwrap() = now;
        *state.healthy_since.lock().unwrap() = None;
        continue;
      }
      if now.duration_since(*state.last_beat.lock().unwrap()) > Duration::from_secs(30) {
        *state.healthy_since.lock().unwrap() = None;
        request(&handle, "UI heartbeat missing for 30 seconds", false);
      } else if state.healthy_since.lock().unwrap().is_some_and(|since| since.elapsed() > Duration::from_secs(120)) {
        let mut budget = state.budget.lock().unwrap();
        if budget.attempts != 0 {
          budget.attempts = 0;
          let _ = state.save_budget(&budget);
          state.restarting.store(false, Ordering::SeqCst);
          state.log("Healthy session: automatic recovery budget reset");
        }
      }
    }
  });
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn recovery_stops_after_three_attempts_and_manual_recovery_resets_it() {
    let mut budget = Budget::default();
    for _ in 0..3 { assert!(budget.claim(false)); }
    assert!(!budget.claim(false));
    assert!(budget.software);
    let stored = serde_json::to_vec(&budget).unwrap();
    let mut restored: Budget = serde_json::from_slice(&stored).unwrap();
    assert!(!restored.claim(false));
    assert!(restored.claim(true));
    assert_eq!(restored.attempts, 1);
  }
}
