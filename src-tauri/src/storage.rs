use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri::Manager;
use unicode_normalization::UnicodeNormalization;

const MAX_ITEMS: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnologyItem {
  pub nome: String,
  pub valor: String,
}

pub fn normalize_text(value: &str) -> String {
  value
    .nfkd()
    .filter(|character| !unicode_normalization::char::is_combining_mark(*character))
    .collect::<String>()
    .to_lowercase()
}

pub fn writable_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  #[cfg(debug_assertions)]
  {
    let _ = app;
    return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("data"));
  }

  #[cfg(not(debug_assertions))]
  {
    if let Ok(exe_dir) = app.path().executable_dir() {
      return Ok(exe_dir.join("data"));
    }

    app
      .path()
      .app_data_dir()
      .map(|path| path.join("data"))
      .map_err(|error| error.to_string())
  }
}

fn file_path(data_dir: &Path, store: &str) -> Result<PathBuf, String> {
  let file_name = match store {
    "cirurgias" => "cirurgias.json",
    "hospitais" => "hospitais.json",
    "pacientes" => "pacientes.json",
    "pagamentos" => "pagamentos.json",
    "observacoes" => "observacoes.json",
    "extras" => "extras.json",
    "tecnologias" => "tecnologias.json",
    _ => return Err(format!("Histórico desconhecido: {store}")),
  };

  Ok(data_dir.join(file_name))
}

pub fn ensure_data_files(app: &AppHandle) -> Result<(), String> {
  let data_dir = writable_data_dir(app)?;
  fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

  for store in [
    "cirurgias",
    "hospitais",
    "pacientes",
    "pagamentos",
    "observacoes",
    "extras",
    "tecnologias",
  ] {
    let path = file_path(&data_dir, store)?;
    if !path.exists() {
      fs::write(&path, "[]\n").map_err(|error| error.to_string())?;
    }
  }

  Ok(())
}

fn read_json_list(path: &Path) -> Result<Vec<Value>, String> {
  let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
  let items = serde_json::from_str::<Value>(&content).map_err(|error| error.to_string())?;

  match items {
    Value::Array(list) => Ok(list),
    _ => Ok(Vec::new()),
  }
}

fn write_json_list(path: &Path, items: &[Value]) -> Result<(), String> {
  let serialized = serde_json::to_string_pretty(items).map_err(|error| error.to_string())?;
  fs::write(path, format!("{serialized}\n")).map_err(|error| error.to_string())
}

pub fn read_string_list(app: &AppHandle, store: &str) -> Result<Vec<String>, String> {
  ensure_data_files(app)?;
  let path = file_path(&writable_data_dir(app)?, store)?;
  let items = read_json_list(&path)?;

  Ok(
    items
      .into_iter()
      .filter_map(|item| item.as_str().map(str::to_string))
      .collect(),
  )
}

