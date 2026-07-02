mod commands;
mod paths;
mod pdf;
mod storage;

use tauri::{image::Image, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;

      let data_path = storage::writable_data_dir(app.handle())?;
      storage::ensure_data_files(app.handle())?;
      log::info!("Diretório de dados: {}", data_path.display());

      if let Ok(zoom) = storage::read_zoom_level(app.handle()) {
        let _ = storage::apply_zoom(app.handle(), zoom);
      }

      if let Some(window) = app.get_webview_window("main") {
        let icon_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("icons/32x32.png");
        if let Ok(icon) = Image::from_path(&icon_path) {
          let _ = window.set_icon(icon);
        }
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
      commands::technologies_replace,
      commands::table_load,
      commands::zoom_get,
      commands::zoom_set,
      commands::zoom_adjust,
      commands::export_pdf,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
