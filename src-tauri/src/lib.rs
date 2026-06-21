mod commands;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      storage::ensure_data_files(app.handle())?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::history_list,
      commands::history_add,
      commands::history_remove,
      commands::history_replace,
      commands::technologies_list,
      commands::technologies_add,
      commands::technologies_remove,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