pub fn add_string_item(app: &AppHandle, store: &str, value: &str) -> Result<Vec<String>, String> {
  let item = value.trim();
  if item.is_empty() {
    return Err("Valor vazio.".to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let mut items = read_string_list(app, store)?;
  let already_exists = items
    .iter()
    .any(|existing| normalize_text(existing) == normalize_text(item));

  if !already_exists {
    items.insert(0, item.to_string());
    items.truncate(MAX_ITEMS);
    let json_items = items
      .iter()
      .map(|entry| Value::String(entry.clone()))
      .collect::<Vec<_>>();
    write_json_list(&path, &json_items)?;
  }

  read_string_list(app, store)
}

pub fn remove_string_item(app: &AppHandle, store: &str, value: &str) -> Result<Vec<String>, String> {
  let item = value.trim();
  if item.is_empty() {
    return Err("Valor vazio.".to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let target = normalize_text(item);
  let next_items = read_string_list(app, store)?
    .into_iter()
    .filter(|existing| normalize_text(existing) != target)
    .collect::<Vec<_>>();
  let json_items = next_items
    .iter()
    .map(|entry| Value::String(entry.clone()))
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

pub fn replace_string_list(app: &AppHandle, store: &str, items: Vec<String>) -> Result<Vec<String>, String> {
  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let mut normalized_keys = std::collections::HashSet::new();
  let mut next_items = Vec::new();

  for item in items {
    let trimmed = item.trim();
    if trimmed.is_empty() {
      continue;
    }

    let key = normalize_text(trimmed);
    if normalized_keys.contains(&key) {
      continue;
    }

    normalized_keys.insert(key);
    next_items.push(trimmed.to_string());

    if next_items.len() >= MAX_ITEMS {
      break;
    }
  }

  let json_items = next_items
    .iter()
    .map(|entry| Value::String(entry.clone()))
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

fn technology_name(item: &Value) -> String {
  item
    .get("nome")
    .and_then(Value::as_str)
    .or_else(|| item.as_str())
    .unwrap_or_default()
    .trim()
    .to_string()
}

pub fn read_technologies(app: &AppHandle) -> Result<Vec<TechnologyItem>, String> {
  ensure_data_files(app)?;
  let path = file_path(&writable_data_dir(app)?, "tecnologias")?;
  let items = read_json_list(&path)?;

  Ok(
    items
      .into_iter()
      .filter_map(|item| {
        let nome = technology_name(&item);
        if nome.is_empty() {
          return None;
        }

        Some(TechnologyItem {
          nome,
          valor: item
            .get("valor")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_string(),
        })
      })
      .collect(),
  )
}

pub fn add_technology(app: &AppHandle, nome: &str, valor: &str) -> Result<Vec<TechnologyItem>, String> {
  let name = nome.trim();
  if name.is_empty() {
    return Err("Informe uma tecnologia válida.".to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, "tecnologias")?;
  let item = TechnologyItem {
    nome: name.to_string(),
    valor: valor.trim().to_string(),
  };
  let target = normalize_text(&item.nome);
  let mut next_items = read_technologies(app)?
    .into_iter()
    .filter(|existing| normalize_text(&existing.nome) != target)
    .collect::<Vec<_>>();
  next_items.insert(0, item);
  next_items.truncate(MAX_ITEMS);

  let json_items = next_items
    .iter()
    .map(|entry| {
      serde_json::json!({
        "nome": entry.nome,
        "valor": entry.valor,
      })
    })
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

pub fn remove_technology(app: &AppHandle, nome: &str) -> Result<Vec<TechnologyItem>, String> {
  let name = nome.trim();
  if name.is_empty() {
    return Err("Informe uma tecnologia válida.".to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, "tecnologias")?;
  let target = normalize_text(name);
  let next_items = read_technologies(app)?
    .into_iter()
    .filter(|existing| normalize_text(&existing.nome) != target)
    .collect::<Vec<_>>();
  let json_items = next_items
    .iter()
    .map(|entry| {
      serde_json::json!({
        "nome": entry.nome,
        "valor": entry.valor,
      })
    })
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

const ZOOM_MIN: f64 = 0.5;
const ZOOM_MAX: f64 = 2.0;
const ZOOM_DEFAULT: f64 = 1.0;

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(writable_data_dir(app)?.join("settings.json"))
}

fn clamp_zoom(zoom: f64) -> f64 {
  if !zoom.is_finite() {
    return ZOOM_DEFAULT;
  }

  let rounded = (zoom * 10.0).round() / 10.0;
  rounded.clamp(ZOOM_MIN, ZOOM_MAX)
}

pub fn read_zoom_level(app: &AppHandle) -> Result<f64, String> {
  ensure_data_files(app)?;
  let path = settings_path(app)?;

  if !path.exists() {
    return Ok(ZOOM_DEFAULT);
  }

  let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
  let settings = serde_json::from_str::<Value>(&content).unwrap_or(Value::Null);
  let zoom = settings
    .get("zoom")
    .and_then(Value::as_f64)
    .unwrap_or(ZOOM_DEFAULT);

  Ok(clamp_zoom(zoom))
}

pub fn write_zoom_level(app: &AppHandle, zoom: f64) -> Result<f64, String> {
  ensure_data_files(app)?;
  let path = settings_path(app)?;
  let clamped = clamp_zoom(zoom);
  let settings = serde_json::json!({ "zoom": clamped });
  let serialized = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
  fs::write(path, format!("{serialized}\n")).map_err(|error| error.to_string())?;
  Ok(clamped)
}

pub fn apply_zoom(app: &AppHandle, zoom: f64) -> Result<f64, String> {
  let clamped = clamp_zoom(zoom);
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "Janela principal não encontrada.".to_string())?;

  window.set_zoom(clamped).map_err(|error| error.to_string())?;
  Ok(clamped)
}

pub fn set_zoom_level(app: &AppHandle, zoom: f64) -> Result<f64, String> {
  let clamped = write_zoom_level(app, zoom)?;
  apply_zoom(app, clamped)
}

pub fn adjust_zoom_level(app: &AppHandle, delta: f64) -> Result<f64, String> {
  let current = read_zoom_level(app)?;
  set_zoom_level(app, current + delta)
}
