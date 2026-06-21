use tauri::AppHandle;

use crate::storage::{
  add_string_item, add_technology, adjust_zoom_level, read_string_list, read_technologies,
  read_zoom_level, remove_string_item, remove_technology, replace_string_list, set_zoom_level,
  TechnologyItem,
};

#[tauri::command]
pub fn history_list(app: AppHandle, store: String) -> Result<Vec<String>, String> {
  read_string_list(&app, &store)
}

#[tauri::command]
pub fn history_add(app: AppHandle, store: String, value: String) -> Result<Vec<String>, String> {
  add_string_item(&app, &store, &value)
}

#[tauri::command]
pub fn history_remove(app: AppHandle, store: String, value: String) -> Result<Vec<String>, String> {
  remove_string_item(&app, &store, &value)
}

#[tauri::command]
pub fn history_replace(app: AppHandle, store: String, items: Vec<String>) -> Result<Vec<String>, String> {
  replace_string_list(&app, &store, items)
}

#[tauri::command]
pub fn technologies_list(app: AppHandle) -> Result<Vec<TechnologyItem>, String> {
  read_technologies(&app)
}

#[tauri::command]
pub fn technologies_add(app: AppHandle, nome: String, valor: String) -> Result<Vec<TechnologyItem>, String> {
  add_technology(&app, &nome, &valor)
}

#[tauri::command]
pub fn technologies_remove(app: AppHandle, nome: String) -> Result<Vec<TechnologyItem>, String> {
  remove_technology(&app, &nome)
}

#[tauri::command]
pub fn zoom_get(app: AppHandle) -> Result<f64, String> {
  read_zoom_level(&app)
}

#[tauri::command]
pub fn zoom_set(app: AppHandle, scale: f64) -> Result<f64, String> {
  set_zoom_level(&app, scale)
}

#[tauri::command]
pub fn zoom_adjust(app: AppHandle, delta: f64) -> Result<f64, String> {
  adjust_zoom_level(&app, delta)
}
