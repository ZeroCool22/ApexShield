mod recovery;

#[tauri::command]
fn open_github() -> Result<(), String> {
  std::process::Command::new("explorer.exe")
    .arg("https://github.com/ZeroCool22")
    .spawn()
    .map(|_| ())
    .map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_github, recovery::ui_heartbeat, recovery::ui_failed, recovery::load_workspace, recovery::save_workspace, recovery::recover_interface])
    .setup(|app| {
      recovery::setup(app)?;
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
